import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, Reorder, useMotionValue, useTransform } from 'framer-motion';
import { useTabs } from '@renderer/store/tabs';
import { useBookmarks } from '@renderer/store/bookmarks';
import { useHistory } from '@renderer/store/history';
import { useNetwork } from '@renderer/store/network';
import { useSettings } from '@renderer/store/settings';
import { useSecurity } from '@renderer/store/security';
import { Search, Shield, Star, HistoryIcon, Globe, Plus, Pin as PinIcon } from '@renderer/components/ui/icons';
import { cleanTrackingParams } from '@shared/utils';
import { useOwnTabId } from '@renderer/router';
import { showToast } from '@renderer/components/layouts/toast-bus';
import wpMountain1 from '@renderer/assets/wallpapers/wp-mountain-1.svg';
import wpMountain2 from '@renderer/assets/wallpapers/wp-mountain-2.svg';
import wpMountain3 from '@renderer/assets/wallpapers/wp-mountain-3.svg';
import wpMountain4 from '@renderer/assets/wallpapers/wp-mountain-4.svg';
import wpForest1 from '@renderer/assets/wallpapers/wp-forest-1.svg';
import wpForest2 from '@renderer/assets/wallpapers/wp-forest-2.svg';
import wpForest3 from '@renderer/assets/wallpapers/wp-forest-3.svg';
import wpForest4 from '@renderer/assets/wallpapers/wp-forest-4.svg';
import wpAurora1 from '@renderer/assets/wallpapers/wp-aurora-1.svg';
import wpAurora2 from '@renderer/assets/wallpapers/wp-aurora-2.svg';
import wpAurora3 from '@renderer/assets/wallpapers/wp-aurora-3.svg';
import wpAurora4 from '@renderer/assets/wallpapers/wp-aurora-4.svg';
import wpAurora5 from '@renderer/assets/wallpapers/wp-aurora-5.svg';
import wpDesert1 from '@renderer/assets/wallpapers/wp-desert-1.svg';
import wpDesert2 from '@renderer/assets/wallpapers/wp-desert-2.svg';
import wpDesert3 from '@renderer/assets/wallpapers/wp-desert-3.svg';
import wpDesert4 from '@renderer/assets/wallpapers/wp-desert-4.svg';
import wpOcean1 from '@renderer/assets/wallpapers/wp-ocean-1.svg';
import wpOcean2 from '@renderer/assets/wallpapers/wp-ocean-2.svg';
import wpOcean3 from '@renderer/assets/wallpapers/wp-ocean-3.svg';
import wpOcean4 from '@renderer/assets/wallpapers/wp-ocean-4.svg';
import wpOcean5 from '@renderer/assets/wallpapers/wp-ocean-5.svg';
import wpLavender1 from '@renderer/assets/wallpapers/wp-lavender-1.svg';
import wpLavender2 from '@renderer/assets/wallpapers/wp-lavender-2.svg';
import wpLavender3 from '@renderer/assets/wallpapers/wp-lavender-3.svg';
import wpLavender4 from '@renderer/assets/wallpapers/wp-lavender-4.svg';
import wpDawn1 from '@renderer/assets/wallpapers/wp-dawn-1.svg';
import wpNightcity1 from '@renderer/assets/wallpapers/wp-nightcity-1.svg';
import wpPolar1 from '@renderer/assets/wallpapers/wp-polar-1.svg';
import wpCyber1 from '@renderer/assets/wallpapers/wp-cyber-1.svg';
import wpAbstract1 from '@renderer/assets/wallpapers/wp-abstract-1.svg';

/**
 * Yerel duvar kâğıdı görselleri — uygulama ile paketlenir, CDN/ağ yok.
 * Her sekmenin wallpaperIndex'i farklı bir manzara seçer; görsel yüklenene
 * kadar uyumlu gradient arka plan gösterilir.
 */
