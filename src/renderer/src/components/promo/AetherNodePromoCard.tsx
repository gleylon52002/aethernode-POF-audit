import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabs } from '@renderer/store/tabs';
import { showToast } from '@renderer/components/layouts/toast-bus';
import { Shield, Sparkles, X, Copy, Check } from 'lucide-react';

const DISMISS_KEY = 'aether.vpnPromoDismissed';
const COUPON = 'browser';

export function AetherNodePromoCard({ onClose }: { onClose?: () => void }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
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
      className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#0F1713]/95 p-6 shadow-2xl backdrop-blur-2xl"
    >
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3.5 top-3.5 grid h-7 w-7 place-items-center rounded-full bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
        aria-label="Kapat"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="pr-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
            AetherNode Pro VPN
          </span>
          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-black">
            7 Gün Ücretsiz
          </span>
        </div>

        <h3 className="mt-3 text-base font-bold text-white flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <span>RAM-Only Gizlilik & Sınırsız Hız</span>
        </h3>
        <p className="mt-1 text-xs text-white/60 leading-relaxed">
          Kayıt tutmayan askeri şifreleme ve Kill Switch koruması.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={copyCoupon}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors"
            title="Kuponu kopyala"
          >
            <span className="text-white/40">Kupon:</span>
            <span className="font-mono font-bold text-emerald-400">{COUPON}</span>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-white/50" />}
          </button>

          <button
            type="button"
            onClick={openOffer}
            className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.98] transition-all text-center"
          >
            7 Gün Ücretsiz Al →
          </button>
        </div>
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
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-4 right-4 z-[400] w-[340px] overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#0C1410]/95 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(16,185,129,0.12)] backdrop-blur-2xl"
      >
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">7 Gün Ücretsiz VPN</span>
                <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-semibold text-emerald-400">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-white/50 mt-0.5">RAM-Only · Kill Switch · Sınırsız Hız</p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="grid h-6 w-6 place-items-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Kapat"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={copyCoupon}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            title="Kupon kodunu kopyala"
          >
            <span className="font-mono text-emerald-400 font-bold">{COUPON}</span>
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-white/40" />}
          </button>

          <button
            type="button"
            onClick={openOffer}
            className="flex-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black shadow-md shadow-emerald-500/25 hover:bg-emerald-400 active:scale-[0.98] transition-all text-center"
          >
            Hemen Al →
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
