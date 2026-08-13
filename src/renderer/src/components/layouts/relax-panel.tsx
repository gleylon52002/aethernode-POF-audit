import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRelaxStore } from '@renderer/store/relax';
import { useRelaxAudio } from '@renderer/hooks/use-relax-audio';
import { WavesIcon, PauseIcon, PlayIcon, HeadphonesIcon } from '@renderer/components/ui/icons';
import { Tooltip } from '@renderer/components/ui';

export const RELAX_EVENT = 'aether:relax-panel';

export const FREQUENCIES: Array<{ hz: number; label: string }> = [
  { hz: 40, label: 'Odaklanma ambiyansı' },
  { hz: 174, label: 'Gevşeme ambiyansı' },
  { hz: 285, label: 'Sakinleştirici ton' },
  { hz: 396, label: 'Gerginlik azaltma ambiyansı' },
  { hz: 417, label: 'Rahatlama ambiyansı' },
  { hz: 432, label: 'Rahatlatıcı ton' },
  { hz: 440, label: 'Standart referans ton' },
  { hz: 512, label: 'Meditatif ton' },
  { hz: 528, label: 'Sakinleştirici ambiyans' },
  { hz: 639, label: 'Sosyal/duygusal rahatlama ambiyansı' },
  { hz: 741, label: 'Zihinsel netlik ambiyansı' },
  { hz: 852, label: 'Meditasyon ambiyansı' },
  { hz: 963, label: 'Derin meditasyon ambiyansı' },
];

// Mood -> önerilen frekans (nötr eşleşme, tıbbi iddia yok)
const MOODS: Array<{ label: string; hz: number; hint: string }> = [
  { label: 'Odaklan', hz: 40, hint: 'Odaklanma ambiyansı' },
  { label: 'Rahatla', hz: 174, hint: 'Gevşeme ambiyansı' },
  { label: 'Sakinleş', hz: 285, hint: 'Sakinleştirici ton' },
  { label: 'Gerginlik Azalt', hz: 396, hint: 'Gerginlik azaltma' },
  { label: 'Uyu', hz: 852, hint: 'Meditasyon ambiyansı' },
  { label: 'Meditasyon', hz: 512, hint: 'Meditatif ton' },
];

