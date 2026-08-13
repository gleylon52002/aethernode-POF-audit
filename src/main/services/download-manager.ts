import {
  app,
  dialog,
  session,
  shell,
  type DownloadItem as ElectronDownloadItem,
  type Session,
} from 'electron';
import { basename, extname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { GUEST_PARTITIONS } from '@main/network/guard';
import { getMainWindow } from '@main/windows';
import { settingsRepo } from '@main/store';
import { IPC } from '@shared/constants';
import { logger } from '@main/utils/logger';

export type DownloadStatus =
  | 'queued'
  | 'progressing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadRecord {
  id: string;
  filename: string;
  url: string;
  path: string;
  bytesTotal: number;
  bytesReceived: number;
  status: DownloadStatus;
  startedAt: number;
  endedAt?: number;
  mimeType?: string;
  canResume?: boolean;
  sha256?: string;
}

/** Potansiyel zararlı / otomatik çalıştırılabilir uzantılar */
const DANGEROUS_EXT = new Set([
  '.exe',
  '.msi',
  '.bat',
  '.cmd',
  '.com',
  '.scr',
  '.ps1',
  '.vbs',
  '.vbe',
  '.js',
  '.jse',
  '.wsf',
  '.wsh',
  '.jar',
  '.dll',
  '.sys',
  '.apk',
  '.dmg',
  '.pkg',
  '.app',
  '.hta',
  '.reg',
  '.lnk',
]);

const active = new Map<string, ElectronDownloadItem>();
let records: DownloadRecord[] = [];
const attached = new WeakSet<Session>();

function historyFile(): string {
  const dir = join(app.getPath('userData'), 'downloads');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'history.json');
}

function loadHistory(): void {
  try {
    const raw = readFileSync(historyFile(), 'utf8');
    const parsed = JSON.parse(raw) as DownloadRecord[];
    if (Array.isArray(parsed)) {
      records = parsed
        .filter((r) => r.status === 'completed' || r.status === 'failed')
        .slice(0, 200);
    }
  } catch {
    records = [];
  }
}

function saveHistory(): void {
  try {
    const done = records
      .filter((r) => r.status === 'completed' || r.status === 'failed' || r.status === 'cancelled')
      .slice(0, 200);
    writeFileSync(historyFile(), JSON.stringify(done, null, 2), 'utf8');
  } catch (err) {
    logger.warn('İndirme geçmişi yazılamadı', { err: String(err) });
  }
}

function broadcast(): void {
  getMainWindow()?.webContents.send(IPC.downloads.updated, listDownloads());
}

function upsert(rec: DownloadRecord): void {
  const idx = records.findIndex((r) => r.id === rec.id);
  if (idx >= 0) records[idx] = rec;
  else records = [rec, ...records];
  broadcast();
}

