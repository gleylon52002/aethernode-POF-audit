import { app, ipcMain } from 'electron';
import { join } from 'node:path';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { settingsRepo } from '@main/store';

// Guest webview köprüsü.
//
// - guest.config: guest preload'ın senkron (sendSync) aldığı yapılandırma.
//   Preload sayfa scriptlerinden önce koştuğu için async invoke kullanamaz.
// - guest.preloadPath: renderer'ın <webview preload="file://..."> özniteliğine
//   koyacağı derlenmiş guest.js dosya yolu.
export function registerGuestHandlers(): void {
  ipcMain.on(IPC.guest.config, (event) => {
    const s = settingsRepo.get();
    const fp = s.privacy.fingerprint;
    event.returnValue = {
      fingerprint: {
        enabled: fp.enabled,
        spoofCanvas: fp.spoofCanvas,
        spoofWebGL: fp.spoofWebGL,
        spoofAudio: fp.spoofAudio,
        spoofFonts: fp.spoofFonts,
        spoofNavigator: fp.spoofNavigator,
        spoofHardware: fp.spoofHardware,
        spoofScreen: fp.spoofScreen,
      },
      cookieBannerAutoReject: s.privacy.cookieBanner.autoReject,
      scriptBlocker: !!s.privacy.scriptBlocker?.enabled,
      bankMode: s.privacy.bankMode?.enabled !== false,
    };
  });

  defineHandler({
    channel: IPC.guest.preloadPath,
    schema: noPayload,
    handle: () => {
      // dist-electron/main -> ../preload/guest.js (index preload ile aynı dizin)
      const path = join(app.getAppPath(), 'dist-electron', 'preload', 'guest.js');
      return `file://${path.replace(/\\/g, '/')}`;
    },
  });
}