export function RelaxPanel() {
  const [open, setOpen] = useState(false);
  useRelaxAudio();

  const isPlaying = useRelaxStore((s) => s.isPlaying);
  const loFiVolume = useRelaxStore((s) => s.loFiVolume);
  const droneFreq = useRelaxStore((s) => s.droneFreq);
  const droneMix = useRelaxStore((s) => s.droneMix);
  const selectedMood = useRelaxStore((s) => s.selectedMood);
  const setPlaying = useRelaxStore((s) => s.setPlaying);
  const setLoFiVolume = useRelaxStore((s) => s.setLoFiVolume);
  const setDroneFreq = useRelaxStore((s) => s.setDroneFreq);
  const setDroneMix = useRelaxStore((s) => s.setDroneMix);
  const setSelectedMood = useRelaxStore((s) => s.setSelectedMood);
  const toggle = useRelaxStore((s) => s.toggle);

  useEffect(() => {
    const on = () => setOpen((v) => !v);
    window.addEventListener(RELAX_EVENT, on);
    return () => window.removeEventListener(RELAX_EVENT, on);
  }, []);

  // Dışarıdan mini kontrol için global event dinle (panel kapalı olsa da ses devam eder)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[6px]" onClick={() => setOpen(false)} aria-hidden />
      <div className="relative flex max-h-[88vh] w-[min(640px,96vw)] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#0f0f14]/95 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4">
          <div className="flex gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand">
              <WavesIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-fg">Kendini Rahatlat</h2>
              <p className="mt-0.5 max-w-[380px] text-[11.5px] leading-relaxed text-fg-subtle">
                Sakinleştirici bir lo-fi ambiyansı ve ruh haline göre eşlik eden ton seç. Bu tonlar rahatlama amaçlı bir
                ambiyans katmanıdır, tıbbi bir etkisi kanıtlanmamıştır.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-fg"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {/* Lo-fi controls */}
          <section className="mb-5 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Lo-fi Ambiyans</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isPlaying ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-fg-subtle'}`}>
                {isPlaying ? 'Çalıyor' : 'Durduruldu'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggle()}
                className={`grid h-11 w-11 place-items-center rounded-xl text-white shadow-lg transition ${isPlaying ? 'bg-brand' : 'bg-white/10 hover:bg-white/15'}`}
                aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
              >
                {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
              </button>
              <div className="flex-1">
                <label className="mb-1 block text-[11px] text-fg-subtle">Ses seviyesi — {Math.round(loFiVolume * 100)}%</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={loFiVolume}
                  onChange={(e) => setLoFiVolume(Number(e.target.value))}
                  className="h-1 w-full accent-brand"
                />
              </div>
              <button
                type="button"
                onClick={() => setPlaying(false)}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-fg-muted hover:bg-white/5"
              >
                Durdur
              </button>
            </div>
            <p className="mt-2 text-[11px] text-fg-subtle">
              Prosedürel olarak üretilen yumuşak ambiyans (düşük frekanslı katmanlar + hafif vinil hışırtısı). Telifsiz, dosya indirmeden.
            </p>
          </section>

          {/* Mood selector */}
          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              Şu an nasıl hissediyorsun / ne istiyorsun?
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {MOODS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => {
                    setSelectedMood(m.label);
                    setDroneFreq(m.hz);
                    if (!isPlaying) setPlaying(true);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    selectedMood === m.label && droneFreq === m.hz
                      ? 'border-brand bg-brand/15 text-brand'
                      : 'border-white/10 bg-white/5 text-fg hover:border-white/15 hover:text-fg'
                  }`}
                >
                  {m.label} <span className="ml-1 text-[10px] opacity-60">· {m.hint}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setSelectedMood(null); }}
                className="rounded-full border border-white/5 px-2.5 py-1.5 text-[11px] text-fg-subtle hover:bg-white/5"
              >
                Temizle
              </button>
            </div>
          </section>

          {/* Frequency selector */}
          <section className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Arka plan tonu / drone</h3>
              <Tooltip label="Bu tonlar yalnızca ambiyans katmanıdır — tıbbi tedavi iddiası değildir. Rahatlama/meditasyon amaçlı düşük seviyede lo-fi ile karıştırılır.">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-white/10 text-[10px] text-fg-subtle">i</span>
              </Tooltip>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.hz}
                  type="button"
                  onClick={() => {
                    if (droneFreq === f.hz) setDroneFreq(null);
                    else {
                      setDroneFreq(f.hz);
                      if (!isPlaying) setPlaying(true);
                    }
                  }}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                    droneFreq === f.hz ? 'border-brand/40 bg-brand/10' : 'border-white/5 bg-black/20 hover:border-white/10'
                  }`}
                >
                  <span className={`text-xs ${droneFreq === f.hz ? 'text-brand' : 'text-fg'}`}>
                    {f.label}
                  </span>
                  <span className={`rounded bg-white/5 px-1.5 py-0.5 text-[10px] ${droneFreq === f.hz ? 'text-brand' : 'text-fg-subtle'}`}>
                    {f.hz} Hz
                  </span>
                </button>
              ))}
            </div>
            {droneFreq != null && (
              <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-500/5 px-3 py-2.5">
                <label className="mb-1 block text-[11px] text-amber-200/80">Karışım — drone seviyesi {Math.round(droneMix * 100)}%</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={droneMix}
                  onChange={(e) => setDroneMix(Number(e.target.value))}
                  className="h-1 w-full accent-amber-500"
                />
                <p className="mt-1 text-[11px] text-amber-200/60">Drone, lo-fi altında düşük seviyede karışır — seviye ile dengelenir.</p>
              </div>
            )}
          </section>

          {/* Headphone warning */}
          {droneFreq != null && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-sky-400/15 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
              <HeadphonesIcon className="h-4 w-4 shrink-0" />
              <span>Kulaklıkla dinlenmesi önerilir.</span>
              <span className="ml-auto text-[11px] text-sky-200/70">Düşük volümde — uzun süre yüksek ses önerilmez.</span>
            </div>
          )}

          <p className="mt-3 text-center text-[11px] text-fg-subtle">
            Panel kapansa bile ses çalmaya devam eder — durdurmak için üstteki Durdur butonunu kullan.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
