import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow } from 'electron';
import { IPC } from '@shared/constants/ipc-channels';
import { is } from '@main/utils/env';
import { logger } from '@main/utils/logger';

let started = false;
let updateReady = false;

/**
 * Generic sunucu: https://aethernode.com/updates/latest.yml + NSIS exe
 * İndirme arka planda; yalnızca indirildiyse çıkışta kurulum.
 */
export function startAutoUpdater(): void {
  if (started || is.dev || !app.isPackaged) return;
  started = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => logger.info('Güncelleme kontrol ediliyor'));
  autoUpdater.on('update-available', (info) => {
    logger.info('Güncelleme var', { version: info.version });
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed()) w.webContents.send(IPC.updater.available, { version: info.version });
    }
  });
  autoUpdater.on('update-not-available', () => logger.info('Güncelleme yok'));
  autoUpdater.on('error', (err) => logger.warn('Güncelleme hatası', { err: String(err) }));
  autoUpdater.on('update-downloaded', (info) => {
    updateReady = true;
    logger.info('Güncelleme indirildi — çıkışta kurulacak', { version: info.version });
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

export function installUpdateOnQuit(): void {
  if (!started || is.dev || !updateReady) return;
  try {
    autoUpdater.quitAndInstall(false, true);
  } catch (e) {
    logger.warn('quitAndInstall başarısız', { err: String(e) });
  }
}
