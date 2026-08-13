import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  title: string;
  desc: string;
  hint: string;
  icon: string;
}

const STEPS: Step[] = [
  { title: 'Command Palette', desc: 'Tek bir kısayolla sekmelerde ara, geçmiş ve yer imlerine ulaş, koruma panelini aç.', hint: 'Ctrl + K', icon: '⌘' },
  { title: 'Panik Tuşu', desc: 'Acil durumda tek tuşla tüm sekmeleri kapat ve depolamayı temizle.', hint: 'Ctrl+Shift+X', icon: '⚡' },
];

interface WelcomeTourProps {
  onDone: () => void;
  onSkip: () => void;
}

export function WelcomeTour({ onDone, onSkip }: WelcomeTourProps) {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx]!;

  const next = () => {
    if (idx >= STEPS.length - 1) onDone();
    else setIdx((i) => i + 1);
  };

  // Mantık değişmedi — yalnızca görsel katman
  return (
    <div className="fixed inset-0 z-[500] grid place-items-center p-4">
      {/* Spotlight katmanı: koyu örtü + hedef etrafında yumuşak aydınlık */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        aria-hidden
      />
      {/* Yumuşak spotlight halesi — merkeze odaklı dekoratif */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
        style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.35) 0%, transparent 70%)' }}
        aria-hidden
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="glass relative w-[min(440px,92vw)] overflow-hidden rounded-[20px] border border-white/10 p-6 shadow-2xl"
        >
          {/* Üst brand çizgisi */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" aria-hidden />

          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-base shadow-glow">{step.icon}</span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-brand">Hoş geldin</p>
                <h3 className="text-[15px] font-semibold leading-none text-fg">{step.title}</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-fg-muted transition hover:bg-white/10 hover:text-fg"
            >
              Geç
            </button>
          </div>

          <p className="text-sm leading-relaxed text-fg-muted">{step.desc}</p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/10 px-3 py-2">
            <span className="text-xs font-medium text-brand">{step.hint}</span>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-brand' : i < idx ? 'w-1.5 bg-brand/50' : 'w-1.5 bg-white/15'}`}
                  aria-hidden
                />
              ))}
              <span className="ml-2 text-xs tabular-nums text-fg-subtle">{idx + 1}/{STEPS.length}</span>
            </div>
            <div className="flex items-center gap-2">
              {idx > 0 && (
                <button type="button" onClick={() => setIdx((i) => i - 1)} className="rounded-xl border border-white/10 px-3.5 py-1.5 text-xs text-fg-muted hover:bg-white/5 hover:text-fg">Geri</button>
              )}
              <button type="button" onClick={next} className="rounded-xl bg-brand px-5 py-1.5 text-xs font-semibold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.98]">
                {idx === STEPS.length - 1 ? 'Başla' : 'İleri'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
