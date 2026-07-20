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

/** Sayfadaki tüm video/audio öğelerine hız ve ses kazancı uygular. */
const MEDIA_BOOTSTRAP = `
(() => {
  if (window.__aetherMedia && window.__aetherMedia.__ready) return true;
  const S = {
    rate: 1,
    gain: 1,
    ctx: null,
    gains: new Map(),
    __ready: true,
    apply(rate, gain) {
      if (typeof rate === 'number' && rate > 0) S.rate = rate;
      if (typeof gain === 'number' && gain >= 0) S.gain = gain;
      document.querySelectorAll('video, audio').forEach((el) => {
        try { el.playbackRate = S.rate; } catch (e) {}
        try {
          if (!S.ctx) S.ctx = new (window.AudioContext || window.webkitAudioContext)();
          if (S.ctx.state === 'suspended') S.ctx.resume();
          let g = S.gains.get(el);
          if (!g) {
            const src = S.ctx.createMediaElementSource(el);
            g = S.ctx.createGain();
            src.connect(g);
            g.connect(S.ctx.destination);
            S.gains.set(el, g);
          }
          // GainNode her zaman; <=1 iken native volume + gain=1, >1 iken boost
          if (S.gain <= 1) {
            el.volume = Math.min(1, Math.max(0, S.gain));
            g.gain.value = 1;
          } else {
            el.volume = 1;
            g.gain.value = S.gain;
          }
        } catch (e) {
          try { el.volume = Math.min(1, Math.max(0, Math.min(S.gain, 1))); } catch (_) {}
        }
      });
      return { rate: S.rate, gain: S.gain };
    },
    get() { return { rate: S.rate || 1, gain: S.gain || 1 }; },
  };
  window.__aetherMedia = S;
  const mo = new MutationObserver(() => {
    if (S.rate !== 1 || S.gain !== 1) S.apply();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('play', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'VIDEO' || t.tagName === 'AUDIO')) S.apply();
  }, true);
  return true;
})();
`;

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

  const runMedia = async (rate?: number, gain?: number): Promise<MediaState> => {
    try {
      await el.executeJavaScript(MEDIA_BOOTSTRAP, false);
      const result = await el.executeJavaScript(
        `window.__aetherMedia.apply(${rate === undefined ? 'undefined' : rate}, ${gain === undefined ? 'undefined' : gain})`,
        false,
      );
      if (result && typeof result === 'object') {
        return {
          rate: Number((result as MediaState).rate) || 1,
          gain: Number((result as MediaState).gain) || 1,
        };
      }
    } catch {
      /* sayfa hazır değil */
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
        await el.executeJavaScript(MEDIA_BOOTSTRAP, false);
        const result = await el.executeJavaScript(`window.__aetherMedia.get()`, false);
        if (result && typeof result === 'object') {
          return {
            rate: Number((result as MediaState).rate) || 1,
            gain: Number((result as MediaState).gain) || 1,
          };
        }
      } catch {
        /* yoksay */
      }
      return { rate: 1, gain: 1 };
    },
  };
  return current;
}

export function getActiveWebviewControl(): WebviewControl {
  return current;
}
