import { app } from 'electron';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { is } from '@main/utils/env';
import { z } from 'zod';

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
      import('electron').then(({ shell }) => {
        if (process.platform === 'win32') {
          app.setAsDefaultProtocolClient('http');
          app.setAsDefaultProtocolClient('https');
          shell.openExternal('ms-settings:defaultapps');
        } else {
          app.setAsDefaultProtocolClient('http');
          app.setAsDefaultProtocolClient('https');
        }
      });
      return true;
    },
  });

  // isDev bilgisini renderer'a güvenli şekilde ver.
  defineHandler({
    channel: 'aethernode/app/isDev',
    schema: noPayload,
    handle: () => is.dev,
  });

  defineHandler({
    channel: 'aethernode/app/fetchFavicon',
    schema: z.string(),
    handle: async (url) => {
      try {
        if (!url || !url.startsWith('http')) return null;
        // Fetch ignoring CORS since it's the main process
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        const type = res.headers.get('content-type') || 'image/png';
        const base64 = Buffer.from(buf).toString('base64');
        return `data:${type};base64,${base64}`;
      } catch {
        return null;
      }
    },
  });
}