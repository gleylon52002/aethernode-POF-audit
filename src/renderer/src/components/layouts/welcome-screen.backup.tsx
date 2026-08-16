import { useState } from 'react';
import { useSettings } from '@renderer/store/settings';
import { Shield, FingerprintIcon, Lock, Security } from '@renderer/components/ui/icons';
import type { ComponentType, SVGProps } from 'react';

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

interface Slide {
  eyebrow: string;
  title: string;
  line: string;
  Icon: IconComp;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'Hoş geldin',
    title: 'İnternet, sessizce daha güvenli.',
    line: 'AetherNode; izleyici, reklam ve sızıntılara karşı varsayılan olarak korur.',
    Icon: Shield,
    accent: 'rgba(52,211,153,0.14)',
  },
  {
    eyebrow: 'Gizlilik',
    title: 'Parmak izini karıştırır.',
    line: 'Siteler donanım, saat dilimi veya font sorduğunda rastgele ama tutarlı bir profil görür.',
    Icon: FingerprintIcon,
    accent: 'rgba(96,165,250,0.14)',
  },
  {
    eyebrow: 'Güvenlik',
    title: 'Banka sitelerinde ekstra kalkan.',
    line: 'Finans siteleri algılanınca oturum izole edilir; pano ve konum kilitlenir.',
    Icon: Lock,
    accent: 'rgba(250,204,21,0.12)',
  },
  {
    eyebrow: 'Odak',
    title: 'Dikkat dağıtıcılar susar.',
    line: 'Deep Focus, okuyucu modu ve çerez bildirimlerini otomatik reddetme — sen gezinmeye bak.',
    Icon: Security,
    accent: 'rgba(167,139,250,0.12)',
  },
];

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const total = SLIDES.length + 1;
  const onFinal = step >= SLIDES.length;
  const slide = SLIDES[step];

  const go = (next: number) => {
    setStep(next);
    setAnimKey((k) => k + 1);
  };

  const finish = async () => {
    try {
      await useSettings.getState().apply({
        ...useSettings.getState().settings,
        general: { ...useSettings.getState().settings.general, hasSeenWelcomeScreen: true },
      });
    } catch {}
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center overflow-hidden bg-[#0B0B0F]">
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 18%, ${
            onFinal ? 'rgba(52,211,153,0.08)' : slide?.accent ?? 'rgba(52,211,153,0.08)'
          }, transparent 55%)`,
        }}
      />

      <div className="relative flex w-full max-w-sm flex-col px-6" key={animKey}>
        <div style={{ animation: 'anOnboardIn 380ms ease-out both' }}>
          {!onFinal && slide ? (
            <>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <slide.Icon className="h-5 w-5 text-white/80" />
              </div>
              <p className="text-[11px] font-medium tracking-[0.16em] text-white/35 uppercase">
                {slide.eyebrow}
              </p>
              <h1 className="mt-2 text-[1.25rem] font-semibold leading-snug tracking-tight text-white">
                {slide.title}
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-white/45">{slide.line}</p>

              <button
                type="button"
                onClick={() => go(step + 1)}
                className="mt-8 w-full rounded-xl bg-white py-2.5 text-[13px] font-semibold text-black transition hover:bg-white/92 active:scale-[0.99]"
              >
                {step === 0 ? 'Keşfet' : 'Devam'}
              </button>
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => go(step - 1)}
                  className="mt-2 w-full py-2 text-[12px] text-white/35 transition hover:text-white/55"
                >
                  Geri
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go(SLIDES.length)}
                  className="mt-2 w-full py-2 text-[12px] text-white/30 transition hover:text-white/50"
                >
                  Atla
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-[11px] font-medium tracking-[0.18em] text-white/35">AETHERNODE</p>
              <h1 className="mt-3 text-[1.35rem] font-semibold leading-snug tracking-tight text-white">
                Hazırsın.
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-white/45">
                Koruma açık. Bir tıkla başla.
              </p>

              <button
                type="button"
                onClick={() => void finish()}
                className="mt-8 w-full rounded-xl bg-white py-2.5 text-[13px] font-semibold text-black transition hover:bg-white/92 active:scale-[0.99]"
              >
                Başla
              </button>

              <button
                type="button"
                onClick={() => go(SLIDES.length - 1)}
                className="mt-3 w-full py-2 text-[12px] text-white/30 transition hover:text-white/50"
              >
                Geri
              </button>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? 'w-4 bg-white/70' : i < step ? 'w-1.5 bg-white/35' : 'w-1.5 bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes anOnboardIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
