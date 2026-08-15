import { app, BrowserWindow, dialog } from 'electron';
import { ensureMainWindow } from '@main/windows';
import { registerAllHandlers } from '@main/ipc';
import { registerSecurityDefaults, enableCookieGuard } from '@main/security';
import { applySecureDns, networkGuard, enableFilterEngine, registerDynamicPartition, unregisterDynamicPartition } from '@main/network';
import { enableDownloadManager } from '@main/services/download-manager';
import { registerExitCleanup } from '@main/services/exit-cleanup';
import { getDeviceEncryptionKey } from '@main/services/device-key';
import { startAutoUpdater, installUpdateOnQuit } from '@main/services/auto-updater';
import { parsePage } from '@main/services/nav-metrics';
import { attachShortcuts } from '@main/input/shortcuts';
import { attachWebviewContextMenu } from '@main/input/context-menu';
import { openSafeExternal } from '@main/utils/open-external';
import { settingsRepo } from '@main/store';
import { setVaultAutoLockMinutes } from '@main/services/vault';
import { logger } from '@main/utils/logger';
import {
  appendWebRtcCommandLineSwitches,
  applyWebRtcPolicy,
} from '@main/security/webrtc-guard';
import { performanceController } from '@main/services/performance-controller';

// ── Global hata yakalama — process'i çökertme, logla ─────────────

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION (yakalandı, process devam ediyor)', {
    message: err.message,
    stack: err.stack,
  });
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : '';
  logger.error('UNHANDLED REJECTION (yakalandı, process devam ediyor)', { message: msg, stack });
});

// Prod: uzak hata ayıklama kapalı
if (app.isPackaged) {
  app.commandLine.appendSwitch('disable-features', 'ElectronSerialChooser');
}

// DRM / Widevine desteği (Netflix, Spotify vb. için)
app.commandLine.appendSwitch('enable-widevine');
app.commandLine.appendSwitch('enable-features', 'Widevine');

appendWebRtcCommandLineSwitches();

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows();
  if (wins.length > 0) {
    wins[0]?.restore();
    wins[0]?.focus();
  }
});

/** wcId → aktif sayfa dwell */
const dwellByWc = new Map<
  number,
  { page: string; host: string; path: string; subdomain: string; started: number }
>();

function flushDwell(wcId: number): void {
  const d = dwellByWc.get(wcId);
  if (!d) return;
  dwellByWc.delete(wcId);
  const ms = Date.now() - d.started;
  if (ms < 1_500) return; // gürültü
}

app.whenReady().then(async () => {
  try {
    const { components } = require('electron');
    await components.whenReady();
    const status = await components.status();
    logger.info('Electron Components yüklendi', { status });
  } catch (err) {
    logger.warn('Components (Widevine vb.) yüklenemedi', { err });
  }
  
  getDeviceEncryptionKey();
  const settings = settingsRepo.get();
  registerSecurityDefaults();
  enableCookieGuard();
  registerAllHandlers();
  enableFilterEngine();
  enableDownloadManager();
  registerExitCleanup();
  networkGuard.updateConfig(settings);
  networkGuard.enable();
  applySecureDns(settings);
  performanceController.applyFromSettings(settings);
  setVaultAutoLockMinutes(settings.security.vaultAutoLockMinutes ?? 5);

  // ── Pencereyi ÖNCE oluştur ─────
  ensureMainWindow();
  startAutoUpdater();

  logger.info('AetherNode Secure Browser başlatıldı', {
    version: app.getVersion(),
    platform: process.platform,
    packaged: app.isPackaged,
  });
});

app.on('before-quit', () => {
  for (const id of [...dwellByWc.keys()]) flushDwell(id);
  performanceController.cleanup();
  installUpdateOnQuit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) ensureMainWindow();
});

app.on('web-contents-created', (_e, contents) => {
  attachShortcuts(contents);
  applyWebRtcPolicy(contents);
  performanceController.onWebContentsCreated(contents);

  // Dinamik partition takibi: persist:tab:*, persist:ct:*, persist:pwa-*
  // partition'ları kaydet — panik temizliği ve çıkış temizliğinde kullanılır.
  try {
    const ses = contents.session;
    const storagePath = ses.storagePath;
    if (storagePath) {
      // Electron storagePath'ten partition adını çıkar
      const match = storagePath.match(/Partitions[\\/](.+)$/);
      if (match) {
        const partName = 'persist:' + match[1].replace(/_/g, ':').replace(/^persist:/, '');
        registerDynamicPartition(partName);
        contents.on('destroyed', () => unregisterDynamicPartition(partName));
      }
    }
  } catch { /* sessiz — partition takibi başarısız olursa sabit liste kullanılır */ }

  // Prod: DevTools açılmasın
  if (app.isPackaged) {
    contents.on('devtools-opened', () => {
      contents.closeDevTools();
    });
  }

  contents.on('destroyed', () => flushDwell(contents.id));

  contents.on('did-start-navigation', (_ev, url, _isInPlace, isMainFrame) => {
    if (!isMainFrame) return;
    flushDwell(contents.id);
    const prev = contents.getURL();
    (contents as unknown as { __anRef?: string }).__anRef = prev || undefined;
    void url;
  });

  contents.on('did-finish-load', () => {
    const url = contents.getURL();
    if (!/^https?:/i.test(url)) return;
    const page = parsePage(url);
    const loadStarted = Date.now();

    dwellByWc.set(contents.id, {
      page: page.page,
      host: page.host,
      path: page.path,
      subdomain: page.subdomain,
      started: loadStarted,
    });
  });

  contents.on('did-fail-load', (_ev, code, _desc, _url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
  });

  contents.on('enter-html-full-screen', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.setFullScreen(true);
  });

  contents.on('leave-html-full-screen', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.setFullScreen(false);
  });

  contents.on('will-prevent-unload', (event) => {
    const win = BrowserWindow.getAllWindows()[0];
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['Siteden Ayrıl', 'İptal'],
      title: 'Siteden Ayrılmak İstiyor Musunuz?',
      message: 'Siteden ayrılmak istiyor musunuz?',
      detail: 'Yaptığınız değişiklikler kaydedilmemiş olabilir.',
      defaultId: 0,
      cancelId: 1,
    });
    const leave = choice === 0;
    if (leave) {
      event.preventDefault();
    }
  });

  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url, disposition }) => {
      if (!/^https?:\/\//i.test(url)) return { action: 'deny' };
      const win = BrowserWindow.getAllWindows()[0];
      if (disposition === 'background-tab') {
        win?.webContents.send('aethernode/guest/openBackground', url);
      } else {
        win?.webContents.send('aethernode/guest/openUrl', url);
      }
      return { action: 'deny' };
    });
    attachWebviewContextMenu(contents);

    return;
  }

  contents.setWindowOpenHandler(({ url }) => {
    openSafeExternal(url);
    return { action: 'deny' };
  });
});
