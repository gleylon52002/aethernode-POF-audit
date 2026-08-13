import { app } from 'electron';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { is } from '@main/utils/env';

// Uygulama yaşam döngüsü kanalları. Aşama 1'in minimum, çalışır handler'ları.
export function registerAppHandlers(): void {
  defineHandler({
    channel: IPC.app.version,
    schema: noPayload,
    handle: () => app.getVersion(),
  });

  defineHandler({
    channel: IPC.app.platform,
    schema: noPayload,
    handle: () => process.platform,
  });

  defineHandler({
    channel: IPC.app.quit,
    schema: noPayload,
    handle: () => {
      app.quit();
      return true;
    },
  });

  defineHandler({
    channel: IPC.app.setAsDefault,
    schema: noPayload,
    handle: () => {
      if (process.platform === 'win32') {
        const success = app.setAsDefaultProtocolClient('http') && app.setAsDefaultProtocolClient('https');
        return success;
      }
      return app.setAsDefaultProtocolClient('http') && app.setAsDefaultProtocolClient('https');
    },
  });

  // isDev bilgisini renderer'a güvenli şekilde ver.
  defineHandler({
    channel: 'aethernode/app/isDev',
    schema: noPayload,
    handle: () => is.dev,
  });
}