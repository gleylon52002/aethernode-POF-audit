import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, ipcMain } from 'electron';
import { IPC } from '@shared/constants/ipc-channels';
import { is } from '@main/utils/env';
import { logger } from '@main/utils/logger';
import { ok, err } from '@shared/types/result';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  version?: string;
  progressPercent?: number;
  bytesPerSecond?: number;
  transferredBytes?: number;
  totalBytes?: number;
  error?: string;
}

let started = false;
let currentState: UpdateState = { status: 'idle' };

function broadcast(channel: string, payload?: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send(channel, payload);
    }
  }
}

export function getUpdateState(): UpdateState {
  return { ...currentState };
}

export function registerUpdaterIpcHandlers(): void {
  ipcMain.handle(IPC.updater.status, () => ok(getUpdateState()));

  ipcMain.handle(IPC.updater.check, async () => {
    if (is.dev || !app.isPackaged) {
      return err('Geliştirme modunda güncelleme kontrolü yapılmaz.');
    }
    try {
      currentState = { ...currentState, status: 'checking', error: undefined };
      broadcast(IPC.updater.checking);
      await autoUpdater.checkForUpdates();
      return ok(getUpdateState());
    } catch (e) {
      const msg = String(e);
      currentState = { ...currentState, status: 'error', error: msg };
      broadcast(IPC.updater.error, { error: msg });
      return err(msg);
    }
  });

  ipcMain.handle(IPC.updater.install, () => {
    if (currentState.status !== 'downloaded') {
      return err('Güncelleme henüz indirilmedi.');
    }
    try {
      autoUpdater.quitAndInstall(false, true);
      return ok(true);
    } catch (e) {
      return err(String(e));
    }
  });
}

export function startAutoUpdater(): void {
  if (started || is.dev || !app.isPackaged) return;
  started = true;

  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://aethernodevpn.com/updates/',
  });

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    logger.info('Güncelleme kontrol ediliyor');
    currentState = { ...currentState, status: 'checking', error: undefined };
    broadcast(IPC.updater.checking);
  });

  autoUpdater.on('update-available', (info) => {
    logger.info('Güncelleme bulundu', { version: info.version });
    currentState = {
      status: 'available',
      version: info.version,
      progressPercent: 0,
    };
    broadcast(IPC.updater.available, { version: info.version });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    currentState = {
      ...currentState,
      status: 'downloading',
      progressPercent: Math.round(progressObj.percent || 0),
      bytesPerSecond: progressObj.bytesPerSecond,
      transferredBytes: progressObj.transferred,
      totalBytes: progressObj.total,
    };
    broadcast(IPC.updater.progress, {
      percent: currentState.progressPercent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info('Güncelleme yok');
    currentState = { status: 'not-available', version: info?.version };
    broadcast(IPC.updater.notAvailable, { version: info?.version });
  });

  autoUpdater.on('error', (err) => {
    const errorMsg = String(err);
    logger.warn('Güncelleme hatası', { err: errorMsg });
    currentState = { ...currentState, status: 'error', error: errorMsg };
    broadcast(IPC.updater.error, { error: errorMsg });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('Güncelleme indirildi — kuruluma hazır', { version: info.version });
    currentState = {
      status: 'downloaded',
      version: info.version,
      progressPercent: 100,
    };
    broadcast(IPC.updater.downloaded, { version: info.version });
  });

  void autoUpdater.checkForUpdates().catch((e) =>
    logger.warn('Güncelleme kontrolü başarısız', { err: String(e) }),
  );

  setInterval(
    () => {
      void autoUpdater.checkForUpdates().catch(() => undefined);
    },
    6 * 60 * 60 * 1000,
  );
}
