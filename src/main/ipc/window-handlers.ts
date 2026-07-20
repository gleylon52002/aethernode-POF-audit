import { BrowserWindow } from 'electron';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { getMainWindow } from '@main/windows';

function targetWindow(): BrowserWindow | null {
  return getMainWindow() ?? BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}

// Pencere kontrol handler'ları. Custom titlebar düğmeleri buradan çalışır.
// Tam ekrandayken maximize/minimize önce tam ekranı kapatır.
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
}
