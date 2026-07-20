import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Back,
  Forward,
  Reload,
  Close,
  Lock,
  Globe,
  Search,
  Shield,
  Focus,
  Reader,
  HistoryIcon,
  Star,
} from '@renderer/components/ui/icons';
import { Tooltip } from '@renderer/components/ui';
import { useTabs } from '@renderer/store/tabs';
import { useSettings } from '@renderer/store/settings';
import { useNetwork } from '@renderer/store/network';
import { useBookmarks } from '@renderer/store/bookmarks';
import { useHistory } from '@renderer/store/history';
import { resolveInternalRoute } from '@renderer/router';
import { cleanTrackingParams, isBankUrl } from '@shared/utils';
import { FOCUS_ADDRESS_EVENT } from '@renderer/hooks/use-shortcuts';
import { MediaControls } from './media-controls';
import { getActiveWebviewControl } from './webview-control-bus';

const SEARCH_URLS: Record<string, (q: string) => string> = {
  duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  startpage: (q) => `https://www.startpage.com/sp/search?query=${encodeURIComponent(q)}`,
  brave: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
  google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  searxng: (q) => `https://searx.be/search?q=${encodeURIComponent(q)}`,
  bing: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  yandex: (q) => `https://yandex.com/search/?text=${encodeURIComponent(q)}`,
  ecosia: (q) => `https://www.ecosia.org/search?q=${encodeURIComponent(q)}`,
  qwant: (q) => `https://www.qwant.com/?q=${encodeURIComponent(q)}`,
};

