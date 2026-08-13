import { BrowserWindow } from 'electron';
import { z } from 'zod';
import { defineHandler } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { logger } from '@main/utils/logger';
import { applyWebRtcPolicy } from '@main/security/webrtc-guard';
import { networkGuard } from '@main/network';

/**
 * PWA "Uygulama olarak aç" — site manifest'indeki start_url'ü ayrı bir
 * uygulamamsı pencerede açar. Tam OS kurulumu yerine yerel, telemetrisiz
 * yedek yüzey.
 */

const pwaWindows = new Map<string, BrowserWindow>();

export function registerPwaHandlers(): void {
  defineHandler({
    channel: IPC.pwa.open,
    schema: z.object({
      startUrl: z.string().url().max(4096),
      name: z.string().max(120).optional(),
      partition: z.string().max(80).optional(),
    }),
    handle: ({ startUrl, name, partition }) => {
      if (!/^https:\/\//i.test(startUrl)) {
        throw new Error('PWA yalnızca HTTPS start_url kabul eder');
      }
      const key = startUrl;
      const existing = pwaWindows.get(key);
      if (existing && !existing.isDestroyed()) {
        existing.focus();
        return { opened: true, reused: true };
      }

      const part =
        partition || `persist:pwa-${Buffer.from(startUrl).toString('hex').slice(0, 16)}`;
      networkGuard.attachPartition(part);

      const win = new BrowserWindow({
        width: 1100,
        height: 760,
        minWidth: 640,
        minHeight: 480,
        title: name || 'AetherNode Uygulama',
        backgroundColor: '#0B0B0F',
        autoHideMenuBar: true,
        webPreferences: {
          partition: part,
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: true,
          plugins: true,
          spellcheck: false,
        },
      });

      applyWebRtcPolicy(win.webContents);
      win.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\//i.test(url)) void win.loadURL(url);
        return { action: 'deny' };
      });

      void win.loadURL(startUrl);
      pwaWindows.set(key, win);
      win.on('closed', () => pwaWindows.delete(key));
      logger.info('PWA penceresi açıldı', { startUrl, name });
      return { opened: true, reused: false };
    },
  });
}
