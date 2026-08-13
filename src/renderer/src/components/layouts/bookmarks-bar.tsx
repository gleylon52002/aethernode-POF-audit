import { useState, useRef } from 'react';
import { useBookmarks } from '@renderer/store/bookmarks';
import { useTabs } from '@renderer/store/tabs';
import { useSettings } from '@renderer/store/settings';
import { Star } from '@renderer/components/ui/icons';

export function BookmarksBar() {
  const visible = useSettings((s) => s.settings.general.bookmarksBarVisible !== false);
  const nodes = useBookmarks((s) => s.nodes);
  const update = useTabs((s) => s.update);
  const open = useTabs((s) => s.open);
  const openBg = useTabs((s) => s.openBackground);
  const activeId = useTabs((s) => s.activeId);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  if (!visible) return null;
  const bookmarks = nodes.filter((n) => n.url && !n.folder);
  if (bookmarks.length === 0) {
    return (
      <div className="flex h-8 items-center gap-2 border-b border-white/5 bg-bg-surface/40 px-3 text-xs text-fg-subtle">
        <Star className="h-3.5 w-3.5" />
        Yer imi yok — yıldız ile ekleyin · Ctrl+Shift+B ile gizle
      </div>
    );
  }

  const MAX_INLINE = 18;
  const inline = bookmarks.slice(0, MAX_INLINE);
  const overflow = bookmarks.slice(MAX_INLINE);

  const navigate = (url: string, e: React.MouseEvent) => {
    const bg = e.ctrlKey || e.metaKey || e.button === 1;
    if (bg) { openBg(url); return; }
    if (activeId) update(activeId, { url, loading: true });
    else open(url);
  };

  return (
    <div ref={barRef} className="flex h-8 shrink-0 items-center gap-1 border-b border-white/5 bg-bg-surface/40 px-2 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {inline.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={(e) => navigate(b.url!, e)}
            onAuxClick={(e) => { if (e.button === 1) navigate(b.url!, e); }}
            title={`${b.title} — ${b.url}`}
            className="flex max-w-[160px] shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-white/10 hover:text-fg"
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(b.url!).hostname)}&sz=16`}
              alt=""
              className="h-3.5 w-3.5 shrink-0 rounded-sm"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
            <span className="truncate">{b.title || b.url}</span>
          </button>
        ))}
      </div>
      {overflow.length > 0 && (
        <div className="relative shrink-0">
          <button type="button" onClick={() => setOverflowOpen((v) => !v)} className="grid h-6 w-6 place-items-center rounded-md text-fg-muted hover:bg-white/10 hover:text-fg" aria-label="Fazla yer imleri">
            » {overflow.length}
          </button>
          {overflowOpen && (
            <div className="absolute right-0 top-7 z-50 max-h-80 w-64 overflow-auto rounded-xl border border-white/10 bg-bg-elevated/95 p-1 shadow-2xl backdrop-blur-xl">
              {overflow.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={(e) => { navigate(b.url!, e); setOverflowOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-fg hover:bg-white/10"
                >
                  <span className="truncate">{b.title || b.url}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
