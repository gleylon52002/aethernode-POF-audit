import type { WebviewElement } from '@renderer/types/webview';

// Sekme id → webview eşlemesi (mute / audible için).
const registry = new Map<string, WebviewElement>();
const readyMap = new Map<string, boolean>();

export function registerWebview(tabId: string, el: WebviewElement | null): void {
  if (!el) {
    registry.delete(tabId);
    readyMap.delete(tabId);
    return;
  }
  registry.set(tabId, el);
}

export function getWebview(tabId: string): WebviewElement | null {
  return registry.get(tabId) ?? null;
}

export function setWebviewReady(tabId: string, ready: boolean): void {
  readyMap.set(tabId, ready);
}

export function isWebviewReady(tabId: string): boolean {
  return readyMap.get(tabId) === true;
}

export function setWebviewAudioMuted(tabId: string, muted: boolean): void {
  const el = registry.get(tabId);
  if (!el) return;
  try {
    el.setAudioMuted(muted);
  } catch {
    /* henüz hazır değil */
  }
}
