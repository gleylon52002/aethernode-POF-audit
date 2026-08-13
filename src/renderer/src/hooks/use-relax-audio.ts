import { useEffect, useRef } from 'react';
import { useRelaxStore } from '@renderer/store/relax';

// Prosedürel lo-fi + drone ses motoru.
// Tüm Web Audio düğümleri burada yönetilir — panel kapansa bile çalmaya devam eder.
// Ayrı AudioContext (UI seslerinden bağımsız), kendi unlock mantığı ile.

let relaxCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let loFiGain: GainNode | null = null;
let droneGain: GainNode | null = null;
let loFiNodes: Array<OscillatorNode | AudioBufferSourceNode | GainNode | BiquadFilterNode> = [];
let droneOsc: OscillatorNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let isStarted = false;

function getRelaxCtx(): AudioContext | null {
  try {
    if (relaxCtx && relaxCtx.state !== 'closed') return relaxCtx;
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    relaxCtx = new AC();
    masterGain = relaxCtx.createGain();
    masterGain.gain.value = 0.45;
    masterGain.connect(relaxCtx.destination);
    loFiGain = relaxCtx.createGain();
    loFiGain.gain.value = 1;
    loFiGain.connect(masterGain);
    droneGain = relaxCtx.createGain();
    droneGain.gain.value = 0;
    droneGain.connect(masterGain);
    return relaxCtx;
  } catch { return null; }
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const len = ctx.sampleRate * 2; // 2 sn loop
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    // beyaz + hafif kahverengi eğilim (düşük frekans vurgusu)
    const white = Math.random() * 2 - 1;
    // basit filtre: önceki örnekle karışım
    const prev = i > 0 ? data[i - 1]! : 0;
    data[i] = (white * 0.55 + prev * 0.45) * 0.9;
  }
  noiseBuffer = buf;
  return buf;
}

function startLoFi(ctx: AudioContext) {
  stopLoFi();
  if (!loFiGain) return;
  const now = ctx.currentTime;

  // Katman 1: 55 Hz triangle — sıcak sub
  const o1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  o1.type = 'triangle';
  o1.frequency.value = 55;
  g1.gain.setValueAtTime(0, now);
  g1.gain.linearRampToValueAtTime(0.08, now + 1.2);
  o1.connect(g1);

  // Katman 2: 110 Hz sine — hafif melodik
  const o2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  o2.type = 'sine';
  o2.frequency.value = 110;
  // çok yavaş vibrato (LFO) — 0.18 Hz
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.18;
  lfoGain.gain.value = 1.2;
  lfo.connect(lfoGain);
  lfoGain.connect(o2.frequency);
  g2.gain.setValueAtTime(0, now);
  g2.gain.linearRampToValueAtTime(0.06, now + 1.6);
  o2.connect(g2);

  // Katman 3: 220 Hz sine — çok düşük, arpejik değil sabit
  const o3 = ctx.createOscillator();
  const g3 = ctx.createGain();
  o3.type = 'sine';
  o3.frequency.value = 220;
  g3.gain.setValueAtTime(0, now);
  g3.gain.linearRampToValueAtTime(0.028, now + 2.0);
  o3.connect(g3);

  // Vinil hışırtısı: beyaz gürültü + filtreler
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = createNoiseBuffer(ctx);
  noiseSrc.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 900;
  hp.Q.value = 0.6;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2800;
  lp.Q.value = 0.3;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0, now);
  ng.gain.linearRampToValueAtTime(0.016, now + 1.0);
  noiseSrc.connect(hp).connect(lp).connect(ng);

  // Master lo-fi filtre — sıcaklık için
  const loFiFilter = ctx.createBiquadFilter();
  loFiFilter.type = 'lowpass';
  loFiFilter.frequency.value = 1100;
  loFiFilter.Q.value = 0.4;

  g1.connect(loFiFilter);
  g2.connect(loFiFilter);
  g3.connect(loFiFilter);
  ng.connect(loFiFilter);
  loFiFilter.connect(loFiGain!);

  o1.start(now);
  o2.start(now);
  o3.start(now);
  lfo.start(now);
  noiseSrc.start(now);

  loFiNodes = [o1, g1, o2, g2, o3, g3, lfo, lfoGain, noiseSrc, hp, lp, ng, loFiFilter];
  isStarted = true;
}

