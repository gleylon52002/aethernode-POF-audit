import {
  Home,
  Security,
  SecurityLab,
  PrivacyIcon,
  Network,
  Settings as SettingsIcon,
  Key,
  Note,
  Download,
  Star,
  HistoryIcon,
  GaugeIcon,
  WavesIcon,
} from '@renderer/components/ui/icons';
import { Tooltip } from '@renderer/components/ui';
import { useTabs } from '@renderer/store/tabs';
import { useSettings } from '@renderer/store/settings';
import { usePasswords } from '@renderer/store/passwords';
import { useDownloads } from '@renderer/store/downloads';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { playUiSound } from '@renderer/hooks/use-sound';
import { RELAX_EVENT } from './relax-panel';
import { useRelaxStore } from '@renderer/store/relax';

interface Item {
  route: string;
  label: string;
  icon: typeof Home;
}

const items: Item[] = [
  { route: 'dashboard', label: 'Ana Sayfa', icon: Home },
  { route: 'security', label: 'Güvenlik Merkezi', icon: Security },
  { route: 'security-lab', label: 'Güvenlik Lab', icon: SecurityLab },
  { route: 'privacy', label: 'Gizlilik', icon: PrivacyIcon },
  { route: 'network', label: 'Ağ', icon: Network },
  { route: 'performance', label: 'Performans', icon: GaugeIcon },
  { route: 'bookmarks', label: 'Yer İmleri', icon: Star },
  { route: 'history', label: 'Geçmiş', icon: HistoryIcon },
  { route: 'downloads', label: 'İndirilenler', icon: Download },
  { route: 'passwords', label: 'Şifreler', icon: Key },
  { route: 'notes', label: 'Güvenli Notlar', icon: Note },
  { route: 'settings', label: 'Ayarlar', icon: SettingsIcon },
];

export function Sidebar() {
  const tabs = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const open = useTabs((s) => s.open);
  const update = useTabs((s) => s.update);
  const relaxPlaying = useRelaxStore((s) => s.isPlaying);
  const vaultStatus = usePasswords((s) => s.status);
  const vaultLoaded = usePasswords((s) => s.loaded);
  const loadPasswords = usePasswords((s) => s.load);
  const downloads = useDownloads((s) => s.items);
  const hasSeenUpdate = useSettings((s) => s.settings.general.hasSeenUpdate);

  const [downloadBounce, setDownloadBounce] = useState(false);
  const prevCompletedRef = useRef<number>(-1);

  useEffect(() => {
    void loadPasswords();
  }, [loadPasswords]);

  // Watch downloads items for completed transition
  useEffect(() => {
    const c = downloads.filter((d) => d.status === 'completed').length;
    if (prevCompletedRef.current !== -1 && c > prevCompletedRef.current) {
      setDownloadBounce(true);
      window.setTimeout(() => setDownloadBounce(false), 650);
    }
    prevCompletedRef.current = c;
  }, [downloads]);

  useEffect(() => {}, [tabs.length, activeId]);

  const activeRoute = tabs
    .find((t) => t.id === activeId)
    ?.url.replace('aethernode://', '')
    .split(/[/?#]/)[0];

  const navigate = (route: string, e?: MouseEvent) => {
    const url = `aethernode://${route}`;
    const newTab = !!(e && (e.ctrlKey || e.metaKey || e.button === 1));
    if (route === 'settings' && !hasSeenUpdate) {
      void useSettings.getState().apply({ ...useSettings.getState().settings, general: { ...useSettings.getState().settings.general, hasSeenUpdate: true } });
    }
    if (newTab) {
      open(url);
      try { playUiSound('sidebarNav'); } catch {}
      return;
    }
    if (activeId) {
      const cur = tabs.find((t) => t.id === activeId);
      if (cur && cur.url === url) return;
      update(activeId, { url, loading: false });
      try { playUiSound('sidebarNav'); } catch {}
    } else {
      open(url);
      try { playUiSound('sidebarNav'); } catch {}
    }
  };

  const vaultLocked = vaultLoaded && vaultStatus && !vaultStatus.unlocked;

  return (
    <nav className="flex w-11 shrink-0 flex-col items-center gap-0.5 border-r border-white/5 bg-bg-surface/50 py-2">
      {items.map(({ route, label, icon: Icon }) => {
        const isVault = route === 'passwords';
        const isDownload = route === 'downloads';
        const isSettings = route === 'settings';
        const showUpdateBadge = isSettings && !hasSeenUpdate;
        return (
          <Tooltip key={route} label={label}>
            <button
              type="button"
              onClick={(e) => navigate(route, e)}
              onAuxClick={(e) => {
                if (e.button === 1) navigate(route, e);
              }}
              className={`relative grid h-8 w-8 place-items-center rounded-lg transition-all duration-200 ${
                activeRoute === route
                  ? 'bg-brand/20 text-brand shadow-[0_0_12px_rgba(124,58,237,0.25)]'
                  : 'text-fg-muted hover:bg-white/5 hover:text-fg'
              }`}
              aria-label={label}
            >
              {activeRoute === route && (
                <span className="absolute left-[-6px] top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand shadow-glow" aria-hidden />
              )}
              {/* Vault pulse wrapper */}
              {isVault && vaultLocked ? (
                <motion.span
                  animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.06, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="grid place-items-center"
                  style={{ willChange: 'transform, opacity' }}
                >
                  <Icon className="h-4 w-4" />
                </motion.span>
              ) : isDownload && downloadBounce ? (
                <motion.span
                  animate={{ scale: [1, 1.25, 1], y: [0, -3, 0] }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="grid place-items-center"
                >
                  <Icon className="h-4 w-4" />
                </motion.span>
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {showUpdateBadge && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand shadow-glow ring-1 ring-bg-surface"
                  aria-hidden
                />
              )}
            </button>
          </Tooltip>
        );
      })}
      <div className="mt-auto flex flex-col items-center gap-1 border-t border-white/5 pt-2">
        <Tooltip label={relaxPlaying ? 'Rahatlat — çalıyor (durdurmak için tıkla)' : 'Kendini Rahatlat'}>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(RELAX_EVENT))}
            className={`grid h-8 w-8 place-items-center rounded-lg transition ${
              relaxPlaying
                ? 'bg-emerald-500/15 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'text-fg-muted hover:bg-white/5 hover:text-fg'
            }`}
            aria-label="Kendini Rahatlat"
          >
            <WavesIcon className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    </nav>
  );
}
