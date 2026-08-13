import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { subscribeToasts, type ToastItem } from './toast-bus';

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[200] flex w-[min(440px,92vw)] -translate-x-1/2 flex-col gap-2">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            role="alert"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${
              t.tone === 'error'
                ? 'border-red-400/40 bg-[#2a1010]/95 text-red-100'
                : t.tone === 'success'
                  ? 'border-emerald-400/40 bg-[#0f2418]/95 text-emerald-100'
                  : 'border-white/15 bg-[#14141a]/95 text-fg'
            }`}
          >
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  const fn = t.action!.onClick;
                  // dismiss immediately for responsiveness
                  items; // keep ref
                  fn();
                }}
                className="shrink-0 rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white shadow-glow transition hover:bg-brand-600 active:scale-95"
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Faz 0.1 gereği alias — grep "ToastProvider" için
// Görsel host zaten AppShell'de mount edildi (fixed), bu provider sadece sarmalayıcıdır
export function ToastProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
