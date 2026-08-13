import { BrowserWindow } from 'electron';
import { buildAppMenu } from '@main/menu';
import { createMainWindow as createWin } from './main-window';

// Pencere yöneticisi — tek elden pencere/menü yönetimi.
let main: BrowserWindow | null = null;

export function ensureMainWindow(): BrowserWindow {
  if (main && !main.isDestroyed()) return main;
  main = createWin();
  main.setMenu(buildAppMenu(main));
  main.on('closed', () => {
    main = null;
  });
  return main;
}

export function getMainWindow(): BrowserWindow | null {
  return main && !main.isDestroyed() ? main : null;
}

export function focusMainWindow(): void {
  const w = getMainWindow();
  if (!w) return;
  if (w.isMinimized()) w.restore();
  w.focus();
}