function stopLoFi() {
  if (!isStarted) return;
  try {
    for (const n of loFiNodes) {
      try {
        if ('stop' in n) (n as OscillatorNode | AudioBufferSourceNode).stop();
        n.disconnect();
      } catch {}
    }
  } catch {}
  loFiNodes = [];
  isStarted = false;
}

function ensureDrone(ctx: AudioContext, freq: number | null) {
  // mevcut drone temizle
  if (droneOsc) {
    try { droneOsc.stop(); droneOsc.disconnect(); } catch {}
    droneOsc = null;
  }
  if (freq == null) {
    if (droneGain) droneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
    return;
  }
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // yumuşak LPF — sert harmonik yok
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1200;
  osc.connect(lp).connect(droneGain!);
  osc.start();
  droneOsc = osc;
  // mix'e göre fade in
  const mix = useRelaxStore.getState().droneMix;
  if (droneGain) {
    const now = ctx.currentTime;
    droneGain.gain.cancelScheduledValues(now);
    droneGain.gain.setValueAtTime(droneGain.gain.value, now);
    droneGain.gain.linearRampToValueAtTime(mix * 0.28, now + 0.6);
  }
}

export function useRelaxAudio(): void {
  const isPlaying = useRelaxStore((s) => s.isPlaying);
  const loFiVolume = useRelaxStore((s) => s.loFiVolume);
  const droneFreq = useRelaxStore((s) => s.droneFreq);
  const droneMix = useRelaxStore((s) => s.droneMix);
  const ctxRef = useRef<AudioContext | null>(null);

  // İlk etkileşimde unlock — UI seslerinden bağımsız ayrı context
  useEffect(() => {
    const resume = () => {
      if (relaxCtx && relaxCtx.state === 'suspended') relaxCtx.resume().catch(() => {});
    };
    window.addEventListener('click', resume, { passive: true });
    window.addEventListener('keydown', resume, { passive: true });
    return () => {
      window.removeEventListener('click', resume);
      window.removeEventListener('keydown', resume);
    };
  }, []);

  // isPlaying değişince başlat/durdur
  useEffect(() => {
    if (isPlaying) {
      const ctx = getRelaxCtx();
      if (!ctx) return;
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();
      const st = useRelaxStore.getState();
      if (masterGain) masterGain.gain.linearRampToValueAtTime(st.loFiVolume, ctx.currentTime + 0.25);
      startLoFi(ctx);
      ensureDrone(ctx, st.droneFreq);
    } else {
      // fade out sonra stop
      if (relaxCtx && masterGain) {
        const ctx = relaxCtx;
        const now = ctx.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.linearRampToValueAtTime(0, now + 0.35);
        setTimeout(() => {
          stopLoFi();
          if (droneOsc) { try { droneOsc.stop(); droneOsc.disconnect(); } catch {} droneOsc = null; }
        }, 380);
      } else {
        stopLoFi();
      }
    }
  }, [isPlaying]);

  // loFiVolume -> masterGain
  useEffect(() => {
    if (!masterGain || !relaxCtx) return;
    const now = relaxCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(isPlaying ? loFiVolume : 0, now + 0.15);
  }, [loFiVolume, isPlaying]);

  // droneMix -> droneGain
  useEffect(() => {
    if (!droneGain || !relaxCtx || droneFreq == null) return;
    const now = relaxCtx.currentTime;
    droneGain.gain.cancelScheduledValues(now);
    droneGain.gain.setValueAtTime(droneGain.gain.value, now);
    droneGain.gain.linearRampToValueAtTime(droneMix * 0.28, now + 0.2);
  }, [droneMix, droneFreq]);

  // droneFreq değişince oscillator yenile
  useEffect(() => {
    if (!isPlaying) return;
    const ctx = relaxCtx;
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    ensureDrone(ctx, droneFreq);
  }, [droneFreq, isPlaying]);

  // Uygulama kapanırken temizle
  useEffect(() => {
    const onBeforeUnload = () => {
      stopLoFi();
      if (droneOsc) { try { droneOsc.stop(); } catch {} }
      if (relaxCtx) { try { void relaxCtx.close(); } catch {} }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);
}
