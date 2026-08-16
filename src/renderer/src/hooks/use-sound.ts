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

/**
 * Organik, ASMR dokulu akustik mikro-tıklama (Apple Trackpad / Tactile Switch hissi)
 * BiquadFilter (Low-pass + Q rezonansı) ile kulağı tırmalayan yüksek frekanslar filtrelenir.
 */
function playAcousticTap(
  startFreq: number,
  endFreq: number,
  durationMs: number,
  volume: number,
  filterCutoff = 2400,
) {
  const ac = getCtx();
  if (!ac) return;

  const doPlay = () => {
    try {
      if (!ac || ac.state !== 'running') return;
      const now = ac.currentTime;
      const dur = durationMs / 1000;

      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const filter = ac.createBiquadFilter();

      // Sıcak akustik gövde filtresi
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterCutoff, now);
      filter.frequency.exponentialRampToValueAtTime(filterCutoff * 0.4, now + dur);
      filter.Q.value = 1.8;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur * 0.85);

      // Ultra-hızlı attack (1ms), tatmin edici yumuşak sönümlenme
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);

      osc.start(now);
      osc.stop(now + dur + 0.01);

      setTimeout(() => {
        try {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {}
      }, durationMs + 60);
    } catch {}
  };

  if (ac.state === 'suspended') ac.resume().then(() => doPlay()).catch(() => doPlay());
  else doPlay();
}

/**
 * Huzurlu akor ve uyumlu tonlar (Açılış, indirme tamamlandı gibi pozitif eylemler)
 */
function playHarmonicChime(notes: number[], volume: number, noteSpacingMs = 45) {
  const ac = getCtx();
  if (!ac) return;

  notes.forEach((freq, idx) => {
    setTimeout(() => {
      try {
        if (!ac) return;
        const now = ac.currentTime;
        const dur = 0.18;

        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const filter = ac.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, now);
        filter.Q.value = 1.2;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ac.destination);

        osc.start(now);
        osc.stop(now + dur + 0.02);

        setTimeout(() => {
          try {
            osc.disconnect();
            filter.disconnect();
            gain.disconnect();
          } catch {}
        }, 220);
      } catch {}
    }, idx * noteSpacingMs);
  });
}

/**
 * Sekme Kapatma için yumuşak, organik "baloncuk/pıt" sesi
 */
function playSoftBubble(volume: number) {
  const ac = getCtx();
  if (!ac) return;

  const doPlay = () => {
    try {
      if (!ac || ac.state !== 'running') return;
      const now = ac.currentTime;
      const dur = 0.075;

      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const filter = ac.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.value = 2.2;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + dur);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);

      osc.start(now);
      osc.stop(now + dur + 0.01);

      setTimeout(() => {
        try {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {}
      }, 90);
    } catch {}
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
      // Ferah, tatlı yükselen ikili akor (C5 -> G5)
      playHarmonicChime([523.25, 783.99], v * 0.18, 30);
      break;
    }
    case 'tabClose': {
      // Doyurucu, yumuşak mikro baloncuk pıt sesi
      playSoftBubble(v * 0.22);
      break;
    }
    case 'primaryClick': {
      // Apple Trackpad / mekanik switch mikro tık
      playAcousticTap(1050, 480, 22, v * 0.20, 2600);
      break;
    }
    case 'sidebarNav': {
      // Kadife yumuşaklığında ahşap/cam menü geçiş tıkı
      playAcousticTap(740, 360, 16, v * 0.15, 2000);
      break;
    }
    case 'downloadDone': {
      // Zarif, kutlama hissi veren majör üçlü arpej (D5 -> F#5 -> A5)
      playHarmonicChime([587.33, 739.99, 880.0], v * 0.22, 55);
      break;
    }
  }
}

export function initSoundUnlock(): void {
  attachUnlock();
  try { getCtx(); } catch {}
}
