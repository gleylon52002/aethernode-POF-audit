import { useTabs } from '@renderer/store/tabs';
import { Close, Plus, Globe, Incognito } from '@renderer/components/ui/icons';

export function TabBar() {
  const tabs = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const activate = useTabs((s) => s.activate);
  const close = useTabs((s) => s.close);
  const open = useTabs((s) => s.open);

  return (
    <div className="titlebar flex h-9 items-center gap-1 overflow-x-auto border-b border-white/5 bg-bg-base/70 px-2 backdrop-blur">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => activate(t.id)}
          onAuxClick={(e) => {
            // Orta tık: sekmeyi kapat
            if (e.button === 1) {
              e.preventDefault();
              close(t.id);
            }
          }}
          className={`group no-drag relative flex h-7 max-w-[200px] items-center gap-2 rounded-md px-3 text-xs transition ${
            activeId === t.id
              ? 'bg-bg-elevated text-fg'
              : 'bg-white/[0.02] text-fg-muted hover:bg-white/5 hover:text-fg'
          } ${t.profileId === 'incognito' ? 'ring-1 ring-inset ring-purple-500/40' : ''} ${
            t.discarded ? 'opacity-50' : ''
          }`}
        >
          {t.profileId === 'incognito' ? (
            <Incognito className="h-3.5 w-3.5 text-purple-300" />
          ) : t.faviconUrl ? (
            <img src={t.faviconUrl} alt="" className="h-3.5 w-3.5 rounded-sm" />
          ) : (
            <Globe className="h-3.5 w-3.5" />
          )}
          <span className="truncate">
            {t.discarded ? `${t.title || 'Sekme'} (uykuda)` : t.title || 'Yeni Sekme'}
          </span>
          <span
            role="button"
            aria-label="Sekmeyi kapat"
            onClick={(e) => {
              e.stopPropagation();
              close(t.id);
            }}
            className="grid h-4 w-4 place-items-center rounded hover:bg-white/10"
          >
            <Close className="h-3 w-3" />
          </span>
          {t.loading && (
            <span className="absolute inset-x-2 bottom-0 h-0.5 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full w-1/2 animate-pulse-soft bg-brand" />
            </span>
          )}
        </button>
      ))}
      <button
        onClick={() => open()}
        className="no-drag grid h-7 w-7 place-items-center rounded-md text-fg-muted hover:bg-white/5 hover:text-fg"
        aria-label="Yeni sekme"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}