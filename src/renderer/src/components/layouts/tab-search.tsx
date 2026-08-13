import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTabs } from '@renderer/store/tabs';
import { Globe, Incognito, Search, Close, Volume } from '@renderer/components/ui/icons';
import { GROUP_COLORS } from './tab-group-menu';

export const TAB_SEARCH_EVENT = 'aether:tab-search';

/** Açık sekmelerde başlık/URL araması — Ctrl+Shift+A. */
export function TabSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const tabs = useTabs((s) => s.tabs);
  const groups = useTabs((s) => s.groups);
  const activeId = useTabs((s) => s.activeId);
  const activate = useTabs((s) => s.activate);
  const close = useTabs((s) => s.close);

  useEffect(() => {
    const toggle = () => {
      setOpen((v) => !v);
      setQuery('');
      setHighlight(0);
    };
    window.addEventListener(TAB_SEARCH_EVENT, toggle);
    return () => window.removeEventListener(TAB_SEARCH_EVENT, toggle);
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tabs;
    return tabs.filter(
      (t) => t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q),
    );
  }, [tabs, query]);

  useEffect(() => {
    setHighlight((h) => Math.min(h, Math.max(results.length - 1, 0)));
  }, [results.length]);

  if (!open) return null;

  const pick = (id: string) => {
    activate(id);
    setOpen(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="mx-auto mt-[10vh] w-[min(560px,92vw)] overflow-hidden rounded-2xl border border-white/10 bg-bg-elevated/95 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-white/5 px-4">
          <Search className="h-4 w-4 shrink-0 text-fg-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === 'Enter') {
                const t = results[highlight];
                if (t) pick(t.id);
              }
            }}
            placeholder={`Sekmelerde ara (${tabs.length} açık)…`}
            className="h-12 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            spellCheck={false}
          />
          <kbd className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-fg-subtle">Esc</kbd>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto py-1">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-fg-subtle">Eşleşen sekme yok</li>
          )}
          {results.map((t, i) => (
            <li key={t.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => pick(t.id)}
                onKeyDown={(e) => e.key === 'Enter' && pick(t.id)}
                onMouseEnter={() => setHighlight(i)}
                className={`group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left ${
                  i === highlight ? 'bg-brand/15' : 'hover:bg-white/5'
                }`}
              >
                {t.profileId === 'incognito' ? (
                  <Incognito className="h-4 w-4 shrink-0 text-purple-300" />
                ) : t.faviconUrl ? (
                  <img src={t.faviconUrl} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
                ) : (
                  <Globe className="h-4 w-4 shrink-0 text-fg-subtle" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm text-fg">
                      {t.title || 'Yeni Sekme'}
                    </span>
                    {t.id === activeId && (
                      <span className="shrink-0 rounded bg-brand/20 px-1 py-px text-[9px] font-medium text-brand">
                        aktif
                      </span>
                    )}
                    {t.audible && <Volume className="h-3 w-3 shrink-0 text-brand" />}
                    {(() => {
                      const g = t.groupId ? groups.find((x) => x.id === t.groupId) : null;
                      if (!g) return null;
                      return (
                        <span
                          className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[9px] font-medium text-white/90"
                          style={{ backgroundColor: `${GROUP_COLORS[g.color].line}55` }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: GROUP_COLORS[g.color].line }}
                          />
                          {g.name}
                        </span>
                      );
                    })()}
                    {t.discarded && (
                      <span className="shrink-0 text-[9px] text-fg-subtle">(uykuda)</span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-fg-subtle">{t.url}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    close(t.id);
                  }}
                  title="Sekmeyi kapat"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded opacity-0 hover:bg-white/10 group-hover:opacity-100"
                  aria-label="Sekmeyi kapat"
                >
                  <Close className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
