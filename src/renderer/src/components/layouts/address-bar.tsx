import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Copy,
  Check,
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
import { QrShare } from './qr-share';
import { TEMP_LINK_EVENT } from './temp-link-panel';
import { LinkIcon } from '@renderer/components/ui/icons';
import { getActiveWebviewControl } from './webview-control-bus';
import { showToast } from './toast-bus';

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
  const fpEnabled = useSettings((s) => s.settings.privacy.fingerprint.enabled);
  const fpMode = useSettings((s) => s.settings.privacy.fingerprint.mode ?? 'compatibility');
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
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [sitePaused, setSitePaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchGlow, setSearchGlow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!overflowOpen) return;
    const onDown = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOverflowOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [overflowOpen]);

  const activeHost = useMemo(() => {
    try {
      if (!active?.url || !/^https?:\/\//i.test(active.url)) return null;
      return new URL(active.url).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }, [active?.url]);

  useEffect(() => {
    if (!activeHost) {
      setSitePaused(false);
      return;
    }
    void window.aether.privacy.isSitePaused(activeHost).then((res) => {
      if (res.ok) setSitePaused(!!res.data);
    });
  }, [activeHost]);

  const toggleSiteProtection = async () => {
    if (!activeHost || !active) {
      showToast('Yalnızca http(s) sitelerde kullanılabilir', 'error');
      return;
    }
    if (sitePaused) {
      await window.aether.privacy.resumeSite(activeHost);
      setSitePaused(false);
      showToast(`Koruma açıldı: ${activeHost}`, 'success');
    } else {
      await window.aether.privacy.pauseSite(activeHost);
      setSitePaused(true);
      showToast(`Bu sitede koruma durduruldu: ${activeHost}`, 'info');
    }
    getActiveWebviewControl().hardReload();
  };

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

    const trimmedInput = value.trim();
    if (isUrl(trimmedInput)) {
      const url = /^https?:\/\//i.test(trimmedInput) ? trimmedInput : `https://${trimmedInput}`;
      // URL eşleşmesini en üste al
      out.unshift({ kind: 'url', label: url, url, subtitle: 'Adrese git' });
    } else {
      // Arama eşleşmesini en üste al
      out.unshift({
        kind: 'search',
        label: `"${trimmedInput}" ara`,
        url: (SEARCH_URLS[engine] ?? SEARCH_URLS.duckduckgo)(trimmedInput),
        subtitle: engine,
      });
    }

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

  const navigateTo = (url: string, opts?: { newTab?: boolean; background?: boolean }) => {
    let next = url;
    if (urlCleanerOn) next = cleanTrackingParams(next);
    if (opts?.background) {
      useTabs.getState().openBackground(next);
      // Odak kutuda kalır
      return;
    }
    if (opts?.newTab) {
      open(next);
    } else if (active) {
      update(active.id, { url: next, loading: !next.startsWith('aethernode://') });
    } else {
      open(next);
    }
    setFocused(false);
    inputRef.current?.blur();
  };

  const commit = (raw: string, opts?: { newTab?: boolean; autoComplete?: boolean; background?: boolean }) => {
    let input = raw;
    if (opts?.autoComplete && /^[\w-]+$/.test(input.trim())) {
      input = `www.${input.trim()}.com`;
    }
    navigateTo(toUrl(input, engine), opts);
  };

  const applySuggestion = (s: Suggestion, opts?: { newTab?: boolean; background?: boolean }) => {
    if (s.kind === 'tab' && s.tabId && !opts?.newTab && !opts?.background) {
      activate(s.tabId);
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    if (s.kind === 'search') {
      commit(value, opts);
      return;
    }
    navigateTo(s.url, opts);
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

  const copyLink = async () => {
    if (!active?.url) return;
    try {
      await navigator.clipboard.writeText(active.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    } catch {
      showToast('Kopyalanamadı', 'error');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text && !isUrl(text.trim())) {
      setSearchGlow(true);
      window.setTimeout(() => setSearchGlow(false), 700);
    }
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
        <div className={`group flex w-full items-center gap-2 rounded-xl border bg-bg-elevated/60 px-3 focus-within:ring-2 transition ${searchGlow ? 'border-accent/50 ring-accent/25 shadow-[0_0_12px_rgba(59,130,246,0.3)]' : 'border-white/10 focus-within:border-brand/50 focus-within:ring-brand/25'}`}>
          {isIncognito ? (
            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
              Gizli
            </span>
          ) : bankActive ? (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              Banka
            </span>
          ) : pageSecure ? (
            <span title="Güvenli (HTTPS)" className="transition duration-200 hover:scale-110">
              <Lock className="h-4 w-4 shrink-0 text-success" />
            </span>
          ) : isInternal ? (
            <span className="transition duration-200 hover:scale-110"><Globe className="h-4 w-4 shrink-0 text-fg-subtle" /></span>
          ) : (
            <span title="Güvensiz (HTTP)" className="transition duration-200 hover:scale-110">
              <Globe className="h-4 w-4 shrink-0 text-amber-400" />
            </span>
          )}
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onPaste={handlePaste}
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
                const bg = e.ctrlKey || e.metaKey;
                const s = suggestions[highlight];
                if (s) applySuggestion(s, { background: bg, newTab: e.altKey && !bg });
                else
                  commit(value, {
                    newTab: e.altKey && !bg,
                    background: bg,
                    autoComplete: e.shiftKey,
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
          <button
            type="button"
            onClick={() => void copyLink()}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-fg-subtle transition hover:bg-white/5 hover:text-fg"
            aria-label="Linki kopyala"
            title="Linki kopyala"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Check className="h-3.5 w-3.5 text-success" />
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
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
                    onMouseDown={(e) => {
                      // Ctrl / orta tık = arka plan; sol tık = mevcut davranış
                      if (e.button === 1 || e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        applySuggestion(s, { background: true });
                        return;
                      }
                      e.preventDefault(); // blur olmasın diye
                    }}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        applySuggestion(s, { background: true });
                        return;
                      }
                      applySuggestion(s, { newTab: e.altKey });
                    }}
                    onAuxClick={(e) => {
                      if (e.button === 1) {
                        e.preventDefault();
                        applySuggestion(s, { background: true });
                      }
                    }}
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
          <QrShare url={active.url} disabled={isInternal} />
          <Tooltip label="Sayfayı çevir (Ctrl+Shift+Y)">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('aether:translate-page'))}
              className="grid h-8 w-8 place-items-center rounded-lg text-fg-muted transition hover:bg-white/5 hover:text-fg"
              aria-label="Çevir"
            >
              <span className="text-[10px] font-bold">Aa</span>
            </button>
          </Tooltip>
        </>
      )}


      <Tooltip
        side="bottom"
        align="end"
        label={
          sitePaused
            ? `Koruma bu sitede kapalı — tıklayınca yeniden açılır (${blockedTotal} engel sayacı)`
            : `${blockedTotal} izleyici/reklam isteği engellendi. Tıklayınca bu sitede korumayı durdurursunuz.`
        }
      >
        <button
          type="button"
          onClick={() => void toggleSiteProtection()}
          onContextMenu={(e) => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('aether:shield-panel'));
          }}
          className={`flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition ${
            sitePaused
              ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
              : 'bg-success/10 text-success hover:bg-success/20'
          }`}
          aria-label={sitePaused ? 'Korumayı aç' : 'Bu sitede korumayı durdur'}
        >
          <Shield className="h-3.5 w-3.5 shrink-0" />
          <span>{sitePaused ? 'Kapalı' : blockedTotal}</span>
        </button>
      </Tooltip>

      <div className="relative" ref={overflowRef}>
        <Tooltip label="Diğer araçlar" side="left">
          <button
            type="button"
            onClick={() => setOverflowOpen((v) => !v)}
            className={`grid h-8 w-8 place-items-center rounded-lg transition ${
              overflowOpen
                ? 'bg-white/10 text-fg'
                : 'text-fg-muted hover:bg-white/5 hover:text-fg'
            }`}
            aria-label="Menü"
            aria-expanded={overflowOpen}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </Tooltip>
        {overflowOpen && (
          <div className="absolute right-0 top-9 z-[80] w-64 overflow-hidden rounded-xl border border-white/10 bg-bg-elevated/95 py-1 shadow-2xl backdrop-blur-xl">
            {!isInternal && active && (
              <>
                <OverflowItem
                  label="Geçici bağlantı"
                  hint="Ctrl+Shift+K"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent(TEMP_LINK_EVENT));
                    setOverflowOpen(false);
                  }}
                  icon={<LinkIcon className="h-3.5 w-3.5" />}
                />
                <OverflowItem
                  label="Uygulama olarak aç (PWA)"
                  onClick={() => {
                    if (active && /^https:\/\//i.test(active.url)) {
                      void window.aether.pwa.open(active.url, active.title || undefined);
                    }
                    setOverflowOpen(false);
                  }}
                  icon={<span className="text-[9px] font-bold">App</span>}
                />
                <OverflowItem
                  label={readerOn ? 'Okuyucu modunu kapat' : 'Okuyucu modu'}
                  active={readerOn}
                  onClick={() => {
                    toggleReader();
                    setOverflowOpen(false);
                  }}
                  icon={<Reader className="h-3.5 w-3.5" />}
                />
                <OverflowItem
                  label={deepFocusOn ? 'Sessiz modu kapat' : 'Sessiz mod (Deep Focus)'}
                  active={deepFocusOn}
                  onClick={() => {
                    toggleDeepFocus();
                    setOverflowOpen(false);
                  }}
                  icon={<Focus className="h-3.5 w-3.5" />}
                />
                <OverflowItem
                  label={
                    sitePaused
                      ? 'Bu sitede korumayı aç'
                      : 'Bu sitede korumayı durdur (reklam/izleyici)'
                  }
                  active={sitePaused}
                  onClick={() => {
                    void toggleSiteProtection();
                    setOverflowOpen(false);
                  }}
                  icon={<Shield className="h-3.5 w-3.5" />}
                />
                <OverflowItem
                  label="Koruma paneli"
                  hint="Ctrl+Shift+S"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('aether:shield-panel'));
                    setOverflowOpen(false);
                  }}
                  icon={<Shield className="h-3.5 w-3.5" />}
                />
                <div className="my-1 border-t border-white/5" />
              </>
            )}
            {fpEnabled && (
              <div className="px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-fg-subtle">Parmak izi</div>
                <div
                  className={`mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium ${
                    fpMode === 'uniformity'
                      ? 'bg-indigo-500/20 text-indigo-100'
                      : 'bg-white/5 text-fg'
                  }`}
                >
                  <span className="grid h-5 w-5 place-items-center rounded bg-black/30 text-[10px] font-bold">
                    {fpMode === 'uniformity' ? 'U' : 'R'}
                  </span>
                  {fpMode === 'uniformity' ? 'Uniformity' : 'Uyumluluk'}
                </div>
              </div>
            )}
            <div className="px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-fg-subtle">JavaScript</div>
              <div
                className={`mt-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${
                  scriptBlockerOn ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-fg-muted'
                }`}
              >
                JS {scriptBlockerOn ? 'kapalı' : 'açık'}
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-white/5">
          <div className="h-full w-1/3 animate-pulse-soft bg-brand" />
        </div>
      )}
    </div>
  );
}

function OverflowItem({
  label,
  hint,
  icon,
  active,
  onClick,
}: {
  label: string;
  hint?: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-white/5 ${
        active ? 'text-brand' : 'text-fg'
      }`}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center text-fg-muted">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="text-[10px] text-fg-subtle">{hint}</span>}
    </button>
  );
}

