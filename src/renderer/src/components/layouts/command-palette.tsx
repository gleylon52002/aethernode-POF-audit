import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTabs } from '@renderer/store/tabs';
import { useSettings } from '@renderer/store/settings';
import { Search } from '@renderer/components/ui/icons';
import { SHIELD_EVENT } from './shield-panel';
import { TAB_SEARCH_EVENT } from './tab-search';
import { TEMP_LINK_EVENT } from './temp-link-panel';

export const CMD_PALETTE_EVENT = 'aether:command-palette';
export const TRANSLATE_EVENT = 'aether:translate-page';
export const LITTLE_ARC_EVENT = 'aether:little-arc';

type Cmd = { id: string; label: string; hint?: string; run: () => void };

/** Komut paleti — Ctrl+K: sekmeler + aksiyonlar. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const tabs = useTabs((s) => s.tabs);
  const openTab = useTabs((s) => s.open);
  const activate = useTabs((s) => s.activate);
  const toggleSplit = useTabs((s) => s.toggleSplit);
  const { settings, apply } = useSettings();

  useEffect(() => {
    const toggle = () => {
      setOpen((v) => !v);
      setQuery('');
      setHighlight(0);
    };
    window.addEventListener(CMD_PALETTE_EVENT, toggle);
    return () => window.removeEventListener(CMD_PALETTE_EVENT, toggle);
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const commands = useMemo((): Cmd[] => {
    const nav = (url: string) => () => {
      openTab(url);
      setOpen(false);
    };
    const list: Cmd[] = [
      { id: 'new', label: 'Yeni sekme', run: () => { openTab(); setOpen(false); } },
      { id: 'incog', label: 'Gizli sekme', run: () => { openTab(undefined, 'incognito'); setOpen(false); } },
      { id: 'split', label: 'Split view', run: () => { toggleSplit(); setOpen(false); } },
      {
        id: 'tabsearch',
        label: 'Sekmelerde ara',
        run: () => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent(TAB_SEARCH_EVENT));
        },
      },
      {
        id: 'translate',
        label: 'Sayfayı çevir',
        run: () => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent(TRANSLATE_EVENT));
        },
      },
      {
        id: 'shield',
        label: 'Koruma paneli',
        run: () => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent(SHIELD_EVENT));
        },
      },
      {
        id: 'little',
        label: 'Mini pencere (Little Arc)',
        run: () => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent(LITTLE_ARC_EVENT));
        },
      },
      {
        id: 'dark',
        label: settings.general.forceDarkMode ? 'Zorla koyu tema: kapat' : 'Zorla koyu tema: aç',
        run: () => {
          void apply({
            ...settings,
            general: { ...settings.general, forceDarkMode: !settings.general.forceDarkMode },
          });
          setOpen(false);
        },
      },
      {
        id: 'templink',
        label: 'Geçici bağlantı',
        run: () => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent(TEMP_LINK_EVENT));
        },
      },
      { id: 'import', label: 'İçe aktar (Chrome/Brave)', run: nav('aethernode://import') },
      { id: 'library', label: 'Kütüphane (arşiv)', run: nav('aethernode://library') },
      { id: 'ws', label: 'Workspaces', run: nav('aethernode://workspaces') },
      { id: 'ct', label: 'Konteynerler', run: nav('aethernode://containers') },
      { id: 'boost', label: 'Site Boosts', run: nav('aethernode://boosts') },
      { id: 'bm', label: 'Yer imleri', run: nav('aethernode://bookmarks') },
      { id: 'hist', label: 'Geçmiş', run: nav('aethernode://history') },
      { id: 'dl', label: 'İndirmeler', run: nav('aethernode://downloads') },
      { id: 'priv', label: 'Gizlilik', run: nav('aethernode://privacy') },
      { id: 'set', label: 'Ayarlar', run: nav('aethernode://settings') },
      {
        id: 'panic',
        label: 'Panik — her şeyi sıfırla',
        hint: 'Ctrl+Shift+X',
        run: () => {
          setOpen(false);
          void window.aether.privacy.panic().then(() => useTabs.getState().resetAll());
        },
      },
    ];

    for (const t of tabs) {
      list.push({
        id: `tab-${t.id}`,
        label: t.title || t.url,
        hint: 'sekme',
        run: () => {
          activate(t.id);
          setOpen(false);
        },
      });
    }
    return list;
  }, [tabs, openTab, activate, toggleSplit, settings, apply]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 24);
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.hint && c.hint.includes(q)),
    );
  }, [commands, query]);

  useEffect(() => {
    setHighlight((h) => Math.min(h, Math.max(results.length - 1, 0)));
  }, [results.length]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[420] bg-black/50 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="mx-auto mt-[10vh] w-[min(560px,92vw)] overflow-hidden rounded-2xl border border-white/10 bg-bg-elevated/95 shadow-2xl">
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
                results[highlight]?.run();
              }
            }}
            placeholder="Komut veya sekme ara…"
            className="h-12 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <kbd className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-fg-subtle">Ctrl+K</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1">
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => c.run()}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm ${
                  i === highlight ? 'bg-white/10 text-fg' : 'text-fg-muted hover:bg-white/5'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                {c.hint && <span className="text-[10px] text-fg-subtle">{c.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
