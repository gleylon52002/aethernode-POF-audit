import { app, clipboard, session } from 'electron';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { GUEST_PARTITIONS, getAllPartitions } from '@main/network/guard';
import { historyRepo, settingsRepo } from '@main/store';
import { logger } from '@main/utils/logger';

let quitting = false;

async function clearSessions(opts: {
  cookies: boolean;
  cache: boolean;
  storage: boolean;
}): Promise<void> {
  // Sabit + dinamik tüm partition'ları temizle
  // (persist:tab:*, persist:ct:*, persist:pwa-* dahil)
  const allPartitions = getAllPartitions();
  const sessions = [
    session.defaultSession,
    ...allPartitions.map((p) => session.fromPartition(p)),
  ];
  await Promise.all(
    sessions.map(async (ses) => {
      if (opts.cookies || opts.storage) {
        const storages: string[] = [];
        if (opts.cookies) storages.push('cookies');
        if (opts.storage) {
          storages.push(
            'localstorage',
            'indexdb',
            'cachestorage',
            'serviceworkers',
            'shadercache',
            'websql',
            'filesystem',
          );
        }
        await ses.clearStorageData({ storages: storages as Electron.ClearStorageDataOptions['storages'] });
      }
      if (opts.cache) {
        await ses.clearCache();
        await ses.clearHostResolverCache();
        await ses.clearAuthCache();
      }
    }),
  );
}

/**
 * Ayarlardaki cleanup.onExit + cookies.autoDeleteOnExit uygular.
 */
export async function runExitCleanup(): Promise<void> {
  const settings = settingsRepo.get();
  const onExit = settings.cleanup.onExit;
  const autoCookies = settings.privacy.cookies.autoDeleteOnExit;

  const wantCookies = onExit.cookies || autoCookies;
  const wantCache = onExit.cache;
  const wantStorage = onExit.storage || autoCookies;
  const wantHistory = onExit.history;
  const wantClipboard = onExit.clipboard;
  const wantTemp = onExit.tempFiles;
  // session: sekme durumu renderer localStorage'da — main yalnızca loglar

  if (wantCookies || wantCache || wantStorage) {
    await clearSessions({
      cookies: wantCookies,
      cache: wantCache,
      storage: wantStorage,
    });
  }

  if (wantHistory) {
    historyRepo.clear();
  }

  if (wantClipboard) {
    try {
      clipboard.clear();
    } catch {
      /* yoksay */
    }
  }

  if (wantTemp) {
    const tmp = join(app.getPath('temp'), 'aethernode');
    if (existsSync(tmp)) {
      try {
        rmSync(tmp, { recursive: true, force: true });
      } catch {
        /* yoksay */
      }
    }
  }

  logger.info('Çıkış temizliği tamamlandı', {
    cookies: wantCookies,
    cache: wantCache,
    storage: wantStorage,
    history: wantHistory,
    clipboard: wantClipboard,
    temp: wantTemp,
    sessionFlag: onExit.session,
  });
}

export function registerExitCleanup(): void {
  app.on('before-quit', (e) => {
    if (quitting) return;
    e.preventDefault();
    quitting = true;
    void runExitCleanup()
      .catch((err) => logger.warn('Çıkış temizliği hatası', { err: String(err) }))
      .finally(() => {
        app.exit(0);
      });
  });
}