function uniqueSavePath(filename: string): string {
  const dir = app.getPath('downloads');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  // eslint-disable-next-line no-control-regex
  const safe = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_') || 'download';
  let candidate = join(dir, safe);
  if (!existsSync(candidate)) return candidate;
  const ext = extname(safe);
  const base = basename(safe, ext);
  let i = 1;
  while (existsSync(candidate)) {
    candidate = join(dir, `${base} (${i})${ext}`);
    i += 1;
  }
  return candidate;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isDangerous(filename: string): boolean {
  return DANGEROUS_EXT.has(extname(filename).toLowerCase());
}

function confirmDownload(filename: string, url: string, dangerous: boolean): boolean {
  const win = getMainWindow();
  const detail = dangerous
    ? `Bu dosya türü (${extname(filename) || 'bilinmeyen'}) zararlı olabilir.\n\n${url.slice(0, 200)}`
    : url.slice(0, 200);
  const opts: Electron.MessageBoxSyncOptions = {
    type: dangerous ? 'warning' : 'question',
    buttons: ['İndir', 'İptal'],
    defaultId: dangerous ? 1 : 0,
    cancelId: 1,
    title: 'İndirme onayı',
    message: `"${filename}" indirilsin mi?`,
    detail,
    noLink: true,
  };
  const result = win ? dialog.showMessageBoxSync(win, opts) : dialog.showMessageBoxSync(opts);
  return result === 0;
}

function sha256File(path: string): string | undefined {
  try {
    const hash = createHash('sha256');
    hash.update(readFileSync(path));
    return hash.digest('hex');
  } catch {
    return undefined;
  }
}

function wireItem(item: ElectronDownloadItem, id: string, savePath: string): void {
  const rec: DownloadRecord = {
    id,
    filename: basename(savePath),
    url: item.getURL(),
    path: savePath,
    bytesTotal: item.getTotalBytes(),
    bytesReceived: 0,
    status: 'progressing',
    startedAt: Date.now(),
    mimeType: item.getMimeType() || undefined,
    canResume: item.canResume(),
  };
  active.set(id, item);
  upsert(rec);
  logger.info('İndirme başladı', { id, file: rec.filename });

  item.on('updated', (_e, state) => {
    const cur = records.find((r) => r.id === id);
    if (!cur) return;
    upsert({
      ...cur,
      bytesReceived: item.getReceivedBytes(),
      bytesTotal: item.getTotalBytes() || cur.bytesTotal,
      canResume: item.canResume(),
      status:
        state === 'interrupted' ? 'failed' : item.isPaused() ? 'paused' : 'progressing',
    });
  });

  item.once('done', (_e, state) => {
    active.delete(id);
    const cur = records.find((r) => r.id === id);
    if (!cur) return;
    const received = item.getReceivedBytes();
    const save = item.getSavePath() || savePath;
    // googlevideo “tamamlandı” ama 31 bayt çöp — başarısız say
    const tinyJunk =
      state === 'completed' &&
      received > 0 &&
      received < 8_192 &&
      /googlevideo\.com|videoplayback/i.test(cur.url);
    let status: DownloadStatus =
      state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'failed';
    if (tinyJunk) {
      status = 'failed';
      try {
        if (existsSync(save)) unlinkSync(save);
      } catch {
        /* yoksay */
      }
      logger.warn('YouTube çöp indirme elendi', { id, bytes: received });
    }
    let sha256: string | undefined;
    if (status === 'completed' && settingsRepo.get().security.verifySha256) {
      sha256 = sha256File(save);
    }
    upsert({
      ...cur,
      bytesReceived: received,
      bytesTotal: item.getTotalBytes() || cur.bytesTotal,
      status,
      endedAt: Date.now(),
      path: save,
      sha256,
    });
    saveHistory();
    logger.info('İndirme bitti', { id, status, sha256: sha256?.slice(0, 12) });
  });
}

function attachSession(ses: Session): void {
  if (attached.has(ses)) return;
  attached.add(ses);

  ses.on('will-download', (_event, item) => {
    const filename = item.getFilename() || 'download';
    const url = item.getURL();
    const security = settingsRepo.get().security;
    const dangerous = isDangerous(filename);

    if (security.blockMaliciousDownloads && dangerous) {
      const allow = confirmDownload(filename, url, true);
      if (!allow) {
        item.cancel();
        logger.info('Tehlikeli indirme engellendi', { filename, url: url.slice(0, 120) });
        return;
      }
    } else {
      // Güvenli uzantılar için de onay (drive-by önleme)
      if (!confirmDownload(filename, url, false)) {
        item.cancel();
        return;
      }
    }

    const id = newId();
    const savePath = uniqueSavePath(filename);
    item.setSavePath(savePath);
    wireItem(item, id, savePath);
  });
}

export function enableDownloadManager(): void {
  loadHistory();
  const sessions = [
    session.defaultSession,
    ...GUEST_PARTITIONS.map((p) => session.fromPartition(p)),
  ];
  for (const ses of sessions) attachSession(ses);

  app.on('web-contents-created', (_e, contents) => {
    if (contents.getType() === 'webview') {
      attachSession(contents.session);
    }
  });

  logger.info('Download manager etkin', { history: records.length });
}

export function attachDownloadPartition(partition: string): void {
  attachSession(session.fromPartition(partition));
}

export function listDownloads(): DownloadRecord[] {
  return [...records];
}

export function pauseDownload(id: string): boolean {
  const item = active.get(id);
  if (!item || item.isPaused()) return false;
  item.pause();
  return true;
}

export function resumeDownload(id: string): boolean {
  const item = active.get(id);
  if (!item) return false;
  if (item.canResume() || item.isPaused()) {
    item.resume();
    return true;
  }
  return false;
}

export function cancelDownload(id: string): boolean {
  const item = active.get(id);
  if (item) {
    item.cancel();
    return true;
  }
  const cur = records.find((r) => r.id === id);
  if (cur && (cur.status === 'progressing' || cur.status === 'paused' || cur.status === 'queued')) {
    upsert({ ...cur, status: 'cancelled', endedAt: Date.now() });
    saveHistory();
    return true;
  }
  return false;
}

export function openDownload(id: string): boolean {
  const cur = records.find((r) => r.id === id);
  if (!cur?.path || !existsSync(cur.path)) return false;
  void shell.openPath(cur.path);
  return true;
}

export function openDownloadFolder(id?: string): boolean {
  if (id) {
    const cur = records.find((r) => r.id === id);
    if (cur?.path && existsSync(cur.path)) {
      // Windows Gezgini için path normalizasyonu
      const normalizedPath = process.platform === 'win32' 
        ? require('path').win32.normalize(cur.path)
        : cur.path;
      shell.showItemInFolder(normalizedPath);
      return true;
    }
  }
  void shell.openPath(app.getPath('downloads'));
  return true;
}

export function removeDownloadRecord(id: string): boolean {
  if (active.has(id)) {
    active.get(id)?.cancel();
    active.delete(id);
  }
  records = records.filter((r) => r.id !== id);
  saveHistory();
  broadcast();
  return true;
}

export function clearCompletedDownloads(): number {
  const before = records.length;
  records = records.filter(
    (r) => r.status === 'progressing' || r.status === 'paused' || r.status === 'queued',
  );
  saveHistory();
  broadcast();
  return before - records.length;
}
