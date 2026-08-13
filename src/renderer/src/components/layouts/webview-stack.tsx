import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTabs } from '@renderer/store/tabs';
import { useHistory } from '@renderer/store/history';
import { useSettings } from '@renderer/store/settings';
import { resolveInternalRoute } from '@renderer/router';
import { USER_AGENTS } from '@shared/constants/app';
import { isBankUrl } from '@shared/utils';
import type { WebviewElement } from '@renderer/types/webview';
import { setActiveWebviewControl } from './webview-control-bus';
import { registerWebview, setWebviewReady } from './webview-registry';
import { showToast } from './toast-bus';

let cachedPreloadPath: string | null = null;

function useGuestPreloadPath(): string | null {
  const [path, setPath] = useState<string | null>(cachedPreloadPath);
  useEffect(() => {
    if (cachedPreloadPath) return;
    void window.aether.guest.preloadPath().then((res) => {
      if (res.ok && typeof res.data === 'string') {
        cachedPreloadPath = res.data;
        setPath(res.data);
      }
    });
  }, []);
  return path;
}

export function WebviewStack() {
  const tabs = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const splitId = useTabs((s) => s.splitId);
  const update = useTabs((s) => s.update);
  const recordHistory = useHistory((s) => s.record);
  const userAgentId = useSettings((s) => s.settings.general.userAgent);
  const bankModeEnabled = useSettings((s) => s.settings.privacy.bankMode?.enabled !== false);
  const perTabIsolation = useSettings((s) => !!s.settings.privacy.cookies.perTabIsolation);
  const preloadPath = useGuestPreloadPath();

  if (!preloadPath) return <div className="h-full w-full bg-bg-base" />;

  const userAgent = USER_AGENTS[userAgentId] ?? '';
  const splitOn = !!(splitId && splitId !== activeId);

  return (
    <div className="relative h-full w-full bg-bg-base">
      {tabs.map((t) => {
        const r = resolveInternalRoute(t.url);
        if (r.internal) return null;
        const isPrimary = activeId === t.id;
        const isSecondary = splitOn && splitId === t.id;
        const isVisible = isPrimary || isSecondary;
        const isIncognito = t.profileId === 'incognito';
        const isBank = bankModeEnabled && isBankUrl(t.url);
        const partition = isIncognito
          ? 'incognito'
          : isBank
            ? 'persist:bank'
            : t.containerId
              ? `persist:ct:${t.containerId}`
              : perTabIsolation
                ? `persist:tab:${t.id}`
                : 'persist:default';

        if (t.discarded && !isVisible) {
          return null;
        }

        return (
          <TabWebview
            key={`${t.id}-${userAgentId}-${partition}`}
            tabId={t.id}
            url={t.url}
            muted={!!t.muted}
            partition={partition}
            preloadPath={preloadPath}
            userAgent={userAgent}
            isActive={isPrimary}
            isVisible={isVisible}
            pane={splitOn ? (isPrimary ? 'left' : isSecondary ? 'right' : 'hidden') : 'full'}
            deepFocus={!!t.deepFocus}
            readerMode={!!t.readerMode}
            onUpdate={(patch) => update(t.id, patch)}
            onVisit={(url, title) => {
              if (!isIncognito) recordHistory(url, title);
            }}
          />
        );
      })}
      {splitOn && (
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-white/15"
          aria-hidden
        />
      )}
    </div>
  );
}

interface TabWebviewProps {
  tabId: string;
  url: string;
  muted: boolean;
  partition: string;
  preloadPath: string;
  userAgent: string;
  isActive: boolean;
  isVisible: boolean;
  pane: 'full' | 'left' | 'right' | 'hidden';
  deepFocus: boolean;
  readerMode: boolean;
  onUpdate: (patch: {
    url?: string;
    title?: string;
    loading?: boolean;
    faviconUrl?: string;
    audible?: boolean;
  }) => void;
  onVisit: (url: string, title: string) => void;
}

