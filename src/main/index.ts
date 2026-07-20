import { app, BrowserWindow, shell } from 'electron';
import { is } from '@main/utils/env';
import { ensureMainWindow } from '@main/windows';
import { registerAllHandlers } from '@main/ipc';
import { registerSecurityDefaults } from '@main/security';
import { applySecureDns, networkGuard } from '@main/network';
import { attachShortcuts } from '@main/input/shortcuts';
import { attachWebviewContextMenu } from '@main/input/context-menu';
import { settingsRepo } from '@main/store';
import { logger } from '@main/utils/logger';

// AetherNode Secure Browser — Main process giriş noktası.
// Güvenlik: tüm telemetri kapalı, renderda nodeIntegration kapalı,
// contextIsolation açık, yalnızca allowlist IPC kanalları tanımlı.

// Tek instance: ikinci açılışta mevcut pencereyi öne getir.
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

app.whenReady().then(() => {
  const settings = settingsRepo.get();
  registerSecurityDefaults();
  registerAllHandlers();
  networkGuard.updateConfig(settings);
  networkGuard.enable();
  applySecureDns(settings);
  ensureMainWindow();
  logger.info('AetherNode Secure Browser başlatıldı', {
    version: app.getVersion(),
    platform: process.platform,
    dev: is.dev,
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) ensureMainWindow();
});

// Dış bağlantılar her zaman sistem tarayıcısında açılır; app içi sürülmez.
// Dev modunda renderer console çıktısı main stdout'a köprülenir (üretimde kapalı).
app.on('web-contents-created', (_e, contents) => {
  // Klavye kısayolları hem kabukta hem sekme webview'larında yakalanır.
  attachShortcuts(contents);

  if (contents.getType() === 'webview') {
    // Sekme içeriği: WebRTC IP sızıntısı politikası ayardan uygulanır.
    const webrtc = settingsRepo.get().privacy.webrtc;
    if (webrtc.enabled) {
      const policy =
        webrtc.policy === 'block_all'
          ? 'disable_non_proxied_udp'
          : webrtc.policy === 'force_proxy'
            ? 'default_public_interface_only'
            : 'disable_non_proxied_udp';
      contents.setWebRTCIPHandlingPolicy(policy);
    }

    // Sekme içinden açılan pencereler (target=_blank) aynı sekme grubunda
    // yeni sekme olarak açılır — kabuk 'guest/openUrl' etkinliğini dinler.
    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) {
        BrowserWindow.getAllWindows()[0]?.webContents.send('aethernode/guest/openUrl', url);
      }
      return { action: 'deny' };
    });
    attachWebviewContextMenu(contents);
    return;
  }

  // Kabuk penceresi: harici linkler sistem tarayıcısında açılır.
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  if (is.dev) {
    contents.on('console-message', (_ev, _level, message) => {
      logger.info(`[renderer] ${message}`);
    });
  }
});