function isUrl(s: string): boolean {
  if (/^https?:\/\//i.test(s)) return true;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(s)) return true;
  return false;
}

function toUrl(input: string, engine: string): string {
  const trimmed = input.trim();
  if (trimmed === '') return 'aethernode://dashboard';
  if (trimmed.startsWith('aethernode://')) return trimmed;
  if (isUrl(trimmed)) return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return (SEARCH_URLS[engine] ?? SEARCH_URLS.duckduckgo)(trimmed);
}

function securityOf(url: string): 'secure' | 'insecure' | 'internal' | 'search' {
  if (url.startsWith('aethernode://')) return 'internal';
  if (/^https:\/\//i.test(url)) return 'secure';
  if (/^http:\/\//i.test(url)) return 'insecure';
  return 'search';
}

type SuggestKind = 'tab' | 'bookmark' | 'history' | 'search' | 'url';

interface Suggestion {
  kind: SuggestKind;
  label: string;
  url: string;
  subtitle?: string;
  tabId?: string;
}

export function AddressBar() {
  const tabs = useTabs((s) => s.tabs);
  const active = useTabs((s) => s.tabs.find((t) => t.id === s.activeId) ?? s.tabs[0]);
  const update = useTabs((s) => s.update);
  const open = useTabs((s) => s.open);
  const activate = useTabs((s) => s.activate);
  const engine = useSettings((s) => s.settings.general.defaultSearchEngine);
  const urlCleanerOn = useSettings((s) => s.settings.privacy.urlCleaner.enabled);
  const bankModeOn = useSettings((s) => s.settings.privacy.bankMode?.enabled !== false);
  const scriptBlockerOn = useSettings((s) => !!s.settings.privacy.scriptBlocker?.enabled);
  const blockedTotal = useNetwork((s) => s.blockedTotal);
  const subscribeBlocked = useNetwork((s) => s.subscribeBlocked);
  const loadNetwork = useNetwork((s) => s.load);
  const bookmarks = useBookmarks((s) => s.nodes);
  const toggleBookmark = useBookmarks((s) => s.toggle);
  const history = useHistory((s) => s.entries);
  const loadHistory = useHistory((s) => s.load);

  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) setValue(active?.url ?? '');
  }, [active?.id, active?.url, focused]);

  useEffect(() => {
    void loadNetwork();
    void loadHistory();
    return subscribeBlocked();
  }, [subscribeBlocked, loadNetwork, loadHistory]);

  useEffect(() => {
    const onFocusRequest = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener(FOCUS_ADDRESS_EVENT, onFocusRequest);
    return () => window.removeEventListener(FOCUS_ADDRESS_EVENT, onFocusRequest);
  }, []);

  const suggestions = useMemo((): Suggestion[] => {
    if (!focused) return [];
    const q = value.trim().toLowerCase();
    if (q.length < 1) return [];
    const out: Suggestion[] = [];

    // Açık sekme önizlemeleri
    for (const t of tabs) {
      if (
        t.title.toLowerCase().includes(q) ||
        t.url.toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'tab',
          label: t.title || t.url,
          url: t.url,
          subtitle: t.url,
          tabId: t.id,
        });
      }
      if (out.length >= 4) break;
    }

    for (const b of bookmarks) {
      if (!b.url) continue;
      if (b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)) {
        if (!out.some((s) => s.url === b.url && s.kind !== 'tab')) {
          out.push({ kind: 'bookmark', label: b.title || b.url, url: b.url, subtitle: b.url });
        }
      }
      if (out.filter((s) => s.kind === 'bookmark').length >= 3) break;
    }

    for (const h of history) {
      if ((h.title || '').toLowerCase().includes(q) || h.url.toLowerCase().includes(q)) {
        if (!out.some((s) => s.url === h.url)) {
          out.push({
            kind: 'history',
            label: h.title || h.url,
            url: h.url,
            subtitle: h.url,
          });
        }
      }
      if (out.filter((s) => s.kind === 'history').length >= 4) break;
    }

    if (isUrl(q)) {
      const url = /^https?:\/\//i.test(q) ? q : `https://${q}`;
      out.push({ kind: 'url', label: url, url, subtitle: 'Adrese git' });
    }

    out.push({
      kind: 'search',
      label: `"${value.trim()}" ara`,
      url: (SEARCH_URLS[engine] ?? SEARCH_URLS.duckduckgo)(value.trim()),
      subtitle: engine,
    });

    return out.slice(0, 10);
  }, [focused, value, tabs, bookmarks, history, engine]);

  useEffect(() => {
    setHighlight(0);
  }, [value, focused]);

  const isInternal = active ? resolveInternalRoute(active.url).internal : false;
  const isIncognito = active?.profileId === 'incognito';
  const loading = active?.loading ?? false;
  const deepFocusOn = !!active?.deepFocus;
  const readerOn = !!active?.readerMode;
  const bankActive = bankModeOn && !!active?.url && isBankUrl(active.url);
  const pageSecure = /^https:\/\//i.test(active?.url ?? '');
  const isBookmarked = !!(
    active?.url &&
    /^https?:\/\//i.test(active.url) &&
    bookmarks.some((b) => b.url === active.url)
  );

  const toggleFav = () => {
    if (!active || !/^https?:\/\//i.test(active.url)) return;
    toggleBookmark(active.title || active.url, active.url);
  };

  const go = (kind: 'back' | 'forward' | 'reload' | 'stop') => {
    const ctrl = getActiveWebviewControl();
    if (kind === 'back') ctrl.back();
    if (kind === 'forward') ctrl.forward();
    if (kind === 'reload') {
      if (isInternal && active) update(active.id, { url: active.url, loading: true });
      else ctrl.reload();
    }
    if (kind === 'stop') {
      if (isInternal && active) update(active.id, { loading: false });
      else ctrl.stop();
    }
  };

  const navigateTo = (url: string, opts?: { newTab?: boolean }) => {
    let next = url;
    if (urlCleanerOn) next = cleanTrackingParams(next);
    if (opts?.newTab) open(next);
    else if (active) update(active.id, { url: next, loading: !next.startsWith('aethernode://') });
    else open(next);
    setFocused(false);
    inputRef.current?.blur();
  };

  const commit = (raw: string, opts?: { newTab?: boolean; autoComplete?: boolean }) => {
    let input = raw;
    if (opts?.autoComplete && /^[\w-]+$/.test(input.trim())) {
      input = `www.${input.trim()}.com`;
    }
    navigateTo(toUrl(input, engine), opts);
  };

  const applySuggestion = (s: Suggestion, newTab?: boolean) => {
    if (s.kind === 'tab' && s.tabId && !newTab) {
      activate(s.tabId);
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    if (s.kind === 'search') {
      commit(value, { newTab });
      return;
    }
    navigateTo(s.url, { newTab });
  };

  const toggleDeepFocus = () => {
    if (!active || isInternal) return;
    const next = !deepFocusOn;
    update(active.id, { deepFocus: next });
    getActiveWebviewControl().setDeepFocus(next);
  };

  const toggleReader = () => {
    if (!active || isInternal) return;
    const next = !readerOn;
    update(active.id, { readerMode: next });
    getActiveWebviewControl().setReaderMode(next);
  };

  return (
    <div className="relative no-drag flex h-11 items-center gap-2 border-b border-white/5 bg-bg-surface/40 px-2">
      <button
        className="grid h-8 w-8 place-items-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-fg"
        onClick={() => go('back')}
        aria-label="Geri"
      >
        <Back className="h-4 w-4" />
      </button>
      <button
        className="grid h-8 w-8 place-items-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-fg"
        onClick={() => go('forward')}
        aria-label="İleri"
      >
        <Forward className="h-4 w-4" />
      </button>
      <button
        className="grid h-8 w-8 place-items-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-fg"
        onClick={() => (loading ? go('stop') : go('reload'))}
        aria-label={loading ? 'Durdur' : 'Yeniden yükle'}
      >
        {loading ? <Close className="h-4 w-4" /> : <Reload className="h-4 w-4" />}
      </button>

      <div className="relative flex flex-1 items-center">
        <div className="group flex w-full items-center gap-2 rounded-xl border border-white/10 bg-bg-elevated/60 px-3 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/25 transition">
          {isIncognito ? (
            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
              Gizli
            </span>
          ) : bankActive ? (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              Banka
            </span>
          ) : pageSecure ? (
            <span title="Güvenli (HTTPS)">
              <Lock className="h-4 w-4 shrink-0 text-success" />
            </span>
          ) : isInternal ? (
            <Globe className="h-4 w-4 shrink-0 text-fg-subtle" />
          ) : (
            <span title="Güvensiz (HTTP)">
              <Globe className="h-4 w-4 shrink-0 text-amber-400" />
            </span>
          )}
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              window.setTimeout(() => setFocused(false), 180);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, Math.max(suggestions.length - 1, 0)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const s = suggestions[highlight];
                if (s) applySuggestion(s, e.altKey);
                else
                  commit(value, {
                    newTab: e.altKey,
                    autoComplete: e.ctrlKey || e.metaKey,
                  });
              } else if (e.key === 'Escape') {
                setValue(active?.url ?? '');
                setFocused(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Adres veya ara"
            className="h-10 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            spellCheck={false}
            autoComplete="off"
          />
          <Search className="h-4 w-4 shrink-0 text-fg-subtle" />
        </div>

        {focused && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-bg-elevated/95 py-1 shadow-2xl backdrop-blur-xl">
            {suggestions.map((s, i) => {
              const sec = securityOf(s.url);
              return (
                <li key={`${s.kind}-${s.url}-${s.tabId ?? i}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(s)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${
                      i === highlight ? 'bg-brand/20 text-fg' : 'text-fg-muted hover:bg-white/5 hover:text-fg'
                    }`}
                  >
                    {s.kind === 'tab' ? (
                      <Globe className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                    ) : s.kind === 'bookmark' ? (
                      <Star className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                    ) : s.kind === 'history' ? (
                      <HistoryIcon className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Search className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.label}</div>
                      {s.subtitle && (
                        <div className="truncate text-[11px] text-fg-subtle">{s.subtitle}</div>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        sec === 'secure'
                          ? 'bg-success/15 text-success'
                          : sec === 'insecure'
                            ? 'bg-amber-500/15 text-amber-300'
                            : sec === 'internal'
                              ? 'bg-white/10 text-fg-muted'
                              : 'bg-brand/15 text-brand'
                      }`}
                    >
                      {s.kind === 'tab'
                        ? 'Sekme'
                        : sec === 'secure'
                          ? 'Güvenli'
                          : sec === 'insecure'
                            ? 'HTTP'
                            : sec === 'internal'
                              ? 'Dahili'
                              : 'Ara'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!isInternal && active && (
        <>
          <Tooltip label={isBookmarked ? 'Favorilerden çıkar' : 'Favorilere ekle'}>
            <button
              type="button"
              onClick={toggleFav}
              className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                isBookmarked
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-fg-muted hover:bg-white/5 hover:text-amber-300'
              }`}
              aria-label="Favori"
            >
              <Star className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          </Tooltip>
          <MediaControls disabled={isInternal} />
          <Tooltip label={readerOn ? 'Okuyucu Modunu kapat' : 'Okuyucu Modu'}>
            <button
              onClick={toggleReader}
              className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                readerOn ? 'bg-brand/20 text-brand' : 'text-fg-muted hover:bg-white/5 hover:text-fg'
              }`}
            >
              <Reader className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip label={deepFocusOn ? 'Sessiz Mod kapalı yap' : 'Sessiz Mod (Deep Focus)'}>
            <button
              onClick={toggleDeepFocus}
              className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                deepFocusOn ? 'bg-brand/20 text-brand' : 'text-fg-muted hover:bg-white/5 hover:text-fg'
              }`}
            >
              <Focus className="h-4 w-4" />
            </button>
          </Tooltip>
        </>
      )}

      <Tooltip label={`${blockedTotal} izleyici/reklam isteği engellendi`}>
        <div className="flex h-8 items-center gap-1.5 rounded-lg bg-success/10 px-2 text-xs font-medium text-success">
          <Shield className="h-3.5 w-3.5" />
          {blockedTotal}
        </div>
      </Tooltip>

      <Tooltip label={scriptBlockerOn ? 'JavaScript kapalı' : 'JavaScript açık'}>
        <div
          className={`flex h-8 items-center rounded-lg px-2 text-[10px] font-semibold tracking-wide ${
            scriptBlockerOn ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-fg-muted'
          }`}
        >
          JS {scriptBlockerOn ? 'kapalı' : 'açık'}
        </div>
      </Tooltip>

      {loading && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-white/5">
          <div className="h-full w-1/3 animate-pulse-soft bg-brand" />
        </div>
      )}
    </div>
  );
}