import wpGen1 from '@renderer/assets/wallpapers/wp-gen-1.svg';
import wpGen2 from '@renderer/assets/wallpapers/wp-gen-2.svg';
import wpGen3 from '@renderer/assets/wallpapers/wp-gen-3.svg';
import wpGen4 from '@renderer/assets/wallpapers/wp-gen-4.svg';
import wpGen5 from '@renderer/assets/wallpapers/wp-gen-5.svg';
import wpGen6 from '@renderer/assets/wallpapers/wp-gen-6.svg';
import wpGen7 from '@renderer/assets/wallpapers/wp-gen-7.svg';
import wpGen8 from '@renderer/assets/wallpapers/wp-gen-8.svg';
import wpGen9 from '@renderer/assets/wallpapers/wp-gen-9.svg';
import wpGen10 from '@renderer/assets/wallpapers/wp-gen-10.svg';
import wpGen11 from '@renderer/assets/wallpapers/wp-gen-11.svg';
import wpGen12 from '@renderer/assets/wallpapers/wp-gen-12.svg';
import wpGen13 from '@renderer/assets/wallpapers/wp-gen-13.svg';
import wpGen14 from '@renderer/assets/wallpapers/wp-gen-14.svg';
import wpGen15 from '@renderer/assets/wallpapers/wp-gen-15.svg';
import wpGen16 from '@renderer/assets/wallpapers/wp-gen-16.svg';
import wpGen17 from '@renderer/assets/wallpapers/wp-gen-17.svg';
import wpGen18 from '@renderer/assets/wallpapers/wp-gen-18.svg';
import wpGen19 from '@renderer/assets/wallpapers/wp-gen-19.svg';
import wpGen20 from '@renderer/assets/wallpapers/wp-gen-20.svg';
import wpGen21 from '@renderer/assets/wallpapers/wp-gen-21.svg';
import wpGen22 from '@renderer/assets/wallpapers/wp-gen-22.svg';
import wpGen23 from '@renderer/assets/wallpapers/wp-gen-23.svg';
import wpGen24 from '@renderer/assets/wallpapers/wp-gen-24.svg';
import wpGen25 from '@renderer/assets/wallpapers/wp-gen-25.svg';
import wpGen26 from '@renderer/assets/wallpapers/wp-gen-26.svg';
import wpGen27 from '@renderer/assets/wallpapers/wp-gen-27.svg';
import wpGen28 from '@renderer/assets/wallpapers/wp-gen-28.svg';
import wpGen29 from '@renderer/assets/wallpapers/wp-gen-29.svg';
import wpGen30 from '@renderer/assets/wallpapers/wp-gen-30.svg';

