import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@shared/constants';
import type { Result } from '@shared/types/result';

// Preload, contextIsolation açıkken güvenli bir API yüzeyi ortaya çıkarır.
// Renderer yalnızca invoke/on metodlarına erişir; doğrudan ipcRenderer yoktur.
// Her kanal ayrı bir invoke yöntemiyle sarmalanır, böylece kanal allowlist
// doğal olarak oluşur — izin verilmeyen kanal çağrılamaz.

async function invoke<T>(channel: string, payload?: unknown): Promise<Result<T>> {
  return (await ipcRenderer.invoke(channel, payload)) as Result<T>;
}

function on<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_e: unknown, payload: T) => listener(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.off(channel, handler);
}

const api = {
  app: {
    version: () => invoke<string>(IPC.app.version),
    platform: () => invoke<string>(IPC.app.platform),
    quit: () => invoke<boolean>(IPC.app.quit),
    isDev: () => invoke<boolean>('aethernode/app/isDev'),
  },
  window: {
    minimize: () => invoke<boolean>(IPC.window.minimize),
    maximize: () => invoke<boolean>(IPC.window.maximize),
    close: () => invoke<boolean>(IPC.window.close),
    isMaximized: () => invoke<boolean>(IPC.window.isMaximized),
    toggleFullscreen: () => invoke<boolean>(IPC.window.toggleFullscreen),
    onMaximizedChange: (cb: (max: boolean) => void) =>
      on('aethernode/window/maximized', (p) => cb(!!p)),
  },
  history: {
    list: (query?: string) => invoke(IPC.history.list, query ? { query } : undefined),
    add: (url: string, title: string) => invoke(IPC.history.add, { url, title }),
    remove: (id: string) => invoke<boolean>(IPC.history.remove, { id }),
    clear: () => invoke<boolean>(IPC.history.clear),
  },
  shortcuts: {
    onEvent: (cb: (e: { action: string; arg?: number }) => void) =>
      on(IPC.shortcuts.event, cb),
  },
  guest: {
    preloadPath: () => invoke<string>(IPC.guest.preloadPath),
    onOpenUrl: (cb: (url: string) => void) =>
      on('aethernode/guest/openUrl', (p) => cb(String(p))),
  },
  settings: {
    all: () => invoke(IPC.settings.all),
    get: (key: string) => invoke(IPC.settings.get, { key }),
    set: (next: unknown) => invoke<boolean>(IPC.settings.set, next),
    reset: () => invoke<boolean>(IPC.settings.reset),
  },
  passwords: {
    status: () => invoke(IPC.passwords.status),
    isUnlocked: () => invoke<boolean>(IPC.passwords.isUnlocked),
    unlock: (password: string) => invoke(IPC.passwords.unlock, { password }),
    lock: () => invoke(IPC.passwords.lock),
    list: () => invoke(IPC.passwords.list),
    add: (entry: unknown) => invoke(IPC.passwords.add, { entry }),
    update: (id: string, patch: unknown) => invoke(IPC.passwords.update, { id, patch }),
    remove: (id: string) => invoke(IPC.passwords.remove, { id }),
  },
  notes: {
    list: () => invoke(IPC.notes.list),
    add: (title: string, body: string) => invoke(IPC.notes.add, { title, body }),
    update: (id: string, patch: { title?: string; body?: string }) =>
      invoke(IPC.notes.update, { id, ...patch }),
    remove: (id: string) => invoke(IPC.notes.remove, { id }),
  },
  network: {
    enableInspector: () => invoke<boolean>(IPC.network.enableInspector),
    disableInspector: () => invoke<boolean>(IPC.network.disableInspector),
    onCaptured: (cb: (req: unknown) => void) => on(IPC.network.captured, cb),
    onBlocked: (cb: (req: unknown) => void) => on(IPC.network.blocked, cb),
  },
  privacy: {
    fingerprintConfig: () => invoke(IPC.privacy.fingerprintConfig),
    runLeakTest: () => invoke(IPC.privacy.runLeakTest),
    guardStatus: () => invoke<{ blockedTotal: number }>(IPC.privacy.networkGuardStatus),
    panic: () => invoke<boolean>(IPC.privacy.panic),
    deepClean: () => invoke<boolean>(IPC.privacy.deepClean),
  },
  security: {
    scan: () => invoke(IPC.security.scan),
    permissions: () => invoke(IPC.security.permissions),
    breaches: () => invoke(IPC.security.breaches),
  },
  // Genel event aboneliği — main'den renderer'a tek yönlü güncellemeler.
  on: (channel: string, listener: (payload: unknown) => void): (() => void) => {
    const handler = (_e: unknown, payload: unknown) => listener(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.off(channel, handler);
  },
};

contextBridge.exposeInMainWorld('aether', api);

// Renderer tip güvenliği için tip bildirimi.
export type AetherApi = typeof api;