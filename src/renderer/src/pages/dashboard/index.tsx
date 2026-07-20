import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabs } from '@renderer/store/tabs';
import { useBookmarks } from '@renderer/store/bookmarks';
import { useHistory } from '@renderer/store/history';
import { useNetwork } from '@renderer/store/network';
import { useSettings } from '@renderer/store/settings';
import { useSecurity } from '@renderer/store/security';
import { Search, Shield, Star, HistoryIcon, Globe } from '@renderer/components/ui/icons';
import { cleanTrackingParams } from '@shared/utils';

// Her açılışta rastgele seçilen manzara havuzu (Unsplash — yarı saydam overlay ile).
const LANDSCAPES = [
  {
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80&auto=format',
    credit: 'Dağlar',
  },
  {
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80&auto=format',
    credit: 'Sisli orman',
  },
  {
    url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80&auto=format',
    credit: 'Doğa',
  },
  {
    url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&q=80&auto=format',
    credit: 'Orman yolu',
  },
  {
    url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1920&q=80&auto=format',
    credit: 'Göl',
  },
  {
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80&auto=format',
    credit: 'Yıldızlı dağ',
  },
  {
    url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80&auto=format',
    credit: 'Yeşil vadi',
  },
  {
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80&auto=format',
    credit: 'Sahil',
  },
  {
    url: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1920&q=80&auto=format',
    credit: 'Göl kenarı',
  },
  {
    url: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=1920&q=80&auto=format',
    credit: 'Sis',
  },
];

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

function greetingForHour(h: number): string {
  if (h < 5) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 17) return 'İyi günler';
  if (h < 21) return 'İyi akşamlar';
  return 'İyi geceler';
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return useMemo(() => {
    const h = now.getHours();
    return {
      time: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      greeting: greetingForHour(h),
      hour: h,
    };
  }, [now]);
}

interface Suggestion {
  kind: 'history' | 'bookmark' | 'search';
  label: string;
  url: string;
}

