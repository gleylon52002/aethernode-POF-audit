import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '@renderer/store/settings';
import { useTabs } from '@renderer/store/tabs';

export const SHIELD_EVENT = 'aether:shield-panel';

interface LeakRow {
  category: string;
  passed: boolean;
  details: string;
}

/** Canlı koruma paneli — WebRTC / DNS / fingerprint durumu. */
export function ShieldPanel() {
  const [open, setOpen] = useState(false);
  const [leaks, setLeaks] = useState<LeakRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [webrtcAllowed, setWebrtcAllowed] = useState(false);
  const settings = useSettings((s) => s.settings);
  const p = settings.privacy;
  const active = useTabs((s) => s.tabs.find((t) => t.id === s.activeId));

  const activeHost = (() => {
    try {
      const u = active?.url || '';
      if (!/^https?:\/\//i.test(u)) return null;
      return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
    } catch { return null; }
  })();

  useEffect(() => {
    if (!activeHost) { setWebrtcAllowed(false); return; }
    void window.aether.privacy.webrtcAllowedSites().then((r) => {
      if (r.ok && Array.isArray(r.data)) {
        const list = (r.data as string[]).map((h) => h.toLowerCase().replace(/^www\./, ''));
        setWebrtcAllowed(list.some((a) => activeHost === a || activeHost.endsWith('.' + a)));
      }
    });
  }, [activeHost, open]);

  const toggleWebrtcSite = async () => {
    if (!activeHost) return;
    if (webrtcAllowed) {
      await window.aether.privacy.webrtcDisallowSite(activeHost);
      setWebrtcAllowed(false);
    } else {
      await window.aether.privacy.webrtcAllowSite(activeHost);
      setWebrtcAllowed(true);
    }
  };

  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    window.addEventListener(SHIELD_EVENT, toggle);
    return () => window.removeEventListener(SHIELD_EVENT, toggle);
  }, []);

  if (!open) return null;

  const runTest = async () => {
    setBusy(true);
    try {
      const res = await window.aether.privacy.runLeakTest();
      if (res.ok && Array.isArray(res.data)) {
        setLeaks(res.data as LeakRow[]);
      } else if (res.ok && res.data && Array.isArray((res.data as { checks?: unknown }).checks)) {
        setLeaks((res.data as { checks: LeakRow[] }).checks);
      } else {
        setLeaks([]);
      }
    } catch {
      setLeaks([]);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[410] bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="absolute right-4 top-16 w-[min(360px,92vw)] rounded-2xl border border-white/10 bg-bg-elevated/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">Koruma paneli</h2>
          <button
            type="button"
            className="text-xs text-fg-muted hover:text-fg"
            onClick={() => setOpen(false)}
          >
            Kapat
          </button>
        </div>
        <ul className="space-y-2 text-xs">
          <li className="flex justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
            <span className="text-fg-muted">WebRTC</span>
            <span className="text-fg">
              {p.webrtc.enabled ? p.webrtc.policy : 'kapalı'}
            </span>
          </li>
          <li className="flex justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
            <span className="text-fg-muted">DNS</span>
            <span className="text-fg">
              {p.dns.enabled ? p.dns.mode : 'sistem'}
            </span>
          </li>
          <li className="flex justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
            <span className="text-fg-muted">Parmak izi</span>
            <span className="text-fg">
              {p.fingerprint.enabled ? p.fingerprint.mode : 'kapalı'}
            </span>
          </li>
          <li className="flex justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
            <span className="text-fg-muted">HTTPS zorlama</span>
            <span className="text-fg">{p.https.forceHttps ? 'açık' : 'kapalı'}</span>
          </li>
          <li className="flex justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
            <span className="text-fg-muted">İzleyici engeli</span>
            <span className="text-fg">{p.trackers.enabled ? 'açık' : 'kapalı'}</span>
          </li>
          <li className="flex justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
            <span className="text-fg-muted">Zorla koyu</span>
            <span className="text-fg">
              {settings.general.forceDarkMode ? 'açık' : 'kapalı'}
            </span>
          </li>
        </ul>
        {activeHost && (
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[11px] text-fg-muted">Bu site ({activeHost})</div>
            <button
              type="button"
              onClick={() => void toggleWebrtcSite()}
              className={`mt-2 w-full rounded-lg px-3 py-2 text-xs font-medium transition ${webrtcAllowed ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'}`}
            >
              {webrtcAllowed ? 'WebRTC STUN izni kaldır (korumayı geri aç)' : 'WebRTC STUN\'a izin ver (Meet/Zoom için)'}
            </button>
            <div className="mt-1 text-[10px] text-fg-subtle">Yeniden yüklemeden sonra geçerli olur.</div>
          </div>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void runTest()}
          className="mt-3 w-full rounded-lg bg-brand/20 py-2 text-xs text-brand hover:bg-brand/30 disabled:opacity-50"
        >
          {busy ? 'Test çalışıyor…' : 'Sızıntı testi çalıştır'}
        </button>
        {leaks && (
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-[11px]">
            {leaks.map((c, i) => (
              <li key={i} className={c.passed ? 'text-emerald-400' : 'text-amber-400'}>
                {c.category}: {c.details}
              </li>
            ))}
            {leaks.length === 0 && (
              <li className="text-fg-subtle">Sonuç yok — Gizlilik sayfasından deneyin</li>
            )}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
