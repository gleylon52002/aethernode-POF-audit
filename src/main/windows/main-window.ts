import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { is } from '@main/utils/env';
import { DEV_SERVER_URL, PROD_RENDERER_FILE } from '@shared/constants/app';

// Ana uygulama penceresi. Tüm güvenlik bayrakları açık.
// NOT: fullscreen kullanılmaz — Windows görev çubuğu görünür kalsın.
export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#0B0B0F',
    titleBarStyle: 'hidden',
    frame: process.platform === 'darwin',
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: is.dev,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.once('ready-to-show', () => {
    // Maksimize et — görev çubuğu görünür kalır (fullscreen değil).
    win.maximize();
    win.show();
  });

  win.on('maximize', () => win.webContents.send('aethernode/window/maximized', true));
  win.on('unmaximize', () => win.webContents.send('aethernode/window/maximized', false));
  win.on('enter-full-screen', () => win.webContents.send('aethernode/window/maximized', true));
  win.on('leave-full-screen', () =>
    win.webContents.send('aethernode/window/maximized', win.isMaximized()),
  );

  if (is.dev) {
    void win.loadURL(DEV_SERVER_URL);
  } else {
    void win.loadFile(join(__dirname, PROD_RENDERER_FILE));
  }

  return win;
}
