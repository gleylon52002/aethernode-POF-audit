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

function send(channel: string, ...args: unknown[]): void {
  ipcRenderer.send(channel, ...args);
}

const api = {
  app: {
    version: () => invoke<string>(IPC.app.version),
    platform: () => invoke<string>(IPC.app.platform),
    quit: () => invoke<boolean>(IPC.app.quit),
    isDev: () => invoke<boolean>('aethernode/app/isDev'),
    setAsDefault: () => invoke<boolean>(IPC.app.setAsDefault),
    fetchFavicon: (url: string) => invoke<string>('aethernode/app/fetchFavicon', url),
  },
  window: {
    minimize: () => invoke<boolean>(IPC.window.minimize),
    maximize: () => invoke<boolean>(IPC.window.maximize),
    close: () => invoke<boolean>(IPC.window.close),
    isMaximized: () => invoke<boolean>(IPC.window.isMaximized),
    toggleFullscreen: () => invoke<boolean>(IPC.window.toggleFullscreen),
    openLittle: (url: string) => invoke<boolean>(IPC.window.openLittle, { url }),
    onMaximizedChange: (cb: (max: boolean) => void) =>
      on('aethernode/window/maximized', (p) => cb(!!p)),
  },
  tabs: {
    forceClose: (wcId: number) => invoke<boolean>(IPC.tabs.forceClose, { wcId }),
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
    attachPartition: (partition: string) =>
      invoke<boolean>(IPC.guest.attachPartition, { partition }),
    onOpenUrl: (cb: (url: string) => void) =>
      on('aethernode/guest/openUrl', (p) => cb(String(p))),
    onOpenBackground: (cb: (url: string) => void) =>
      on('aethernode/guest/openBackground', (p) => cb(String(p))),
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
    touchIdle: () => invoke<boolean>(IPC.passwords.touchIdle),
  },
  notes: {
    list: () => invoke(IPC.notes.list),
    add: (title: string, body: string) => invoke(IPC.notes.add, { title, body }),
    update: (id: string, patch: { title?: string; body?: string; pinned?: boolean; color?: string; tags?: string[] }) =>
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
    pauseSite: (hostname: string) => invoke<boolean>(IPC.privacy.pauseSite, { hostname }),
    resumeSite: (hostname: string) => invoke<boolean>(IPC.privacy.resumeSite, { hostname }),
    isSitePaused: (hostname: string) =>
      invoke<boolean>(IPC.privacy.isSitePaused, { hostname }),
    listPausedSites: () => invoke<string[]>(IPC.privacy.listPausedSites),
    webrtcAllowSite: (hostname: string) => invoke<boolean>(IPC.privacy.webrtcAllowSite, { hostname }),
    webrtcDisallowSite: (hostname: string) => invoke<boolean>(IPC.privacy.webrtcDisallowSite, { hostname }),
    webrtcAllowedSites: () => invoke<string[]>(IPC.privacy.webrtcAllowedSites),
  },
  security: {
    scan: () => invoke(IPC.security.scan),
    permissions: () => invoke(IPC.security.permissions),
    breaches: () => invoke(IPC.security.breaches),
  },
  backup: {
    export: (password: string, bookmarks?: unknown[]) =>
      invoke<{ path: string; items: string[] } | null>(IPC.backup.export, {
        password,
        bookmarks,
      }),
    import: (password: string) =>
      invoke<{ items: string[]; bookmarks: unknown[] | null } | null>(IPC.backup.import, {
        password,
      }),
  },
  media: {
    apply: (wcId: number, rate?: number, gain?: number) =>
      invoke<{ rate: number; gain: number }>(IPC.media.apply, { wcId, rate, gain }),
    state: (wcId: number) =>
      invoke<{ rate: number; gain: number }>(IPC.media.state, { wcId }),
  },
  autofill: {
    profiles: () => invoke(IPC.autofill.profiles),
    saveProfile: (profile: unknown) => invoke(IPC.autofill.saveProfile, profile),
    removeProfile: (id: string) => invoke<boolean>(IPC.autofill.removeProfile, { id }),
    cards: () => invoke(IPC.autofill.cards),
    saveCard: (card: unknown) => invoke(IPC.autofill.saveCard, card),
    removeCard: (id: string) => invoke<boolean>(IPC.autofill.removeCard, { id }),
  },
  relay: {
    create: (url: string, ttlMs: number, maxUses: number) =>
      invoke<{ token: string }>(IPC.relay.create, { url, ttlMs, maxUses }),
    resolve: (token: string) =>
      invoke<{
        valid: boolean;
        url?: string;
        reason?: string;
        expiresAt?: number;
        usesLeft?: number;
      }>(IPC.relay.resolve, { token }),
  },
  pwa: {
    open: (startUrl: string, name?: string) =>
      invoke<{ opened: boolean; reused: boolean }>(IPC.pwa.open, { startUrl, name }),
  },
  performance: {
    getNetworkLimit: () => invoke(IPC.performance.getNetworkLimit),
    setNetworkLimit: (downloadMbps: number, uploadMbps: number, latencyMs: number) =>
      invoke<boolean>(IPC.performance.setNetworkLimit, { downloadMbps, uploadMbps, latencyMs }),
    clearNetworkLimit: () => invoke<boolean>(IPC.performance.clearNetworkLimit),
    getNetworkStats: () => invoke(IPC.performance.getNetworkStats),
    getCpuLimit: () => invoke(IPC.performance.getCpuLimit),
    setCpuLimit: (percent: number) => invoke<boolean>(IPC.performance.setCpuLimit, { percent }),
    clearCpuLimit: () => invoke<boolean>(IPC.performance.clearCpuLimit),
    getCpuStats: () => invoke(IPC.performance.getCpuStats),
    getMemoryLimit: () => invoke(IPC.performance.getMemoryLimit),
    setMemoryLimit: (mode: 'soft' | 'hard', limitMb: number) =>
      invoke<boolean>(IPC.performance.setMemoryLimit, { mode, limitMb }),
    clearMemoryLimit: () => invoke<boolean>(IPC.performance.clearMemoryLimit),
    getMemoryStats: () => invoke(IPC.performance.getMemoryStats),
  },
  downloads: {
    list: () => invoke(IPC.downloads.list),
    pause: (id: string) => invoke<boolean>(IPC.downloads.pause, { id }),
    resume: (id: string) => invoke<boolean>(IPC.downloads.resume, { id }),
    cancel: (id: string) => invoke<boolean>(IPC.downloads.cancel, { id }),
    open: (id: string) => invoke<boolean>(IPC.downloads.open, { id }),
    openFolder: (id?: string) =>
      invoke<boolean>(IPC.downloads.openFolder, id ? { id } : undefined),
    remove: (id: string) => invoke<boolean>(IPC.downloads.remove, { id }),
    clearCompleted: () => invoke<number>(IPC.downloads.clearCompleted),
    onUpdated: (cb: (items: unknown[]) => void) => on(IPC.downloads.updated, cb),
  },
  updater: {
    check: () => invoke(IPC.updater.check),
    getStatus: () => invoke(IPC.updater.status),
    install: () => invoke(IPC.updater.install),
    onAvailable: (cb: (payload: { version?: string }) => void) => on(IPC.updater.available, cb),
    onDownloaded: (cb: (payload: { version?: string }) => void) => on(IPC.updater.downloaded, cb),
    onProgress: (cb: (payload: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }) => void) => on(IPC.updater.progress, cb),
    onError: (cb: (payload: { error?: string }) => void) => on(IPC.updater.error, cb),
    onNotAvailable: (cb: (payload: { version?: string }) => void) => on(IPC.updater.notAvailable, cb),
    onChecking: (cb: () => void) => on(IPC.updater.checking, cb),
  },
  // Genel event aboneliği — main'den renderer'a tek yönlü güncellemeler.
  on: (channel: string, listener: (payload: unknown) => void): (() => void) => {
    const handler = (_e: unknown, payload: unknown) => listener(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.off(channel, handler);
  },
  send,
};

contextBridge.exposeInMainWorld('aether', api);

// Renderer tip güvenliği için tip bildirimi.
export type AetherApi = typeof api;