import { useState, useEffect } from 'react';
import { useSettings } from '@renderer/store/settings';
import { playUiSound } from '@renderer/hooks/use-sound';
import { motion, AnimatePresence } from 'framer-motion';

interface Scene {
  title: string;
  subtitle: string;
  tag: string;
}

const SCENES: Scene[] = [
  {
    tag: 'BAŞLANGIÇ',
    title: 'AetherNode',
    subtitle: 'Sessizce daha güvenli bir internet.',
  },
  {
    tag: 'GİZLİLİK',
    title: 'Görünmez Kalkan',
    subtitle: 'İzleyiciler ve reklamlar yok. Sıfır telemetri.',
  },
  {
    tag: 'ODAK',
    title: 'Özgür Zihin',
    subtitle: 'İzole çalışma alanları ve çift yönlü notlar.',
  },
  {
    tag: 'HAZIR',
    title: 'Hazırsınız.',
    subtitle: 'Tüm korumalar devrede. Keşfetmeye başlayın.',
  },
];

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const applySettings = useSettings((s) => s.apply);
  const settings = useSettings((s) => s.settings);

  const isFinal = step === SCENES.length - 1;
  const currentScene = SCENES[step]!;

  const goNext = () => {
    if (isFinal) {
      void finish();
    } else {
      try {
        playUiSound('primaryClick');
      } catch {}
      setStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) {
      try {
        playUiSound('primaryClick');
      } catch {}
      setStep((s) => s - 1);
    }
  };

  const finish = async () => {
    try {
      playUiSound('downloadDone');
    } catch {}
    try {
      await applySettings({
        ...settings,
        general: {
          ...settings.general,
          hasSeenWelcomeScreen: true,
        },
      });
    } catch {}
    onDone();
  };

  // Klavye ile akıcı kontrol
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        void finish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, isFinal]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between overflow-hidden bg-[#08080A] px-6 py-12 select-none">
      {/* 1. Monochromatic Ambient Background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            opacity: [0.06, 0.12, 0.06],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="h-[550px] w-[550px] rounded-full bg-white blur-[150px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* 2. Üst Minimalist Bilgi & Atla */}
      <div className="relative z-10 flex w-full max-w-2xl items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" />
          <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
            {currentScene.tag}
          </span>
        </div>

        <button
          type="button"
          onClick={() => void finish()}
          className="text-[11px] font-medium tracking-wide text-white/30 transition-colors hover:text-white/70"
        >
          Atla (Esc)
        </button>
      </div>

      {/* 3. Merkezi Pixar Tarzı Kusursuz Geometrik Dönüşüm Sahnesi */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto">
        <div className="relative mb-10 flex h-48 w-48 items-center justify-center">
          {/* Sahne 0: Nefes Alan Çekirdek ve Yörünge */}
          {step === 0 && (
            <motion.div
              key="shape-0"
              initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                className="absolute h-40 w-40 rounded-full border border-dashed border-white/20"
              />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute h-28 w-28 rounded-full border border-white/30 bg-white/[0.02]"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="h-10 w-10 rounded-full bg-white shadow-[0_0_40px_rgba(255,255,255,0.7)]"
              />
            </motion.div>
          )}

          {/* Sahne 1: Kalkan ve Genişleyen Radar Dalgaları */}
          {step === 1 && (
            <motion.div
              key="shape-1"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 2.2],
                    opacity: [0.4, 0],
                  }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    delay: i * 0.8,
                    ease: 'easeOut',
                  }}
                  className="absolute h-20 w-20 rounded-full border border-white/30"
                />
              ))}
              <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-white/40 bg-white/[0.06] backdrop-blur-md shadow-[0_0_50px_rgba(255,255,255,0.2)]">
                <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </motion.div>
          )}

          {/* Sahne 2: Kusursuz Matematiksel 3 Düğümlü Takımyıldızı (Çizim Hatası Tamamen Düzeltildi) */}
          {step === 2 && (
            <motion.div
              key="shape-2"
              initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="relative h-40 w-40 flex items-center justify-center"
              >
                {/* 100% Matematiksel olarak düğüm merkezlerine kenetlenen kusursuz SVG */}
                <svg className="h-full w-full" viewBox="0 0 160 160" fill="none">
                  {/* Dış yörünge çemberi */}
                  <circle cx="80" cy="80" r="52" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
                  
                  {/* Merkezden düğümlere lazer bağlantı telleri */}
                  <line x1="80" y1="80" x2="80" y2="28" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                  <line x1="80" y1="80" x2="125" y2="106" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                  <line x1="80" y1="80" x2="35" y2="106" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

                  {/* Düğümleri birbirine bağlayan kenet üçgen */}
                  <polygon
                    points="80,28 125,106 35,106"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    fill="rgba(255,255,255,0.02)"
                  />

                  {/* Düğüm 1 (Üst) */}
                  <circle cx="80" cy="28" r="9" fill="#12121A" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
                  <circle cx="80" cy="28" r="3" fill="#FFFFFF" />

                  {/* Düğüm 2 (Sağ Alt) */}
                  <circle cx="125" cy="106" r="9" fill="#12121A" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
                  <circle cx="125" cy="106" r="3" fill="#FFFFFF" />

                  {/* Düğüm 3 (Sol Alt) */}
                  <circle cx="35" cy="106" r="9" fill="#12121A" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
                  <circle cx="35" cy="106" r="3" fill="#FFFFFF" />
                </svg>

                {/* Merkez Nexus */}
                <div className="absolute h-3 w-3 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.9)]" />
              </motion.div>
            </motion.div>
          )}

          {/* Sahne 3: Hedefe Kilitlenen Kristal Netlik */}
          {step === 3 && (
            <motion.div
              key="shape-3"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: 180 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute h-36 w-36 rounded-full border border-white/20"
              />
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/60 bg-white text-black shadow-[0_0_60px_rgba(255,255,255,0.4)]">
                <svg className="h-8 w-8 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
            </motion.div>
          )}
        </div>

        {/* Başlık ve Akıcı Yazı Metinleri */}
        <div className="h-24 max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${step}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {currentScene.title}
              </h1>
              <p className="mt-2.5 text-sm font-normal text-white/50 leading-relaxed">
                {currentScene.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 4. Alt Minimalist Kontroller & İlerleme Noktaları */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          {SCENES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                try {
                  playUiSound('primaryClick');
                } catch {}
                setStep(i);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 bg-white shadow-[0_0_10px_white]'
                  : i < step
                  ? 'w-1.5 bg-white/40'
                  : 'w-1.5 bg-white/15 hover:bg-white/25'
              }`}
            />
          ))}
        </div>

        <div className="flex w-full items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={goPrev}
              className="h-11 rounded-full border border-white/10 px-5 text-xs font-medium text-white/50 transition-colors hover:border-white/20 hover:text-white"
            >
              Geri
            </button>
          )}

          <button
            type="button"
            onClick={goNext}
            className="flex-1 h-11 rounded-full bg-white text-black font-semibold text-xs tracking-wide shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all hover:bg-white/90 active:scale-[0.98]"
          >
            {isFinal ? 'Başla' : 'İleri'}
          </button>
        </div>
      </div>
    </div>
  );
}
