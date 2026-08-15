import { Sidebar } from './sidebar';
import { TabBar } from './tab-bar';
import { VerticalTabBar } from './vertical-tab-bar';
import { TabGroupMenu } from './tab-group-menu';
import { TempLinkPanel } from './temp-link-panel';
import { AddressBar } from './address-bar';
import { BookmarksBar } from './bookmarks-bar';
import { ContentArea } from './content-area';
import { FindBar } from './find-bar';
import { TabSearch } from './tab-search';
import { CommandPalette } from './command-palette';
import { ShieldPanel } from './shield-panel';
import { WorkspaceSwitcher } from './workspace-switcher';
import { BankFrame } from './bank-frame';
import { ToastHost } from './toast-host';
import { WelcomeScreen } from './welcome-screen';
import { VpnPromoOverlay } from '@renderer/components/promo/AetherNodePromoCard';
import { showToast } from './toast-bus';
import { useShortcuts, useFindBarOpen, persistSession } from '@renderer/hooks/use-shortcuts';
import { useVaultIdle } from '@renderer/hooks/use-vault-idle';
import { useEffect, useState } from 'react';
import { useTabs } from '@renderer/store/tabs';
import { useSettings } from '@renderer/store/settings';
import { useDownloads } from '@renderer/store/downloads';
import { useArchive } from '@renderer/store/archive';
import { useWorkspaces } from '@renderer/store/workspaces';
import { getActiveWebviewControl } from './webview-control-bus';
import { TRANSLATE_EVENT, LITTLE_ARC_EVENT } from './command-palette';
import { RelaxPanel } from './relax-panel';
import { PermissionPopup } from './permission-popup';

const DISCARD_IDLE_MS = 15 * 60 * 1000;
const DISCARD_TICK_MS = 60 * 1000;

import { CamouflageOverlay } from './camouflage-overlay';
import { useAuraTheme } from '@renderer/hooks/use-aura-theme';

