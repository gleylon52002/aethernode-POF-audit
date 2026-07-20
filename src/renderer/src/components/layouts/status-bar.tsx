import { useEffect, useMemo, useState } from 'react';
import { useTabs } from '@renderer/store/tabs';
import { useNetwork } from '@renderer/store/network';
import { useSettings } from '@renderer/store/settings';
import { Lock, Shield, Globe } from '@renderer/components/ui/icons';
import { isBankUrl } from '@shared/utils';
import { resolveInternalRoute } from '@renderer/router';

// Alt durum çubuğu — tam genişlik, belirgin chrome şeridi.
export function StatusBar() {
  const active = useTabs((s) => s.tabs.find((t) => t.id === s.activeId) ?? s.tabs[0]);
  const tabCount = useTabs((s) => s.tabs.length);
  const blockedTotal = useNetwork((s) => s.blockedTotal);
  const scriptBlockerOn = useSettings((s) => !!s.settings.privacy.scriptBlocker?.enabled);
  const bankModeOn = useSettings((s) => s.settings.privacy.bankMode?.enabled !== false);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    }, 15_000);
    return () => window.clearInterval(id);
  }, []);

  const info = useMemo(() => {
    if (!active) return { secure: false, internal: true, bank: false, host: '' };
    const internal = resolveInternalRoute(active.url).internal;
    let host = '';
    try {
      if (!internal && /^https?:\/\//i.test(active.url)) host = new URL(active.url).hostname;
    } catch {
      host = '';
    }
    return {
      secure: /^https:\/\//i.test(active.url),
      internal,
      bank: bankModeOn && isBankUrl(active.url),
      host,
    };
  }, [active, bankModeOn]);

  return (
    <footer className="relative z-50 flex h-9 shrink-0 items-center gap-3 border-t border-white/10 bg-[#0a0a0e] px-4 text-xs text-fg-muted shadow-[0_-4px_24px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-1 font-medium text-success">
        <Shield className="h-3.5 w-3.5" />
        <span>{blockedTotal} engellendi</span>
      </div>

      {info.internal ? (
        <span className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1">
          <Globe className="h-3.5 w-3.5" />
          Dahili sayfa
        </span>
      ) : info.secure ? (
        <span className="flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-1 text-success">
          <Lock className="h-3.5 w-3.5" />
          Güvenli · {info.host || 'HTTPS'}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-amber-300">
          <Globe className="h-3.5 w-3.5" />
          Güvensiz · {info.host || 'HTTP'}
        </span>
      )}

      {info.bank && (
        <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-300">Banka Modu</span>
      )}

      <span
        className={`rounded-md px-2 py-1 font-medium ${
          scriptBlockerOn ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5'
        }`}
      >
        {scriptBlockerOn ? 'JS kapalı' : 'JS açık'}
      </span>

      <div className="flex-1" />

      <span className="tabular-nums">{tabCount} sekme</span>
      <span className="text-white/15">·</span>
      <span className="tabular-nums text-fg">{clock}</span>
    </footer>
  );
}