const LANDSCAPES = [
  { credit: 'Tasarım: Neon Waves', image: wpGen1, fallback: 'linear-gradient(135deg, #2E1065 0%, #5B21B6 100%)' },
  { credit: 'Tasarım: Mint Particles', image: wpGen2, fallback: 'linear-gradient(135deg, #022C22 0%, #065F46 100%)' },
  { credit: 'Tasarım: Magma Geometry', image: wpGen3, fallback: 'linear-gradient(135deg, #450A0A 0%, #991B1B 100%)' },
  { credit: 'Tasarım: Deep Aurora', image: wpGen4, fallback: 'linear-gradient(135deg, #082F49 0%, #0369A1 100%)' },
  { credit: 'Tasarım: Void Mesh', image: wpGen5, fallback: 'linear-gradient(135deg, #020617 0%, #1E293B 100%)' },
  { credit: 'Tasarım: Neon Grid', image: wpGen6, fallback: 'linear-gradient(135deg, #2E1065 0%, #5B21B6 100%)' },
  { credit: 'Tasarım: Mint Waves', image: wpGen7, fallback: 'linear-gradient(135deg, #022C22 0%, #065F46 100%)' },
  { credit: 'Tasarım: Magma Particles', image: wpGen8, fallback: 'linear-gradient(135deg, #450A0A 0%, #991B1B 100%)' },
  { credit: 'Tasarım: Deep Geometry', image: wpGen9, fallback: 'linear-gradient(135deg, #082F49 0%, #0369A1 100%)' },
  { credit: 'Tasarım: Void Aurora', image: wpGen10, fallback: 'linear-gradient(135deg, #020617 0%, #1E293B 100%)' },
  { credit: 'Tasarım: Neon Mesh', image: wpGen11, fallback: 'linear-gradient(135deg, #2E1065 0%, #5B21B6 100%)' },
  { credit: 'Tasarım: Mint Grid', image: wpGen12, fallback: 'linear-gradient(135deg, #022C22 0%, #065F46 100%)' },
  { credit: 'Tasarım: Magma Waves', image: wpGen13, fallback: 'linear-gradient(135deg, #450A0A 0%, #991B1B 100%)' },
  { credit: 'Tasarım: Deep Particles', image: wpGen14, fallback: 'linear-gradient(135deg, #082F49 0%, #0369A1 100%)' },
  { credit: 'Tasarım: Void Geometry', image: wpGen15, fallback: 'linear-gradient(135deg, #020617 0%, #1E293B 100%)' },
  { credit: 'Tasarım: Neon Aurora', image: wpGen16, fallback: 'linear-gradient(135deg, #2E1065 0%, #5B21B6 100%)' },
  { credit: 'Tasarım: Mint Mesh', image: wpGen17, fallback: 'linear-gradient(135deg, #022C22 0%, #065F46 100%)' },
  { credit: 'Tasarım: Magma Grid', image: wpGen18, fallback: 'linear-gradient(135deg, #450A0A 0%, #991B1B 100%)' },
  { credit: 'Tasarım: Deep Waves', image: wpGen19, fallback: 'linear-gradient(135deg, #082F49 0%, #0369A1 100%)' },
  { credit: 'Tasarım: Void Particles', image: wpGen20, fallback: 'linear-gradient(135deg, #020617 0%, #1E293B 100%)' },
  { credit: 'Tasarım: Neon Geometry', image: wpGen21, fallback: 'linear-gradient(135deg, #2E1065 0%, #5B21B6 100%)' },
  { credit: 'Tasarım: Mint Aurora', image: wpGen22, fallback: 'linear-gradient(135deg, #022C22 0%, #065F46 100%)' },
  { credit: 'Tasarım: Magma Mesh', image: wpGen23, fallback: 'linear-gradient(135deg, #450A0A 0%, #991B1B 100%)' },
  { credit: 'Tasarım: Deep Grid', image: wpGen24, fallback: 'linear-gradient(135deg, #082F49 0%, #0369A1 100%)' },
  { credit: 'Tasarım: Void Waves', image: wpGen25, fallback: 'linear-gradient(135deg, #020617 0%, #1E293B 100%)' },
  { credit: 'Tasarım: Neon Particles', image: wpGen26, fallback: 'linear-gradient(135deg, #2E1065 0%, #5B21B6 100%)' },
  { credit: 'Tasarım: Mint Geometry', image: wpGen27, fallback: 'linear-gradient(135deg, #022C22 0%, #065F46 100%)' },
  { credit: 'Tasarım: Magma Aurora', image: wpGen28, fallback: 'linear-gradient(135deg, #450A0A 0%, #991B1B 100%)' },
  { credit: 'Tasarım: Deep Mesh', image: wpGen29, fallback: 'linear-gradient(135deg, #082F49 0%, #0369A1 100%)' },
  { credit: 'Tasarım: Void Grid', image: wpGen30, fallback: 'linear-gradient(135deg, #020617 0%, #1E293B 100%)' },

  { credit: 'Cyber Grid — Neon', image: wpCyber1, fallback: 'linear-gradient(180deg, #4F46E5 0%, #020617 100%)' },
  { credit: 'Abstract Waves — Purple', image: wpAbstract1, fallback: 'linear-gradient(180deg, #1E1B4B 0%, #312E81 100%)' },
  { credit: 'Dağ alacakaranlığı — mor gece', image: wpMountain1, fallback: 'linear-gradient(0deg, #0f0c29 0%, #302b63 100%)' },
  { credit: 'Dağ zirvesi — sisli', image: wpMountain2, fallback: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { credit: 'Dağ — gün doğumu', image: wpMountain3, fallback: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 100%)' },
  { credit: 'Dağ — alacakaranlık', image: wpMountain4, fallback: 'linear-gradient(100deg, #1a1a2e 0%, #0f3460 100%)' },
  { credit: 'Orman — sisli', image: wpForest1, fallback: 'linear-gradient(180deg, #081c15 0%, #2d6a4f 100%)' },
  { credit: 'Orman derinliği', image: wpForest2, fallback: 'linear-gradient(180deg, #0a1f0a 0%, #2d5016 100%)' },
  { credit: 'Orman — derin yeşil', image: wpForest3, fallback: 'linear-gradient(100deg, #0a1f0a 0%, #2d5016 100%)' },
  { credit: 'Orman — karanlık', image: wpForest4, fallback: 'linear-gradient(50deg, #0f2027 0%, #2d5016 100%)' },
  { credit: 'Aurora — soluk', image: wpAurora1, fallback: 'linear-gradient(180deg, #0a0e27 0%, #283593 100%)' },
  { credit: 'Aurora — yeşil dalga', image: wpAurora2, fallback: 'linear-gradient(160deg, #0a0e27 0%, #283593 100%)' },
  { credit: 'Aurora — mor perde', image: wpAurora3, fallback: 'linear-gradient(160deg, #0f2027 0%, #2c5364 100%)' },
  { credit: 'Aurora — yeşil-mavi', image: wpAurora4, fallback: 'linear-gradient(100deg, #1a237e 0%, #00e676 100%)' },
  { credit: 'Aurora — mor-yeşil', image: wpAurora5, fallback: 'linear-gradient(100deg, #283593 0%, #00e676 100%)' },
  { credit: 'Çöl — gün batımı', image: wpDesert1, fallback: 'linear-gradient(180deg, #1d1135 0%, #e8a87c 100%)' },
  { credit: 'Çöl kanyonu', image: wpDesert2, fallback: 'linear-gradient(0deg, #2c0b0e 0%, #c97b3d 100%)' },
  { credit: 'Çöl — kızıl', image: wpDesert3, fallback: 'linear-gradient(45deg, #2c0b0e 0%, #ff6f00 100%)' },
  { credit: 'Çöl — sıcak', image: wpDesert4, fallback: 'linear-gradient(90deg, #7b2d26 0%, #c97b3d 100%)' },
  { credit: 'Okyanus — derin', image: wpOcean1, fallback: 'linear-gradient(180deg, #03045e 0%, #00b4d8 100%)' },
  { credit: 'Okyanus gün batımı', image: wpOcean2, fallback: 'linear-gradient(0deg, #001f3f 0%, #ff851b 100%)' },
  { credit: 'Okyanus — alacakaranlık', image: wpOcean3, fallback: 'linear-gradient(180deg, #000428 0%, #ff5e62 100%)' },
  { credit: 'Okyanus — derin mavi', image: wpOcean4, fallback: 'linear-gradient(100deg, #001f3f 0%, #ff851b 100%)' },
  { credit: 'Okyanus — gece', image: wpOcean5, fallback: 'linear-gradient(50deg, #000428 0%, #004e92 100%)' },
  { credit: 'Lavanta — sisli', image: wpLavender1, fallback: 'linear-gradient(100deg, #0d0221 0%, #5c2751 100%)' },
  { credit: 'Lavanta gecesi', image: wpLavender2, fallback: 'linear-gradient(145deg, #0d0221 0%, #1a0a2e 100%)' },
  { credit: 'Lavanta — mor sis', image: wpLavender3, fallback: 'radial-gradient(circle, #8e44ad 0%, #1a0a2e 100%)' },
  { credit: 'Lavanta — açık', image: wpLavender4, fallback: 'linear-gradient(30deg, #4a1a6b 0%, #e1bee7 100%)' },
  { credit: 'Şafak — sıcak', image: wpDawn1, fallback: 'linear-gradient(0deg, #ff7e5f 0%, #86a8e7 100%)' },
  { credit: 'Gece şehri', image: wpNightcity1, fallback: 'linear-gradient(0deg, #0f0c29 0%, #302b63 100%)' },
  { credit: 'Kutup — buz', image: wpPolar1, fallback: 'linear-gradient(180deg, #e0f2f1 0%, #4db6ac 100%)' },
] as const;

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
  // Bu dashboard'un ait olduğu sekme (split sağ panelde farklıdır)
  const ownTabId = useOwnTabId();
  const update = useTabs((s) => s.update);
  const active = useTabs(
    (s) => s.tabs.find((t) => t.id === (ownTabId ?? s.activeId)) ?? s.tabs[0],
  );
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
  const pinnedWallpaper = useSettings((s) => s.settings.general.pinnedWallpaper);
  const bg = useMemo(() => {
    if (pinnedWallpaper != null) return LANDSCAPES[pinnedWallpaper % LANDSCAPES.length]!;
    const idx = active?.wallpaperIndex ?? 0;
    return LANDSCAPES[idx % LANDSCAPES.length]!;
  }, [pinnedWallpaper, active?.wallpaperIndex]);
  const [showWallpapers, setShowWallpapers] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Parallax — fareye tepki daha belirgin
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tx = useTransform(mx, (v) => v * -14);
  const ty = useTransform(my, (v) => v * -10);
  const handleParallax = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    mx.set(dx);
    my.set(dy);
  };

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
      if (b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)) {
        out.push({ kind: 'bookmark', label: b.title || b.url, url: b.url });
      }
      if (out.length >= 4) break;
    }
    for (const h of history) {
      if ((h.title || '').toLowerCase().includes(q) || h.url.toLowerCase().includes(q)) {
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

  const [dismissedSites, setDismissedSites] = useState<string[]>(() => {
    try {
      const v = localStorage.getItem('aether.dismissedTopSites');
      return v ? (JSON.parse(v) as string[]) : [];
    } catch {
      return [];
    }
  });

  const topSites = useMemo(() => {
    // URL bazlı tekilleştirme — aynı site iki kez görünmesin (React key çakışması) + kaldırılanlar hariç
    const dismissedSet = new Set(dismissedSites.map((u) => u.replace(/\/+$/, '')));
    const seen = new Set<string>();
    const out: { title: string; url: string }[] = [];
    const push = (title: string, url: string) => {
      const norm = url.replace(/\/+$/, '');
      if (dismissedSet.has(norm) || seen.has(norm) || out.length >= 6) return;
      seen.add(norm);
      out.push({ title, url });
    };
    for (const b of bookmarks) {
      if (b.url && /^https?:\/\//i.test(b.url)) push(b.title, b.url);
    }
    if (out.length < 6) {
      for (const h of history) {
        if (/^https?:\/\//i.test(h.url)) push(h.title || h.url, h.url);
      }
    }
    return out;
  }, [bookmarks, history, dismissedSites]);

  const dismissSite = (url: string) => {
    const norm = url.replace(/\/+$/, '');
    setDismissedSites((prev) => {
      if (prev.includes(norm)) return prev;
      const next = [...prev, norm];
      try { localStorage.setItem('aether.dismissedTopSites', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const openBg = useTabs((s) => s.openBackground);

  // Chrome davranışı: normal tık → bu sekme; Ctrl/Cmd+tık veya orta tık → arka plan
  const navigate = (rawUrl: string, opts?: { background?: boolean }) => {
    const url = urlCleanerOn ? cleanTrackingParams(rawUrl) : rawUrl;
    if (opts?.background) {
      openBg(url);
      showToast('Arka planda sekme açıldı — aramada kalıyorsun', 'success', 2800);
      return;
    }
    if (active) {
      update(active.id, { url, loading: !url.startsWith('aethernode://') });
    }
  };

  const commit = (raw: string, opts?: { background?: boolean }) => {
    const input = raw.trim();
    if (!input) return;
    let url: string;
    if (/^https?:\/\//i.test(input) || /^[\w-]+(\.[\w-]+)+/.test(input)) {
      url = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    } else {
      url = (SEARCH_URLS[engine] ?? SEARCH_URLS.duckduckgo)(input);
    }
    navigate(url, opts);
  };

  /** Öneri satırı: Ctrl/orta tık = arka plan. mousedown'da işlenir (click'ten daha güvenilir). */
  const openSuggestion = (
    s: Suggestion,
    e: { ctrlKey: boolean; metaKey: boolean; button: number; preventDefault: () => void; stopPropagation?: () => void },
  ) => {
    e.preventDefault();
    e.stopPropagation?.();
    const bg = e.button === 1 || e.ctrlKey || e.metaKey;
    if (s.kind === 'search') commit(query, { background: bg });
    else navigate(s.url, { background: bg });
  };

  const isNight = hour < 6 || hour >= 21;
  const lightScene = bg.credit.includes('Okyanus');

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden" onMouseMove={handleParallax} onMouseLeave={() => { mx.set(0); my.set(0); }}>
      <motion.div className="pointer-events-none absolute inset-0" style={{ x: tx, y: ty }}>
        {/* Görsel yüklenene kadar uyumlu gradient */}
        <div className="absolute inset-0" style={{ background: bg.fallback }} />
        <motion.img
          key={bg.credit}
          src={bg.image}
          alt=""
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: [1, 1.04] }}
          transition={{ opacity: { duration: 1.6, ease: 'easeOut' }, scale: { duration: 28, repeat: Infinity, repeatType: 'reverse', ease: 'linear' } }}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            backgroundSize: '180px 180px',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: lightScene
              ? isNight
                ? 'linear-gradient(180deg, rgba(9,9,11,0.55) 0%, rgba(9,9,11,0.35) 45%, rgba(9,9,11,0.65) 100%)'
                : 'linear-gradient(180deg, rgba(9,9,11,0.25) 0%, rgba(9,9,11,0.15) 45%, rgba(9,9,11,0.45) 100%)'
              : isNight
                ? 'linear-gradient(180deg, rgba(9,9,11,0.55) 0%, rgba(9,9,11,0.35) 40%, rgba(9,9,11,0.65) 100%)'
                : 'linear-gradient(180deg, rgba(9,9,11,0.4) 0%, rgba(9,9,11,0.22) 45%, rgba(9,9,11,0.55) 100%)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(9,9,11,0.4)_100%)]" />
      </motion.div>

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
          <h1 className="mt-5 text-2xl font-medium text-white/95 sm:text-3xl">{greeting}</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
          className="relative w-full max-w-xl"
        >
          <motion.div
            animate={{
              scale: focused ? 1.012 : 1,
              boxShadow: focused
                ? '0 0 0 2px rgba(255,255,255,0.14), 0 16px 48px rgba(0,0,0,0.45)'
                : '0 8px 32px rgba(0,0,0,0.35)',
            }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 backdrop-blur-xl ${
              focused
                ? 'border-white/25 bg-black/45 ring-2 ring-white/15'
                : 'border-white/10 bg-black/35'
            }`}
          >
            <Search className="h-5 w-5 shrink-0 text-white/50" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setFocused(false), 150);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const bg = e.ctrlKey || e.metaKey;
                  const first = suggestions[0];
                  if (first && first.kind !== 'search') navigate(first.url, { background: bg });
                  else commit(query, { background: bg });
                }
              }}
              placeholder={`${engine} ile ara veya adres yaz…`}
              className="w-full bg-transparent text-[15px] text-white placeholder:text-white/40 focus:outline-none"
              spellCheck={false}
              autoFocus
            />
            <button
              type="button"
              title="Sesli arama"
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => {
                const SR =
                  (
                    window as unknown as {
                      webkitSpeechRecognition?: new () => {
                        lang: string;
                        onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
                        onerror: (() => void) | null;
                        start: () => void;
                      };
                    }
                  ).webkitSpeechRecognition;
                if (!SR) {
                  showToast('Bu ortamda sesli arama desteklenmiyor', 'error');
                  return;
                }
                const rec = new SR();
                rec.lang = 'tr-TR';
                rec.onresult = (e) => {
                  const t = e.results[0]?.[0]?.transcript;
                  if (t) {
                    setQuery(t);
                    commit(t);
                  }
                };
                rec.onerror = () => showToast('Ses algılanamadı', 'error');
                rec.start();
                showToast('Dinleniyor…', 'info', 2000);
              }}
            >
              Mic
            </button>
          </motion.div>

          <AnimatePresence>
            {focused && suggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-white/10 bg-black/70 py-1 shadow-2xl backdrop-blur-xl"
              >
                <li className="px-4 py-1.5 text-[10.5px] text-white/40">
                  Ctrl+tık veya orta tık → arka planda aç · sağdaki + ile de açılır
                </li>
                {suggestions.map((s) => (
                  <li key={`${s.kind}-${s.url}`}>
                    <div className="flex items-center gap-0.5 px-1">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          // Odak input'ta kalsın; gezinmeyi burada bitir
                          if (e.button === 2) return; // sağ tık menüsü serbest
                          openSuggestion(s, e);
                        }}
                        onClick={(e) => e.preventDefault()}
                        onAuxClick={(e) => {
                          if (e.button === 1) openSuggestion(s, e);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          // Sağ tık = her zaman arka planda aç
                          if (s.kind === 'search') commit(query, { background: true });
                          else navigate(s.url, { background: true });
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/85 hover:bg-white/10"
                      >
                        {s.kind === 'bookmark' ? (
                          <Star className="h-3.5 w-3.5 shrink-0 text-amber-300/80" />
                        ) : s.kind === 'history' ? (
                          <HistoryIcon className="h-3.5 w-3.5 shrink-0 text-white/45" />
                        ) : (
                          <Search className="h-3.5 w-3.5 shrink-0 text-sky-300/80" />
                        )}
                        <span className="truncate">{s.label}</span>
                      </button>
                      <button
                        type="button"
                        title="Arka planda yeni sekmede aç"
                        aria-label="Arka planda aç"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (s.kind === 'search') commit(query, { background: true });
                          else navigate(s.url, { background: true });
                        }}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>

        {topSites.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-10 flex max-w-2xl flex-wrap justify-center gap-3"
          >
            {topSites.map((s) => (
              <div key={s.url} className="group relative flex w-[4.5rem] flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => navigate(s.url, { background: e.ctrlKey || e.metaKey })}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      navigate(s.url, { background: true });
                    }
                  }}
                  className="flex w-full flex-col items-center gap-2"
                  title={`${s.url} — Ctrl+tık: arka planda aç`}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white/80 backdrop-blur-md transition group-hover:border-white/25 group-hover:bg-white/20">
                    <Globe className="h-5 w-5" />
                  </span>
                  <span className="w-full truncate text-center text-[11px] text-white/65">
                    {s.title}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismissSite(s.url); }}
                  className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white/70 opacity-0 backdrop-blur transition hover:bg-black/80 hover:text-white group-hover:opacity-100"
                  aria-label="Kaldır"
                  title="Kaldır"
                >
                  <span className="text-[10px] leading-none">×</span>
                </button>
              </div>
            ))}
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 flex flex-col items-center gap-2">
          <button type="button" onClick={() => setShowWallpapers((v) => !v)} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/70 backdrop-blur hover:bg-white/10 hover:text-white">
            {showWallpapers ? 'Duvar kağıdını kapat' : 'Duvar Kağıdı · Seç / Sabitle'}
          </button>
          {showWallpapers && (
            <div className="grid max-h-80 max-w-2xl grid-cols-4 gap-2 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-xl sm:grid-cols-6">
              {LANDSCAPES.map((w, i) => {
                const isPinned = pinnedWallpaper === i;
                const isActive = (pinnedWallpaper ?? (active?.wallpaperIndex ?? 0) % LANDSCAPES.length) === i;
                return (
                  <button
                    key={w.credit}
                    type="button"
                    onClick={() => {
                      const s = useSettings.getState().settings;
                      const next = isPinned ? null : i;
                      void useSettings.getState().apply({ ...s, general: { ...s.general, pinnedWallpaper: next } });
                    }}
                    className={`group relative overflow-hidden rounded-xl border-2 transition ${isPinned ? 'border-brand shadow-glow' : isActive ? 'border-white/30' : 'border-white/10 hover:border-white/20'}`}
                    title={`${w.credit}${isPinned ? ' · sabitlendi' : ''}`}
                  >
                    <img src={w.image} alt={w.credit} className="h-16 w-full object-cover" draggable={false} />
                    <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-center text-[9px] text-white/80">{w.credit}</span>
                    {isActive && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-[10px] text-black">✓</span>}
                    {isPinned && <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand text-white"><PinIcon className="h-3 w-3" /></span>}
                  </button>
                );
              })}
            </div>
          )}
          {pinnedWallpaper != null && <p className="text-[11px] text-white/50">Sabit duvar kağıdı aktif — tüm yeni sekmelerde aynı görsel gösteriliyor.</p>}
        </motion.div>
      </div>

      <DailySummaryBanner />

      <motion.footer
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="relative z-10 mx-auto mb-6 flex w-full max-w-3xl flex-wrap items-stretch justify-center gap-3 px-6"
      >
        <StaggerStats
          stats={[
            { icon: <Shield className="h-3.5 w-3.5" />, label: 'Engellenen', value: String(blockedTotal), hint: 'izleyici / reklam' },
            { label: 'Koruma', value: scan?.grade ?? '—', hint: scan ? `${scan.score}/100` : 'taranıyor', variant: !scan ? 'default' : scan.grade === 'A+' || scan.grade === 'A' ? 'success' : scan.grade === 'B' ? 'warning' : 'danger' },
            { label: 'Sekmeler', value: String(tabsCount), hint: 'açık' },
            { label: 'Yer imi', value: String(bookmarks.filter((b) => b.url).length), hint: 'kayıtlı' },
          ]}
        />
        <div className="flex items-end pb-1 text-[10px] text-white/35">{bg.credit}</div>
      </motion.footer>
    </div>
  );
}

function DailySummaryBanner() {
  const tabs = useTabs((s) => s.tabs);
  const settings = useSettings((s) => s.settings);
  const apply = useSettings((s) => s.apply);
  const [visible, setVisible] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return settings.general.dailySummaryDismissedDate !== today;
  });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (settings.general.dailySummaryDismissedDate !== today) setVisible(true);
    const id = window.setInterval(() => {
      const t = new Date().toISOString().slice(0, 10);
      if (settings.general.dailySummaryDismissedDate !== t) setVisible(true);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [settings.general.dailySummaryDismissedDate]);

  if (!visible) return null;
  const today = new Date().toISOString().slice(0, 10);
  const openedToday = tabs.filter((t) => {
    const d = new Date(t.createdAt ?? t.lastActiveAt ?? Date.now()).toISOString().slice(0, 10);
    return d === today;
  }).length;
  const total = openedToday > 0 ? openedToday : tabs.length;
  const stillOpen = tabs.length;
  if (total === 0) return null;

  const dismiss = () => {
    setVisible(false);
    void apply({ ...settings, general: { ...settings.general, dailySummaryDismissedDate: today } });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 mx-auto mt-4 flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-xl"
    >
      <span className="text-xs text-white/80">
        Bugün <b className="text-white">{total} sekme</b> açtın, <b className="text-white">{stillOpen}</b>'si hâlâ açık
      </span>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
      >
        Kapat
      </button>
    </motion.div>
  );
}

function StaggerStats({ stats }: { stats: Array<{ icon?: ReactNode; label: string; value: string; hint: string; variant?: 'default' | 'success' | 'warning' | 'danger' }> }) {
  const settings = useSettings((s) => s.settings);
  const apply = useSettings((s) => s.apply);
  const order = (settings.general.dashboardStatsOrder?.length ? settings.general.dashboardStatsOrder : ['blocked', 'protection', 'tabs', 'bookmarks']) as string[];
  const hidden = new Set(settings.general.dashboardStatsHidden ?? []);
  const [manageOpen, setManageOpen] = useState(false);

  const labelToId: Record<string, string> = { 'Engellenen': 'blocked', 'Koruma': 'protection', 'Sekmeler': 'tabs', 'Yer imi': 'bookmarks' };
  const withId = stats.map((s) => ({ ...s, id: labelToId[s.label] ?? s.label.toLowerCase() }));
  const visible = withId.filter((s) => !hidden.has(s.id));
  const sortedVisible = [...visible].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  const canHide = visible.length > 1;

  const onReorder = (newOrder: typeof sortedVisible) => {
    const newIds = newOrder.map((s) => s.id);
    const hiddenIds = order.filter((id) => hidden.has(id));
    const full = [...newIds, ...hiddenIds];
    void apply({ ...settings, general: { ...settings.general, dashboardStatsOrder: full } });
  };

  const toggleHide = (id: string) => {
    const isHidden = hidden.has(id);
    if (!isHidden && visible.length <= 1) return;
    const nextHidden = isHidden ? [...hidden].filter((x) => x !== id) : [...hidden, id];
    void apply({ ...settings, general: { ...settings.general, dashboardStatsHidden: nextHidden } });
  };

  if (visible.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-6">
        <p className="text-sm text-white/70">Tüm kartlar gizlendi</p>
        <button type="button" onClick={() => setManageOpen(true)} className="rounded-lg bg-brand px-3 py-1 text-xs text-white">Kartları Yönet</button>
        {manageOpen && (
          <div className="mt-2 flex flex-wrap gap-2">
            {withId.map((s) => (
              <label key={s.id} className="flex items-center gap-1 text-xs text-white/80"><input type="checkbox" checked={!hidden.has(s.id)} onChange={() => toggleHide(s.id)} className="accent-brand" /> {s.label}</label>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Reorder.Group axis="x" values={sortedVisible} onReorder={onReorder} className="flex flex-1 flex-wrap gap-3" as="div">
        {sortedVisible.map((s, i) => (
          <Reorder.Item key={s.id} value={s} dragListener={true} as="div" className="min-w-[6.5rem] flex-1">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.06, duration: 0.35, ease: 'easeOut' }}
              className="group relative"
            >
              <Stat {...s} />
              {canHide && (
                <button
                  type="button"
                  onClick={() => toggleHide(s.id)}
                  title="Gizle"
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md bg-black/40 text-white/40 opacity-0 backdrop-blur transition hover:bg-black/60 hover:text-white group-hover:opacity-100"
                >
                  <span className="text-[10px]">✕</span>
                </button>
              )}
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <button type="button" onClick={() => setManageOpen((v) => !v)} className="self-end rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-white/60 hover:text-white">
        {manageOpen ? 'Kapat' : 'Kartları Yönet'}
      </button>
      {manageOpen && (
        <div className="flex w-full flex-wrap gap-3 rounded-xl border border-white/10 bg-black/40 p-3">
          {withId.map((s) => (
            <label key={s.id} className="flex items-center gap-1.5 text-xs text-white/80">
              <input type="checkbox" checked={!hidden.has(s.id)} onChange={() => toggleHide(s.id)} className="accent-brand" /> {s.label}
            </label>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  variant = 'default',
}: {
  label: string;
  value: string;
  hint: string;
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const color =
    variant === 'success' ? 'text-emerald-300'
    : variant === 'warning' ? 'text-amber-300'
    : variant === 'danger' ? 'text-red-300'
    : 'text-white';
  const dot =
    variant === 'success' ? '●'
    : variant === 'warning' ? '▲'
    : variant === 'danger' ? '■'
    : '';
  const cardBorder =
    variant === 'success' ? 'border-emerald-500/25 bg-emerald-500/8'
    : variant === 'warning' ? 'border-amber-500/25 bg-amber-500/8'
    : variant === 'danger' ? 'border-red-500/25 bg-red-500/8'
    : 'border-white/10 bg-black/30';
  return (
    <div className={`min-w-[6.5rem] flex-1 rounded-2xl border px-4 py-3 backdrop-blur-xl transition-colors duration-300 ${cardBorder}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/45">
        {icon}
        {label}
      </div>
      <motion.div key={value} initial={{ scale: 0.92 }} animate={{ scale: [0.92, 1.13, 1] }} transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }} className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>
        {dot && <span className="mr-1 text-xs">{dot}</span>}{value}
      </motion.div>
      <div className="text-[10px] text-white/40">{hint}</div>
    </div>
  );
}
