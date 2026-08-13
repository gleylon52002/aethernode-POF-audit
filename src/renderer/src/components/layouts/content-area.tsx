import { useTabs } from '@renderer/store/tabs';
import { resolveInternalRoute, InternalPage } from '@renderer/router';
import { WebviewStack } from './webview-stack';
import { useEffect } from 'react';
import { Close, Columns } from '@renderer/components/ui/icons';
import { motion, AnimatePresence } from 'framer-motion';

// İçerik alanı: WebviewStack HER ZAMAN mount kalır — aksi halde dahili
// sayfaya geçince tüm webview'lar yok olur ve YouTube müziği kesilir.
// Split view: iki sekme yan yana (Ctrl+Shift+L / Ctrl+\).
export function ContentArea() {
  const active = useTabs((s) => s.tabs.find((t) => t.id === s.activeId) ?? s.tabs[0]);
  const split = useTabs((s) => s.tabs.find((t) => t.id === s.splitId));
  const splitId = useTabs((s) => s.splitId);
  const activate = useTabs((s) => s.activate);
  const setSplit = useTabs((s) => s.setSplit);
  const swapSplit = useTabs((s) => s.swapSplit);

  useEffect(() => {
    const state = useTabs.getState();
    if (!state.activeId && state.tabs[0]) activate(state.tabs[0].id);
  }, [active, activate]);

  if (!active) {
    return (
      <div className="grid h-full w-full place-items-center text-fg-subtle">
        Sekme seçili değil
      </div>
    );
  }

  const primary = resolveInternalRoute(active.url);
  const secondary = split ? resolveInternalRoute(split.url) : null;
  const splitOn = !!(splitId && split && splitId !== active.id);

  return (
    <div className="relative h-full w-full">
      <div
        className="absolute inset-0 h-full w-full"
        style={{
          visibility: primary.internal && !splitOn ? 'hidden' : 'visible',
          pointerEvents: primary.internal && !splitOn ? 'none' : 'auto',
        }}
        aria-hidden={primary.internal && !splitOn}
      >
        <WebviewStack />
      </div>

      {/* Sol dahili sayfa overlay */}
      {primary.internal && (
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id + active.url}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`absolute top-0 z-10 h-full overflow-y-auto bg-bg-base ${
              splitOn ? 'left-0 w-1/2' : 'inset-0'
            }`}
          >
            <InternalPage url={active.url} tabId={active.id} />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Sağ dahili sayfa overlay (split) */}
      {splitOn && secondary?.internal && split && (
        <div className="absolute right-0 top-0 z-10 h-full w-1/2 overflow-y-auto border-l border-white/10 bg-bg-base">
          <InternalPage url={split.url} tabId={split.id} />
        </div>
      )}

      {/* Split kontrol çubuğu — sağ panelin üstünde her zaman görünür */}
      {splitOn && split && (
        <div className="absolute right-2 top-2 z-30 flex max-w-[46%] items-center gap-1 rounded-full border border-white/15 bg-black/70 py-1 pl-3 pr-1 shadow-xl backdrop-blur-xl">
          <Columns className="h-3 w-3 shrink-0 text-brand" />
          <span className="min-w-0 truncate text-[11px] text-fg-muted" title={split.title}>
            {split.title || 'Sekme'}
          </span>
          <button
            type="button"
            onClick={() => swapSplit()}
            title="Panelleri yer değiştir"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-white/10 hover:text-fg"
            aria-label="Panelleri yer değiştir"
          >
            <span className="text-[12px] leading-none">⇄</span>
          </button>
          <button
            type="button"
            onClick={() => setSplit(null)}
            title="Split view'i kapat"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-white/10 hover:text-fg"
            aria-label="Split view'i kapat"
          >
            <Close className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
