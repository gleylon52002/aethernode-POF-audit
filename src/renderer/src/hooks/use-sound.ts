import { useSettings } from '@renderer/store/settings';

let ctx: AudioContext | null = null;
let unlockAttached = false;

function getCtx(): AudioContext | null {
  try {
    if (ctx && ctx.state !== 'closed') return ctx;
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    if (ctx.state === 'suspended') attachUnlock();
    return ctx;
  } catch {
    return null;
  }
}

function attachUnlock() {
  if (unlockAttached) return;
  unlockAttached = true;
  const resume = () => {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  window.addEventListener('click', resume, { passive: true });
  window.addEventListener('keydown', resume, { passive: true });
  window.addEventListener('pointerdown', resume, { passive: true });
}

function shouldPlay(): boolean {
  const s = useSettings.getState().settings.general;
  if (!s.soundEffectsEnabled) return false;
  return true;
}

// ── Sound presets — kolay ince ayar için sabitler ──────────────────
export const SOUND_PRESETS = {
  tabOpen: { from: 400, to: 620, durationMs: 110, type: 'triangle' as OscillatorType, attackMs: 6, decayMs: 70, extraHarmonics: true },
  tabClose: { from: 620, to: 340, durationMs: 85, type: 'triangle' as OscillatorType, attackMs: 4, decayMs: 55, extraHarmonics: true },
  primaryClick: { freq: 740, durationMs: 55, type: 'sine' as OscillatorType, attackMs: 2, decayMs: 35 },
  sidebarNav: { freq: 880, durationMs: 55, type: 'sine' as OscillatorType, attackMs: 1, decayMs: 30 },
  downloadDone: { freq: 660, durationMs: 90, type: 'sine' as OscillatorType, attackMs: 2, decayMs: 60 },
} as const;

function playTone(
  freq: number,
  durationMs: number,
  type: OscillatorType,
  volume: number,
  attackMs = 2,
  decayMs = 40,
) {
  let ac: AudioContext | null = null;
  try {
    ac = getCtx();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[sound] AudioContext init failed', e);
    return;
  }
  if (!ac) return;

  const doPlay = () => {
    try {
      if (!ac) return;
      if (ac.state === 'suspended') {
        ac.resume()
          .then(() => { if (ac && ac.state === 'running') doPlay(); })
          .catch(() => {});
        return;
      }
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const now = ac.currentTime;
      const dur = durationMs / 1000;
      const atk = attackMs / 1000;
      const dec = decayMs / 1000;
      // ADSR benzeri: hızlı attack, yumuşak decay + kısa reverb kuyruk fade
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + atk);
      // tepe sonrası yumuşak düşüş
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.22), now + atk + dec * 0.55);
      // reverb kuyruğu — exponential fade-out
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + dur + 0.015);
      setTimeout(() => {
        try { osc.disconnect(); gain.disconnect(); } catch {}
      }, durationMs + 80);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[sound] playTone failed', e);
    }
  };
  if (ac.state === 'suspended') ac.resume().then(() => doPlay()).catch(() => doPlay());
  else doPlay();
}

/** Yükselen/alçalan frekans slide ile — daha doğal */
function playSlideTone(
  from: number,
  to: number,
  durationMs: number,
  type: OscillatorType,
  volume: number,
  attackMs = 6,
  decayMs = 60,
  extraHarmonics = false,
) {
  let ac: AudioContext | null = null;
  try { ac = getCtx(); } catch { return; }
  if (!ac) return;

  const doPlay = () => {
    try {
      if (!ac) return;
      if (ac.state === 'suspended') {
        ac.resume().then(() => { if (ac && ac.state === 'running') doPlay(); }).catch(() => {});
        return;
      }
      const now = ac.currentTime;
      const dur = durationMs / 1000;
      const atk = attackMs / 1000;
      const dec = decayMs / 1000;

      // Ana oscillator
      const osc = ac!.createOscillator();
      const gain = ac!.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, now);
      osc.frequency.exponentialRampToValueAtTime(to, now + dur * 0.85);

      // Hafif ikinci harmonik (sıcaklık katmak için) — çok düşük volüm
      let osc2: OscillatorNode | null = null;
      let gain2: GainNode | null = null;
      if (extraHarmonics) {
        osc2 = ac!.createOscillator();
        gain2 = ac!.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(from * 1.5, now);
        osc2.frequency.exponentialRampToValueAtTime(to * 1.5, now + dur * 0.85);
        gain2.gain.setValueAtTime(0.0001, now);
        gain2.gain.linearRampToValueAtTime(volume * 0.12, now + atk);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.015);
        osc2.connect(gain2).connect(ac!.destination);
        osc2.start(now);
        osc2.stop(now + dur + 0.015);
        setTimeout(() => { try { osc2!.disconnect(); gain2!.disconnect(); } catch {} }, durationMs + 80);
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + atk);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.18), now + atk + dec * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.015);

      osc.connect(gain).connect(ac!.destination);
      osc.start(now);
      osc.stop(now + dur + 0.015);
      setTimeout(() => { try { osc.disconnect(); gain.disconnect(); } catch {} }, durationMs + 80);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[sound] playSlideTone failed', e);
    }
  };
  if (ac.state === 'suspended') ac.resume().then(() => doPlay()).catch(() => doPlay());
  else doPlay();
}

export type UiSoundAction = 'tabOpen' | 'tabClose' | 'primaryClick' | 'sidebarNav' | 'downloadDone';

export function playUiSound(action: UiSoundAction) {
  if (!shouldPlay()) return;
  const vol = useSettings.getState().settings.general.soundEffectsVolume ?? 0.3;
  const v = Math.max(0, Math.min(1, vol));
  if (v <= 0.001) return;
  switch (action) {
    case 'tabOpen': {
      const p = SOUND_PRESETS.tabOpen;
      playSlideTone(p.from, p.to, p.durationMs, p.type, v * 0.24, p.attackMs, p.decayMs, p.extraHarmonics);
      break;
    }
    case 'tabClose': {
      const p = SOUND_PRESETS.tabClose;
      playSlideTone(p.from, p.to, p.durationMs, p.type, v * 0.20, p.attackMs, p.decayMs, p.extraHarmonics);
      break;
    }
    case 'primaryClick': {
      const p = SOUND_PRESETS.primaryClick;
      playTone(p.freq, p.durationMs, p.type, v * 0.16, p.attackMs, p.decayMs);
      break;
    }
    case 'sidebarNav': {
      const p = SOUND_PRESETS.sidebarNav;
      playTone(p.freq, p.durationMs, p.type, v * 0.13, p.attackMs, p.decayMs);
      break;
    }
    case 'downloadDone': {
      const p = SOUND_PRESETS.downloadDone;
      playTone(p.freq, p.durationMs, p.type, v * 0.2, p.attackMs, p.decayMs);
      setTimeout(() => playTone(880, 90, 'sine', v * 0.18, 2, 60), 90);
      break;
    }
  }
}

export function initSoundUnlock(): void {
  attachUnlock();
  try { getCtx(); } catch {}
}
