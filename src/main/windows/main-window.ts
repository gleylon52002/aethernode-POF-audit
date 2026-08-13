import { BrowserWindow, app } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { is } from '@main/utils/env';
import { logger } from '@main/utils/logger';
import { DEV_SERVER_URL, PROD_RENDERER_FILE } from '@shared/constants/app';
import { openSafeExternal } from '@main/utils/open-external';

function resolveAppIcon(): string | undefined {
  const candidates = [
    join(process.resourcesPath, 'icons', 'icon.ico'),
    join(process.resourcesPath, 'icon.ico'),
    join(app.getAppPath(), 'resources', 'icons', 'icon.ico'),
    join(app.getAppPath(), 'logo.png'),
    join(__dirname, '../../resources/icons/icon.ico'),
    join(__dirname, '../../logo.png'),
  ];
  return candidates.find((p) => existsSync(p));
}

function resolveRendererHtml(): string {
  const candidates = [
    join(__dirname, PROD_RENDERER_FILE),
    join(app.getAppPath(), 'dist/src/renderer/index.html'),
    join(process.resourcesPath, 'app.asar', 'dist/src/renderer/index.html'),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    logger.error('Renderer HTML bulunamadı', { candidates });
    return candidates[0]!;
  }
  return found;
}

function revealWindow(win: BrowserWindow): void {
  if (win.isDestroyed() || win.isVisible()) return;
  win.maximize();
  win.show();
  win.focus();
}

// Ana uygulama penceresi. Tüm güvenlik bayrakları açık.
export function createMainWindow(): BrowserWindow {
  const icon = resolveAppIcon();
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
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      webSecurity: true,
      plugins: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: is.dev,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    openSafeExternal(url);
    return { action: 'deny' };
  });

  win.once('ready-to-show', () => revealWindow(win));

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    logger.error('Ana pencere yüklenemedi', { code, desc, url, packaged: app.isPackaged });
    revealWindow(win);
  });
  setTimeout(() => revealWindow(win), 8_000);

  win.on('maximize', () => win.webContents.send('aethernode/window/maximized', true));
  win.on('unmaximize', () => win.webContents.send('aethernode/window/maximized', false));
  win.on('enter-full-screen', () => win.webContents.send('aethernode/window/maximized', true));
  win.on('leave-full-screen', () =>
    win.webContents.send('aethernode/window/maximized', win.isMaximized()),
  );

  if (is.dev) {
    void win.loadURL(DEV_SERVER_URL);
  } else {
    const html = resolveRendererHtml();
    logger.info('Renderer yükleniyor', { html, packaged: app.isPackaged });
    void win.loadFile(html);
  }

  return win;
}
