import { useState, useEffect, useRef } from 'react';
import { useTabs } from '@renderer/store/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from '@renderer/components/ui/icons';

// 3 saniye basılı tutarak çıkış yapılır
const EXIT_HOLD_MS = 3000;

export function CamouflageOverlay({
  active,
  onExit,
}: {
  active: boolean;
  onExit: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const pressTimer = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const animationFrame = useRef<number | null>(null);

  // Sesleri kes (Mute all active tabs)
  const tabs = useTabs((s) => s.tabs);
  const toggleMute = useTabs((s) => s.toggleMute);
  
  useEffect(() => {
    if (active) {
      // Aktif sekmede çalan tüm sesleri kıs
      tabs.forEach(t => {
        if (!t.muted) toggleMute(t.id);
      });
    }
  }, [active]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.key === 'Escape') {
        if (!pressTimer.current) {
          startTime.current = Date.now();
          const tick = () => {
            const elapsed = Date.now() - startTime.current;
            setProgress(Math.min(100, (elapsed / EXIT_HOLD_MS) * 100));
            if (elapsed >= EXIT_HOLD_MS) {
              onExit();
              setProgress(0);
            } else {
              animationFrame.current = requestAnimationFrame(tick);
            }
          };
          pressTimer.current = window.setTimeout(() => {}, EXIT_HOLD_MS);
          animationFrame.current = requestAnimationFrame(tick);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.key === 'Escape') {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
        pressTimer.current = null;
        animationFrame.current = null;
        setProgress(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [active, onExit]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center text-black"
        >
          {/* Sahte Wikipedia Görünümü veya boş sayfa */}
          <webview
            src="https://tr.wikipedia.org/wiki/Özel:Rastgele"
            className="w-full h-full border-none"
            webpreferences="contextIsolation=yes"
          />
          <div className="absolute inset-0 z-10" /> {/* Webview'in odak çalmasını engeller */}
          
          <div className="absolute top-4 right-4 flex items-center gap-3 bg-black/80 text-white px-4 py-2 rounded-full shadow-2xl backdrop-blur-md">
            <span className="text-sm font-medium">Çıkmak için ESC'ye basılı tut</span>
            <div className="w-8 h-8 relative flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 absolute" viewBox="0 0 36 36">
                <path
                  className="text-white/20"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-brand transition-all duration-75"
                  strokeWidth="3"
                  strokeDasharray={`${progress}, 100`}
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Globe className="w-3.5 h-3.5 absolute text-white" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
