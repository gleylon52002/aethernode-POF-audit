import { webContents, type WebFrameMain } from 'electron';
import { z } from 'zod';
import { defineHandler } from '@main/ipc/router';
import { IPC } from '@shared/constants';

// Evrensel medya kontrolü — video hızı + ses boost, TÜM frame'lerde
// (iframe içindeki oynatıcılar dahil; guest preload yalnızca üst frame'de çalışır).

interface MediaState {
  rate: number;
  gain: number;
}

const stateByWc = new Map<number, MediaState>();
const hooked = new Set<number>();

function buildScript(rate: number, gain: number): string {
  return `(() => {
  try {
    if (!window.__aetherMedia) {
      const S = {
        rate: 1,
        gain: 1,
        ctx: null,
        gains: new Map(),
        canBoost(el) {
          try {
            const src = el.currentSrc || el.src || '';
            if (!src) return true;
            if (src.startsWith('blob:') || src.startsWith('data:')) return true;
            const u = new URL(src, location.href);
            // Cross-origin + CORS'suz medya WebAudio'da sessizleşir — boost atla
            return u.origin === location.origin || el.crossOrigin != null;
          } catch (_) { return false; }
        },
        apply(rate, gain) {
          if (typeof rate === 'number' && rate > 0) S.rate = rate;
          if (typeof gain === 'number' && gain >= 0) S.gain = gain;
          document.querySelectorAll('video, audio').forEach((el) => {
            try { if (el.playbackRate !== S.rate) el.playbackRate = S.rate; } catch (e) {}
            try {
              if (S.gain > 1 && S.canBoost(el)) {
                if (!S.ctx) S.ctx = new (window.AudioContext || window.webkitAudioContext)();
                if (S.ctx.state === 'suspended') S.ctx.resume();
                let g = S.gains.get(el);
                if (!g) {
                  const srcNode = S.ctx.createMediaElementSource(el);
                  g = S.ctx.createGain();
                  srcNode.connect(g);
                  g.connect(S.ctx.destination);
                  S.gains.set(el, g);
                }
                el.volume = 1;
                g.gain.value = S.gain;
              } else {
                const g = S.gains.get(el);
                if (g) { g.gain.value = Math.max(S.gain, 0); el.volume = 1; }
                else { el.volume = Math.min(1, Math.max(0, S.gain)); }
              }
            } catch (e) {
              try { el.volume = Math.min(1, Math.max(0, S.gain)); } catch (_) {}
            }
          });
          return { rate: S.rate, gain: S.gain };
        },
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
      // Bazı oynatıcılar hızı geri alır — ratechange'te tekrar uygula
      document.addEventListener('ratechange', (e) => {
        const t = e.target;
        if (t && t.tagName === 'VIDEO' && S.rate !== 1 && Math.abs(t.playbackRate - S.rate) > 0.01) {
          try { t.playbackRate = S.rate; } catch (_) {}
        }
      }, true);
    }
    return window.__aetherMedia.apply(${rate}, ${gain});
  } catch (e) { return null; }
})();`;
}

function allFrames(wcId: number): WebFrameMain[] {
  const wc = webContents.fromId(wcId);
  if (!wc || wc.isDestroyed()) return [];
  try {
    return wc.mainFrame.framesInSubtree;
  } catch {
    return [];
  }
}

async function applyToAllFrames(wcId: number, rate: number, gain: number): Promise<MediaState> {
  stateByWc.set(wcId, { rate, gain });
  const frames = allFrames(wcId);
  const code = buildScript(rate, gain);
  await Promise.all(
    frames.map((f) =>
      f.executeJavaScript(code).catch(() => {
        /* çapraz-origin frame'de bile main'den çalışır; sayfa hazır değilse yut */
      }),
    ),
  );

  // Yeni frame'ler (iframe player geç yüklenir) için tek seferlik kanca
  if (!hooked.has(wcId)) {
    hooked.add(wcId);
    const wc = webContents.fromId(wcId);
    wc?.on('did-frame-finish-load', () => {
      const s = stateByWc.get(wcId);
      if (!s || (s.rate === 1 && s.gain === 1)) return;
      const c = buildScript(s.rate, s.gain);
      for (const f of allFrames(wcId)) {
        f.executeJavaScript(c).catch(() => undefined);
      }
    });
    wc?.once('destroyed', () => {
      stateByWc.delete(wcId);
      hooked.delete(wcId);
    });
  }

  return { rate, gain };
}

export function registerMediaHandlers(): void {
  defineHandler({
    channel: IPC.media.apply,
    schema: z.object({
      wcId: z.number().int().positive(),
      rate: z.number().min(0.1).max(16).optional(),
      gain: z.number().min(0).max(5).optional(),
    }),
    handle: async ({ wcId, rate, gain }) => {
      const cur = stateByWc.get(wcId) ?? { rate: 1, gain: 1 };
      return applyToAllFrames(wcId, rate ?? cur.rate, gain ?? cur.gain);
    },
  });

  defineHandler({
    channel: IPC.media.state,
    schema: z.object({ wcId: z.number().int().positive() }),
    handle: ({ wcId }) => stateByWc.get(wcId) ?? { rate: 1, gain: 1 },
  });
}
