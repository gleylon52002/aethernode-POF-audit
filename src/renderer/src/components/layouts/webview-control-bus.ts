// Aktif sekmenin webview kontrolünü paylaşan basit event bus.

import type { WebviewElement, WebviewFoundInPageResult } from '@renderer/types/webview';

export interface FindResult {
  active: number;
  total: number;
}

export interface MediaState {
  rate: number;
  gain: number;
}

export interface WebviewControl {
  back(): void;
  forward(): void;
  reload(): void;
  hardReload(): void;
  stop(): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomReset(): void;
  setDeepFocus(on: boolean): void;
  setReaderMode(on: boolean): void;
  openDevTools(): void;
  getUrl(): string | null;
  getTitle(): string | null;
  findInPage(text: string, opts?: { forward?: boolean; findNext?: boolean }): void;
  stopFindInPage(): void;
  onFindResult(cb: (r: FindResult) => void): () => void;
  print(): void;
  captureScreenshot(): Promise<string | null>;
  viewSource(): Promise<string | null>;
  setPlaybackRate(rate: number): Promise<void>;
  setVolumeGain(gain: number): Promise<void>;
  getMediaState(): Promise<MediaState>;
  /** Guest'e serbest kanal mesajı gönderir (autofill, medya indirme vb.) */
  sendToGuest(channel: string, ...args: unknown[]): void;
}

const noopControl: WebviewControl = {
  back() {},
  forward() {},
  reload() {},
  hardReload() {},
  stop() {},
  zoomIn() {},
  zoomOut() {},
  zoomReset() {},
  setDeepFocus() {},
  setReaderMode() {},
  openDevTools() {},
  getUrl: () => null,
  getTitle: () => null,
  findInPage() {},
  stopFindInPage() {},
  onFindResult: () => () => {},
  print() {},
  captureScreenshot: async () => null,
  viewSource: async () => null,
  setPlaybackRate: async () => {},
  setVolumeGain: async () => {},
  getMediaState: async () => ({ rate: 1, gain: 1 }),
  sendToGuest() {},
};

let current: WebviewControl = noopControl;
let boundEl: WebviewElement | null = null;
const findListeners = new Set<(r: FindResult) => void>();

function safe(fn: () => void): void {
  try {
    fn();
  } catch {
    /* webview henüz attach olmamış olabilir */
  }
}

function onFound(e: Event): void {
  const result = (e as Event & { result: WebviewFoundInPageResult }).result;
  if (!result) return;
  const payload: FindResult = {
    active: result.activeMatchOrdinal,
    total: result.matches,
  };
  findListeners.forEach((cb) => cb(payload));
}

export function setActiveWebviewControl(el: WebviewElement | null): WebviewControl {
  if (boundEl) {
    try {
      boundEl.removeEventListener('found-in-page', onFound);
    } catch {
      /* yoksay */
    }
    boundEl = null;
  }

  if (!el) {
    current = noopControl;
    return current;
  }

  boundEl = el;
  el.addEventListener('found-in-page', onFound);

  // Evrensel medya: main process TÜM frame'lerde (iframe player'lar dahil) uygular.
  const runMedia = async (rate?: number, gain?: number): Promise<MediaState> => {
    try {
      const wcId = el.getWebContentsId();
      const res = await window.aether.media.apply(wcId, rate, gain);
      if (res.ok && res.data) {
        return {
          rate: Number(res.data.rate) || 1,
          gain: Number(res.data.gain) || 1,
        };
      }
    } catch {
      /* webview hazır değil */
    }
    return { rate: rate ?? 1, gain: gain ?? 1 };
  };

  current = {
    back: () => safe(() => el.goBack()),
    forward: () => safe(() => el.goForward()),
    reload: () => safe(() => el.reload()),
    hardReload: () => safe(() => el.reloadIgnoringCache()),
    stop: () => safe(() => el.stop()),
    zoomIn: () => safe(() => el.setZoomLevel(Math.min(el.getZoomLevel() + 0.5, 9))),
    zoomOut: () => safe(() => el.setZoomLevel(Math.max(el.getZoomLevel() - 0.5, -8))),
    zoomReset: () => safe(() => el.setZoomLevel(0)),
    setDeepFocus: (on) => safe(() => el.send('aethernode/guest/deepFocus', on)),
    setReaderMode: (on) => safe(() => el.send('aethernode/guest/readerMode', on)),
    openDevTools: () => safe(() => el.openDevTools()),
    getUrl: () => {
      try {
        return el.getURL();
      } catch {
        return null;
      }
    },
    getTitle: () => {
      try {
        return el.getTitle();
      } catch {
        return null;
      }
    },
    findInPage: (text, opts) =>
      safe(() => {
        if (!text) {
          el.stopFindInPage('clearSelection');
          return;
        }
        el.findInPage(text, {
          forward: opts?.forward ?? true,
          findNext: opts?.findNext ?? false,
        });
      }),
    stopFindInPage: () => safe(() => el.stopFindInPage('clearSelection')),
    onFindResult: (cb) => {
      findListeners.add(cb);
      return () => findListeners.delete(cb);
    },
    print: () => safe(() => el.print()),
    captureScreenshot: async () => {
      try {
        const img = await el.capturePage();
        if (!img || img.isEmpty()) return null;
        return img.toDataURL();
      } catch {
        return null;
      }
    },
    viewSource: async () => {
      try {
        const html = await el.executeJavaScript<string>(
          `document.documentElement.outerHTML`,
          false,
        );
        return typeof html === 'string' ? html : null;
      } catch {
        return null;
      }
    },
    setPlaybackRate: async (rate) => {
      await runMedia(rate, undefined);
    },
    setVolumeGain: async (gain) => {
      await runMedia(undefined, gain);
    },
    getMediaState: async () => {
      try {
        const wcId = el.getWebContentsId();
        const res = await window.aether.media.state(wcId);
        if (res.ok && res.data) {
          return {
            rate: Number(res.data.rate) || 1,
            gain: Number(res.data.gain) || 1,
          };
        }
      } catch {
        /* yoksay */
      }
      return { rate: 1, gain: 1 };
    },
    sendToGuest: (channel, ...args) => safe(() => el.send(channel, ...args)),
  };
  return current;
}

export function getActiveWebviewControl(): WebviewControl {
  return current;
}