// Geçici ağ hataları — sunucu bağlantıyı kapattı / zaman aşımı / DNS gecikti.
// Tek otomatik yeniden deneme çoğu durumda sayfayı kurtarır.
const TRANSIENT_NET_ERRORS = new Set([
  -7, // ERR_TIMED_OUT
  -100, // ERR_CONNECTION_CLOSED
  -101, // ERR_CONNECTION_RESET
  -102, // ERR_CONNECTION_REFUSED (proxy geçişi anı)
  -105, // ERR_NAME_NOT_RESOLVED (DoH ilk sorgu gecikmesi)
  -118, // ERR_CONNECTION_TIMED_OUT
  -324, // ERR_EMPTY_RESPONSE
]);

function TabWebview({
  tabId,
  url,
  muted,
  partition,
  preloadPath,
  userAgent,
  isActive,
  isVisible,
  pane,
  deepFocus,
  readerMode,
  onUpdate,
  onVisit,
}: TabWebviewProps) {
  const ref = useRef<WebviewElement | null>(null);
  const domReady = useRef(false);
  const initialUrl = useRef(url);
  const retriedUrl = useRef<string | null>(null);
  useEffect(() => {
    registerWebview(tabId, ref.current);
    setWebviewReady(tabId, false);
    return () => {
      registerWebview(tabId, null);
      setWebviewReady(tabId, false);
    };
  }, [tabId]);

  useEffect(() => {
    void window.aether.guest.attachPartition(partition);
  }, [partition]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !domReady.current) return;
    try {
      if (el.getURL() !== url) {
        el.loadURL(url).catch(() => {
          /* yönlendirme yarışları */
        });
      }
    } catch {
      /* henüz attach değil */
    }
  }, [url]);

  useEffect(() => {
    setActiveWebviewControl(isActive ? ref.current : null);
    return () => {
      if (isActive) setActiveWebviewControl(null);
    };
  }, [isActive]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !domReady.current) return;
    try {
      el.setAudioMuted(muted);
    } catch {
      /* yoksay */
    }
  }, [muted]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !domReady.current) return;
    try {
      el.send('aethernode/guest/deepFocus', deepFocus);
    } catch {
      /* yoksay */
    }
  }, [deepFocus]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !domReady.current) return;
    try {
      el.send('aethernode/guest/readerMode', readerMode);
    } catch {
      /* yoksay */
    }
  }, [readerMode]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onStart = () => onUpdate({ loading: true });
    const onStop = () => {
      onUpdate({ loading: false });
      // Başarılı yükleme sonrası retry hakkını tazele
      try {
        const cur = el.getURL();
        if (cur && retriedUrl.current && cur !== retriedUrl.current) retriedUrl.current = null;
      } catch {
        /* yoksay */
      }
    };
    const onTitle = (e?: Event & { title?: string }) => {
      try {
        const title = e?.title ?? el.getTitle() ?? '';
        onUpdate({ title });
        onVisit(el.getURL(), title);
      } catch {
        /* yoksay */
      }
    };
    const onFavicon = (e?: Event & { favicons?: string[] }) => {
      const icon = e?.favicons?.[0];
      if (icon) onUpdate({ faviconUrl: icon });
    };
    const onNav = (e?: Event & { url?: string }) => {
      try {
        const navUrl = e?.url ?? el.getURL();
        if (!navUrl) return;
        onUpdate({ url: navUrl });
        onVisit(navUrl, '');
      } catch {
        /* yoksay */
      }
    };
    const onNavInPage = (e?: Event & { url?: string }) => {
      try {
        const navUrl = e?.url ?? el.getURL();
        if (navUrl) onUpdate({ url: navUrl });
      } catch {
        /* yoksay */
      }
    };
    const onDomReady = () => {
      domReady.current = true;
      registerWebview(tabId, el);
      setWebviewReady(tabId, true);
      try {
        el.setAudioMuted(muted);
        if (deepFocus) el.send('aethernode/guest/deepFocus', true);
        if (readerMode) el.send('aethernode/guest/readerMode', true);
        try {
          const host = new URL(el.getURL() || url).hostname;
          void import('@renderer/store/boosts').then(({ useBoosts }) => {
            const b = useBoosts.getState().getForHost(host);
            if (b) el.send('aethernode/guest/boost', { css: b.css, js: b.js });
          });
        } catch {
          /* yoksay */
        }

      } catch {
        /* yoksay */
      }
    };
    const onMediaStart = () => onUpdate({ audible: true });
    const onMediaPause = () => {
      window.setTimeout(() => {
        try {
          if (typeof el.isCurrentlyAudible === 'function' && el.isCurrentlyAudible()) return;
        } catch {
          /* yoksay */
        }
        onUpdate({ audible: false });
      }, 400);
    };
    const onFail = (
      e?: Event & {
        errorCode?: number;
        errorDescription?: string;
        validatedURL?: string;
        isMainFrame?: boolean;
      },
    ) => {
      if (!e?.isMainFrame) return;
      // -3 = ERR_ABORTED (yönlendirme) — gösterme
      if (e.errorCode === -3) return;

      // Geçici hata: aynı URL için BİR kez otomatik yeniden dene
      const failedUrl = e.validatedURL || '';
      if (
        typeof e.errorCode === 'number' &&
        TRANSIENT_NET_ERRORS.has(e.errorCode) &&
        failedUrl &&
        retriedUrl.current !== failedUrl
      ) {
        retriedUrl.current = failedUrl;
        window.setTimeout(() => {
          try {
            el.reload();
          } catch {
            /* yoksay */
          }
        }, 900);
        return;
      }

      const desc = e.errorDescription || `Hata ${e.errorCode ?? ''}`;
      showToast(`Sayfa yüklenemedi: ${desc}`, 'error', 7000);
      onUpdate({ loading: false });
    };

    const onIpcMessage = (e: Event & { channel?: string; args?: unknown[] }) => {
      const channel = e.channel;
      if (!channel) return;
      const arg0 = e.args?.[0];
      if (channel === 'aethernode/guest/openBackground' && typeof arg0 === 'string') {
        useTabs.getState().openBackground(arg0);
        return;
      }
      if (channel === 'aethernode/guest/openUrl' && typeof arg0 === 'string') {
        useTabs.getState().open(arg0);
        return;
      }
      if (channel === 'aethernode/guest/gestureClose') {
        useTabs.getState().close(tabId);
      }
    };

    el.addEventListener('did-start-loading', onStart);
    el.addEventListener('did-stop-loading', onStop);
    el.addEventListener('page-title-updated', onTitle);
    el.addEventListener('page-favicon-updated', onFavicon);
    el.addEventListener('did-navigate', onNav);
    el.addEventListener('did-navigate-in-page', onNavInPage);
    el.addEventListener('dom-ready', onDomReady);
    el.addEventListener('media-started-playing', onMediaStart);
    el.addEventListener('media-paused', onMediaPause);
    el.addEventListener('did-fail-load', onFail);
    el.addEventListener('ipc-message', onIpcMessage);

    return () => {
      el.removeEventListener('did-start-loading', onStart);
      el.removeEventListener('did-stop-loading', onStop);
      el.removeEventListener('page-title-updated', onTitle);
      el.removeEventListener('page-favicon-updated', onFavicon);
      el.removeEventListener('did-navigate', onNav);
      el.removeEventListener('did-navigate-in-page', onNavInPage);
      el.removeEventListener('dom-ready', onDomReady);
      el.removeEventListener('media-started-playing', onMediaStart);
      el.removeEventListener('media-paused', onMediaPause);
      el.removeEventListener('did-fail-load', onFail);
      el.removeEventListener('ipc-message', onIpcMessage);

    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUpdate, tabId]);

  const style: CSSProperties = (() => {
    if (pane === 'left') {
      return {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '50%',
        height: '100%',
        visibility: isVisible ? 'visible' : 'hidden',
      };
    }
    if (pane === 'right') {
      return {
        position: 'absolute',
        top: 0,
        left: '50%',
        width: '50%',
        height: '100%',
        visibility: isVisible ? 'visible' : 'hidden',
      };
    }
    return {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      visibility: isVisible ? 'visible' : 'hidden',
    };
  })();

  return (
    <webview
      ref={ref}
      src={initialUrl.current}
      // eslint-disable-next-line react/no-unknown-property
      partition={partition}
      // eslint-disable-next-line react/no-unknown-property
      preload={preloadPath}
      // Chromium PDF eklentisi + PWA izinleri
      // eslint-disable-next-line react/no-unknown-property
      webpreferences="contextIsolation=yes,plugins=yes,javascript=yes,webSecurity=yes"
      // eslint-disable-next-line react/no-unknown-property
      plugins="true"
      {...(userAgent ? { useragent: userAgent } : {})}
      style={style}
    />
  );
}