export default function Dashboard() {
  const open = useTabs((s) => s.open);
  const active = useTabs((s) => s.tabs.find((t) => t.id === s.activeId) ?? s.tabs[0]);
  const tabsCount = useTabs((s) => s.tabs.length);
  const bookmarks = useBookmarks((s) => s.nodes);
  const history = useHistory((s) => s.entries);
  const loadHistory = useHistory((s) => s.load);
  const blockedTotal = useNetwork((s) => s.blockedTotal);
  const loadNetwork = useNetwork((s) => s.load);
  const engine = useSettings((s) => s.settings.general.defaultSearchEngine);
  const urlCleanerOn = useSettings((s) => s.settings.privacy.urlCleaner.enabled);
  const scan = useSecurity((s) => s.scan);
  const runScan = useSecurity((s) => s.runScan);

  const { time, date, greeting, hour } = useClock();
  // Her sekmenin kendi wallpaperIndex'i — yeni sekmede farklı manzara
  const bg = useMemo(() => {
    const idx = active?.wallpaperIndex ?? 0;
    return LANDSCAPES[idx % LANDSCAPES.length]!;
  }, [active?.id, active?.wallpaperIndex]);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadHistory();
    void loadNetwork();
    void runScan();
  }, [loadHistory, loadNetwork, runScan]);

  const suggestions = useMemo((): Suggestion[] => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const out: Suggestion[] = [];
    for (const b of bookmarks) {
      if (!b.url) continue;
      if (
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q)
      ) {
        out.push({ kind: 'bookmark', label: b.title || b.url, url: b.url });
      }
      if (out.length >= 4) break;
    }
    for (const h of history) {
      if (
        (h.title || '').toLowerCase().includes(q) ||
        h.url.toLowerCase().includes(q)
      ) {
        if (!out.some((s) => s.url === h.url)) {
          out.push({ kind: 'history', label: h.title || h.url, url: h.url });
        }
      }
      if (out.length >= 7) break;
    }
    out.push({
      kind: 'search',
      label: `"${query.trim()}" ara — ${engine}`,
      url: (SEARCH_URLS[engine] ?? SEARCH_URLS.duckduckgo)(query.trim()),
    });
    return out.slice(0, 8);
  }, [query, bookmarks, history, engine]);

  const topSites = useMemo(() => {
    const fromBookmarks = bookmarks
      .filter((b) => b.url && /^https?:\/\//i.test(b.url))
      .slice(0, 6)
      .map((b) => ({ title: b.title, url: b.url! }));
    if (fromBookmarks.length >= 4) return fromBookmarks;
    const fromHistory = history
      .filter((h) => /^https?:\/\//i.test(h.url))
      .slice(0, 6 - fromBookmarks.length)
      .map((h) => ({ title: h.title || h.url, url: h.url }));
    return [...fromBookmarks, ...fromHistory].slice(0, 6);
  }, [bookmarks, history]);

  const commit = (raw: string) => {
    let input = raw.trim();
    if (!input) return;
    let url: string;
    if (/^https?:\/\//i.test(input) || /^[\w-]+(\.[\w-]+)+/.test(input)) {
      url = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    } else {
      url = (SEARCH_URLS[engine] ?? SEARCH_URLS.duckduckgo)(input);
    }
    if (urlCleanerOn) url = cleanTrackingParams(url);
    open(url);
  };

  const isNight = hour < 6 || hour >= 21;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* Tam ekran manzara — yarı saydam overlay */}
      <div className="pointer-events-none absolute inset-0">
        <motion.img
          key={bg.url}
          src={bg.url}
          alt=""
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: isNight
              ? 'linear-gradient(180deg, rgba(9,9,11,0.72) 0%, rgba(9,9,11,0.55) 40%, rgba(9,9,11,0.78) 100%)'
              : 'linear-gradient(180deg, rgba(9,9,11,0.55) 0%, rgba(9,9,11,0.35) 45%, rgba(9,9,11,0.7) 100%)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(9,9,11,0.45)_100%)]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="mb-8 text-center"
        >
          <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.28em] text-white/50">
            POF
          </div>
          <div className="text-6xl font-semibold tracking-tight text-white drop-shadow-lg sm:text-7xl tabular-nums">
            {time}
          </div>
          <div className="mt-2 text-sm capitalize text-white/60">{date}</div>
          <h1 className="mt-5 text-2xl font-medium text-white/95 sm:text-3xl">
            {greeting}
          </h1>
        </motion.div>

        {/* Arama */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
          className="relative w-full max-w-xl"
        >
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl transition ${
              focused
                ? 'border-white/25 bg-black/45 ring-2 ring-white/15'
                : 'border-white/10 bg-black/35'
            } backdrop-blur-xl`}
          >
            <Search className="h-5 w-5 shrink-0 text-white/50" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                // öneri tıklaması için kısa gecikme
                window.setTimeout(() => setFocused(false), 150);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const first = suggestions[0];
                  if (first && first.kind !== 'search') open(first.url);
                  else commit(query);
                }
              }}
              placeholder={`${engine} ile ara veya adres yaz…`}
              className="w-full bg-transparent text-[15px] text-white placeholder:text-white/40 focus:outline-none"
              spellCheck={false}
              autoFocus
            />
          </div>

          <AnimatePresence>
            {focused && suggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-white/10 bg-black/70 py-1 shadow-2xl backdrop-blur-xl"
              >
                {suggestions.map((s) => (
                  <li key={`${s.kind}-${s.url}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (s.kind === 'search') commit(query);
                        else open(s.url);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white/85 hover:bg-white/10"
                    >
                      {s.kind === 'bookmark' ? (
                        <Star className="h-3.5 w-3.5 text-amber-300/80" />
                      ) : s.kind === 'history' ? (
                        <HistoryIcon className="h-3.5 w-3.5 text-white/45" />
                      ) : (
                        <Search className="h-3.5 w-3.5 text-sky-300/80" />
                      )}
                      <span className="truncate">{s.label}</span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Hızlı siteler */}
        {topSites.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-10 flex max-w-2xl flex-wrap justify-center gap-3"
          >
            {topSites.map((s) => (
              <button
                key={s.url}
                type="button"
                onClick={() => open(s.url)}
                className="group flex w-[4.5rem] flex-col items-center gap-2"
                title={s.url}
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white/80 backdrop-blur-md transition group-hover:border-white/25 group-hover:bg-white/20">
                  <Globe className="h-5 w-5" />
                </span>
                <span className="w-full truncate text-center text-[11px] text-white/65">
                  {s.title}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Alt istatistik şeridi */}
      <motion.footer
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="relative z-10 mx-auto mb-6 flex w-full max-w-3xl flex-wrap items-stretch justify-center gap-3 px-6"
      >
        <Stat
          icon={<Shield className="h-3.5 w-3.5" />}
          label="Engellenen"
          value={String(blockedTotal)}
          hint="izleyici / reklam"
        />
        <Stat
          label="Koruma"
          value={scan?.grade ?? '—'}
          hint={scan ? `${scan.score}/100` : 'taranıyor'}
        />
        <Stat label="Sekmeler" value={String(tabsCount)} hint="açık" />
        <Stat
          label="Yer imi"
          value={String(bookmarks.filter((b) => b.url).length)}
          hint="kayıtlı"
        />
        <div className="flex items-end pb-1 text-[10px] text-white/35">
          {bg.credit}
        </div>
      </motion.footer>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-[6.5rem] flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/45">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-white tabular-nums">{value}</div>
      <div className="text-[10px] text-white/40">{hint}</div>
    </div>
  );
}
