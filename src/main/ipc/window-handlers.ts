import { BrowserWindow } from 'electron';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { getMainWindow } from '@main/windows';
import { z } from 'zod';

function targetWindow(): BrowserWindow | null {
  return getMainWindow() ?? BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}

export function registerWindowHandlers(): void {
  defineHandler({
    channel: IPC.window.minimize,
    schema: noPayload,
    handle: () => {
      const w = targetWindow();
      if (!w) return false;
      if (w.isFullScreen()) w.setFullScreen(false);
      w.minimize();
      return true;
    },
  });

  defineHandler({
    channel: IPC.window.maximize,
    schema: noPayload,
    handle: () => {
      const w = targetWindow();
      if (!w) return false;
      if (w.isFullScreen()) {
        w.setFullScreen(false);
        w.maximize();
        return true;
      }
      if (w.isMaximized()) w.unmaximize();
      else w.maximize();
      return true;
    },
  });

  defineHandler({
    channel: IPC.window.close,
    schema: noPayload,
    handle: () => {
      targetWindow()?.close();
      return true;
    },
  });

  defineHandler({
    channel: IPC.window.isMaximized,
    schema: noPayload,
    handle: () => {
      const w = targetWindow();
      if (!w) return false;
      return w.isMaximized() || w.isFullScreen();
    },
  });

  defineHandler({
    channel: IPC.window.toggleFullscreen,
    schema: noPayload,
    handle: () => {
      const w = targetWindow();
      if (!w) return false;
      w.setFullScreen(!w.isFullScreen());
      return true;
    },
  });

  defineHandler({
    channel: IPC.window.openLittle,
    schema: z.object({ url: z.string().min(1) }),
    handle: ({ url }) => {
      if (!/^https?:\/\//i.test(url)) return false;
      const little = new BrowserWindow({
        width: 480,
        height: 640,
        minWidth: 360,
        minHeight: 400,
        title: 'AetherNode Mini',
        backgroundColor: '#0B0B0F',
        autoHideMenuBar: true,
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: true,
        },
      });
      void little.loadURL(url);
      little.setAlwaysOnTop(true, 'floating');
      return true;
    },
  });
}
