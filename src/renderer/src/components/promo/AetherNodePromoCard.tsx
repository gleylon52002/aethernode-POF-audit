import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabs } from '@renderer/store/tabs';
import { showToast } from '@renderer/components/layouts/toast-bus';

const DISMISS_KEY = 'aether.vpnPromoDismissed';
const COUPON = 'browser';

export function AetherNodePromoCard({ onClose }: { onClose?: () => void }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const [copied, setCopied] = useState(false);

  if (dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setDismissed(true);
    onClose?.();
  };

  const openOffer = () => {
    useTabs.getState().open('https://aethernodevpn.com/kupon-lisans/');
  };

  const copyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(COUPON);
      setCopied(true);
      showToast('Kupon kopyalandı: browser', 'success', 1800);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('Kopyalanamadı', 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[24px] border border-emerald-500/20 bg-gradient-to-br from-[#0f1f18] via-[#101a14] to-[#0f1419] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(16,185,129,0.12)]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden />
      <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" aria-hidden />
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/60 backdrop-blur transition hover:bg-white/10 hover:text-white"
        aria-label="Kapat"
      >
        ×
      </button>

      <div className="pr-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-emerald-300">RAM-Only</span>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-emerald-300">Kill Switch</span>
          <span className="animate-pulse rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold tracking-wide text-white shadow-[0_4px_12px_rgba(16,185,129,0.4)]">90 gün ücretsiz</span>
        </div>

        <h3 className="mt-5 flex items-center gap-2.5 text-xl font-bold tracking-tight text-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">◈</span>
          AetherNode Pro VPN
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Gizliliğini bir üst seviyeye taşı — RAM-Only sunucular, Kill Switch ve sınırsız hız.
        </p>

        <motion.button
          type="button"
          onClick={copyCoupon}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-white px-4 py-3 text-left shadow-lg transition hover:border-emerald-500/50 hover:shadow-[0_8px_24px_rgba(16,185,129,0.2)]"
        >
          <span className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">Kupon kodu — tıkla kopyala</span>
            <span className="font-mono text-lg font-black tracking-[0.2em] text-emerald-700">{COUPON}</span>
          </span>
          <span className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-bold transition ${copied ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-600'}`}>
            {copied ? '✓' : '⎘'}
          </span>
        </motion.button>

        <motion.button
          type="button"
          onClick={openOffer}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] transition hover:bg-emerald-600"
        >
          90 Gün Ücretsiz VPN almak için tıklayın →
        </motion.button>

        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full text-center text-xs font-medium text-white/40 underline decoration-white/20 underline-offset-2 hover:text-white/70"
        >
          Sonra
        </button>
      </div>
    </motion.div>
  );
}

export function VpnPromoOverlay() {
  const DISMISS_DATE_KEY = 'aether.vpnPromoDismissedDate';
  const today = new Date().toISOString().slice(0, 10);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_DATE_KEY) === today;
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (dismissed) return;
    const t = window.setTimeout(() => setShow(true), 900);
    return () => window.clearTimeout(t);
  }, [dismissed]);
  if (!show || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_DATE_KEY, today);
    } catch {}
    setShow(false);
    setDismissed(true);
  };
  const openOffer = () => {
    useTabs.getState().open('https://aethernodevpn.com/kupon-lisans/');
  };
  const copyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(COUPON);
      setCopied(true);
      showToast('Kupon kopyalandı: browser', 'success', 1500);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('Kopyalanamadı', 'error');
    }
  };
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-5 right-5 z-[400] w-[min(400px,92vw)] overflow-hidden rounded-[18px] border border-emerald-500/20 bg-gradient-to-br from-[#0e1f1a]/95 via-[#0f1419]/90 to-[#101a2a]/90 px-5 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.45),0_0_28px_rgba(16,185,129,0.14)] backdrop-blur-xl"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" aria-hidden />
        <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-500/15 blur-2xl" aria-hidden />
        <div className="flex items-center gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">◈</div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold tracking-tight text-white">90 gün ücretsiz VPN</p>
            <button
              type="button"
              onClick={copyCoupon}
              className="mt-1 flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold tracking-widest text-emerald-700 shadow-sm transition hover:bg-emerald-50"
              title="Tıkla kopyala"
            >
              <span className="font-mono">{COUPON}</span>
              <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${copied ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-600'}`}>{copied ? '✓' : '⎘'}</span>
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <motion.button
              type="button"
              onClick={openOffer}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition hover:bg-emerald-600"
            >
              Al
            </motion.button>
            <button
              type="button"
              onClick={dismiss}
              className="grid h-7 w-7 place-items-center rounded-full bg-white/5 text-white/40 backdrop-blur transition hover:bg-white/10 hover:text-white"
              aria-label="Kapat"
            >
              ×
            </button>
          </div>
        </div>
        <p className="mt-2.5 text-center text-[10px] font-medium tracking-wide text-white/30">RAM-Only · Kill Switch · farklı arkaplan</p>
      </motion.div>
    </AnimatePresence>
  );
}
