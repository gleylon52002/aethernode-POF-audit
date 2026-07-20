import {
  Home,
  Security,
  Network,
  Settings as SettingsIcon,
  Key,
  Note,
  Download,
  Star,
  HistoryIcon,
} from '@renderer/components/ui/icons';
import { Tooltip } from '@renderer/components/ui';
import { useTabs } from '@renderer/store/tabs';
import { useEffect } from 'react';

interface Item {
  route: string;
  label: string;
  icon: typeof Home;
}

const items: Item[] = [
  { route: 'dashboard', label: 'Ana Sayfa', icon: Home },
  { route: 'security', label: 'Güvenlik Merkezi', icon: Security },
  { route: 'privacy', label: 'Gizlilik', icon: Security },
  { route: 'network', label: 'Ağ', icon: Network },
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

  useEffect(() => {}, [tabs.length, activeId]);

  const activeRoute = tabs
    .find((t) => t.id === activeId)
    ?.url.replace('aethernode://', '')
    .split(/[/?#]/)[0];

  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-white/5 bg-bg-surface/50 py-3">
      {items.map(({ route, label, icon: Icon }) => (
        <Tooltip key={route} label={label}>
          <button
            onClick={() => open(`aethernode://${route}`)}
            className={`grid h-11 w-11 place-items-center rounded-xl transition ${
              activeRoute === route
                ? 'bg-brand/20 text-brand'
                : 'text-fg-muted hover:bg-white/5 hover:text-fg'
            }`}
            aria-label={label}
          >
            <Icon />
          </button>
        </Tooltip>
      ))}
    </nav>
  );
}