export function AppShell() {
  useShortcuts();
  useVaultIdle();
  useAuraTheme();
  
  const [findOpen, setFindOpen] = useFindBarOpen();
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [camouflageActive, setCamouflageActive] = useState(false);

  useEffect(() => {
    const onCamouflage = () => setCamouflageActive(prev => !prev);
    window.addEventListener('aether:camouflage', onCamouflage);
    return () => window.removeEventListener('aether:camouflage', onCamouflage);
  }, []);

  const memorySaver = useSettings((s) => s.settings.general.memorySaver);
  const autoArchive = useSettings((s) => s.settings.general.autoArchiveTabs);
  const archiveMinutes = useSettings((s) => s.settings.general.autoArchiveMinutes);
  const resourceLimiter = useSettings((s) => s.settings.general.resourceLimiter);
  const tabLayout = useSettings((s) => s.settings.general.tabLayout);
  const settingsLoaded = useSettings((s) => s.loaded);
  const discardInactive = useTabs((s) => s.discardInactive);
  const tabs = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const update = useTabs((s) => s.update);
  const close = useTabs((s) => s.close);
  const subscribeDownloads = useDownloads((s) => s.subscribe);
  const workspaceId = useWorkspaces((s) => s.activeId);

  const hasSeenWelcomeScreen = useSettings((s) => s.settings.general.hasSeenWelcomeScreen);
  useEffect(() => {
    if (!settingsLoaded) return;
    if (hasSeenWelcomeScreen) return;
    setShowWelcomeScreen(true);
  }, [settingsLoaded, hasSeenWelcomeScreen]);

  // Madde 1: Accent tema uygula
  const accentTheme = useSettings((s) => s.settings.general.accentTheme);
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentTheme ?? 'purple');
  }, [accentTheme]);

  useEffect(() => {
    persistSession();
  }, [tabs, activeId]);

  useEffect(() => {
    const active = tabs.find((t) => t.id === activeId);
    const title = active?.title?.trim();
    document.title = title ? `${title} — AetherNode` : 'AetherNode Secure Browser';
  }, [tabs, activeId]);

  useEffect(() => subscribeDownloads(), [subscribeDownloads]);

  useEffect(() => {
    if (!memorySaver && !resourceLimiter) return;
    const idle = resourceLimiter ? Math.min(DISCARD_IDLE_MS, 5 * 60 * 1000) : DISCARD_IDLE_MS;
    const id = window.setInterval(() => discardInactive(idle), DISCARD_TICK_MS);
    return () => window.clearInterval(id);
  }, [memorySaver, resourceLimiter, discardInactive]);

  // Otomatik sekme arşivi
  useEffect(() => {
    if (!autoArchive) return;
    const ms = Math.max(5, archiveMinutes) * 60 * 1000;
    const id = window.setInterval(() => {
      const state = useTabs.getState();
      const now = Date.now();
      for (const t of state.tabs) {
        if (t.id === state.activeId || t.id === state.splitId || t.pinned) continue;
        if (t.url.startsWith('aethernode://')) continue;
        if (t.audible) continue;
        if (now - t.lastActiveAt < ms) continue;
        useArchive.getState().add({
          url: t.url,
          title: t.title,
          faviconUrl: t.faviconUrl,
          workspaceId: t.workspaceId,
        });
        close(t.id);
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, [autoArchive, archiveMinutes, close]);

  useEffect(() => {
    return window.aether.on('aethernode/guest/contextDeepFocus', () => {
      const state = useTabs.getState();
      const active = state.tabs.find((t) => t.id === state.activeId);
      if (!active || active.url.startsWith('aethernode://')) return;
      const next = !active.deepFocus;
      update(active.id, { deepFocus: next });
      getActiveWebviewControl().setDeepFocus(next);
    });
  }, [update]);

  useEffect(() => {
    const onTranslate = () => {
      const active = useTabs.getState().tabs.find((t) => t.id === useTabs.getState().activeId);
      if (!active || !/^https?:\/\//i.test(active.url)) {
        showToast('Çevrilecek http(s) sayfa yok', 'error');
        return;
      }
      const lang = useSettings.getState().settings.general.translateTarget || 'tr';
      // Mevcut sekmede Google Translate üzerinden aç (yeni sekme değil)
      getActiveWebviewControl().sendToGuest('aethernode/guest/translate', lang);
      showToast('Sayfa çevriliyor…', 'info', 2500);
    };
    const onLittle = () => {
      const active = useTabs.getState().tabs.find((t) => t.id === useTabs.getState().activeId);
      const url = active && /^https?:\/\//i.test(active.url) ? active.url : 'https://duckduckgo.com';
      void window.aether.window.openLittle(url);
    };
    window.addEventListener(TRANSLATE_EVENT, onTranslate);
    window.addEventListener(LITTLE_ARC_EVENT, onLittle);
    return () => {
      window.removeEventListener(TRANSLATE_EVENT, onTranslate);
      window.removeEventListener(LITTLE_ARC_EVENT, onLittle);
    };
  }, []);

  useEffect(() => {
    return window.aether.on('aethernode/guest/gestureClose', () => {
      const id = useTabs.getState().activeId;
      if (id) close(id);
    });
  }, [close]);

  // Bellek basıncı — main process limit aşımını algılayınca renderer'a bildirir
  useEffect(() => {
    interface MemoryPressurePayload {
      excessMb: number;
      totalUsageMb: number;
      limitMb: number;
      discardedUrls: string[];
    }

    return window.aether.on('aethernode/performance/memory/pressure', (raw) => {
      const p = raw as MemoryPressurePayload;
      if (!p || !p.discardedUrls?.length) return;

      const state = useTabs.getState();
      let discardedCount = 0;

      // URL bazlı eşleştirme ile sekmeleri discard et
      for (const url of p.discardedUrls) {
        const tab = state.tabs.find(
          (t) =>
            t.url === url &&
            t.id !== state.activeId &&
            t.id !== state.splitId &&
            !t.pinned &&
            !t.audible &&
            !t.url.startsWith('aethernode://'),
        );
        if (tab) {
          state.update(tab.id, { discarded: true, loading: false });
          discardedCount++;
        }
      }

      if (discardedCount > 0) {
        showToast(
          `Bellek limiti aşıldı (${Math.round(p.totalUsageMb)} MB / ${p.limitMb} MB) — ${discardedCount} sekme uyutuldu`,
          'info',
          6000,
        );
      }
    });
  }, []);

  // Workspace değişince sekmeleri etiketle (yeni sekmeler)
  useEffect(() => {
    /* workspaceId filter UI'da uygulanır */
  }, [workspaceId]);

  // Madde 11: güncelleme gelince hasSeenUpdate = false
  useEffect(() => {
    return window.aether.on('aethernode/updater/available', () => {
      const s = useSettings.getState().settings;
      if (s.general.hasSeenUpdate) {
        void useSettings.getState().apply({ ...s, general: { ...s.general, hasSeenUpdate: false } });
      }
    });
  }, []);

  const vertical = tabLayout === 'vertical';

  return (
    <div className="relative flex h-full flex-col bg-bg">
      {/* Arka planda global Aura Glow efekti */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-10 blur-[120px] transition-colors duration-1000 ease-out" 
        style={{ backgroundColor: 'var(--brand-500)' }} 
      />
      
      <div className="flex min-h-0 flex-1 relative z-10">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col">
          <TabBar showTabs={!vertical} />
          <AddressBar />
          <BookmarksBar />
          <WorkspaceSwitcher />
          <div className="flex min-h-0 flex-1">
            {vertical && <VerticalTabBar />}
            <div className="relative min-h-0 min-w-0 flex-1">
              <FindBar open={findOpen} onClose={() => setFindOpen(false)} />
              <ContentArea />
              <ToastHost />
              <TabSearch />
              <CommandPalette />
              <ShieldPanel />
              <PermissionPopup />
            </div>
          </div>
        </main>
      </div>
      <TabGroupMenu />
      <TempLinkPanel />
      <BankFrame />
      <RelaxPanel />
      {showWelcomeScreen && <WelcomeScreen onDone={() => setShowWelcomeScreen(false)} />}
      <VpnPromoOverlay />
      <CamouflageOverlay active={camouflageActive} onExit={() => setCamouflageActive(false)} />
    </div>
  );
}
