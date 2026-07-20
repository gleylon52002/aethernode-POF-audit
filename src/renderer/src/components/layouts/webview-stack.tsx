import { useEffect, useRef, useState } from 'react';
import { useTabs } from '@renderer/store/tabs';
import { useDownloads } from '@renderer/store/downloads';
import { useHistory } from '@renderer/store/history';
import { useSettings } from '@renderer/store/settings';
import { resolveInternalRoute } from '@renderer/router';
import { USER_AGENTS } from '@shared/constants/app';
import { isBankUrl } from '@shared/utils';
import type { WebviewElement, WebviewDownloadItem } from '@renderer/types/webview';
import { setActiveWebviewControl } from './webview-control-bus';

// Her sekme için bir <webview>. Yalnızca aktif görünür; diğerleri gizli
// ama bellekte tutulur (geri/ileri durumunu korumak için).
// memorySaver + discarded: webview unmount edilir, sekme meta'sı kalır.
// Dahili aethernode://URL'ler webview ile değil InternalPage ile gösterilir.

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
  const update = useTabs((s) => s.update);
  const addDownload = useDownloads((s) => s.add);
  const recordHistory = useHistory((s) => s.record);
  const userAgentId = useSettings((s) => s.settings.general.userAgent);
  const bankModeEnabled = useSettings((s) => s.settings.privacy.bankMode?.enabled !== false);
  const preloadPath = useGuestPreloadPath();

  if (!preloadPath) return <div className="h-full w-full bg-bg-base" />;

  const userAgent = USER_AGENTS[userAgentId] ?? '';

  return (
    <div className="relative h-full w-full bg-bg-base">
      {tabs.map((t) => {
        const r = resolveInternalRoute(t.url);
        if (r.internal) return null;
        const isActive = activeId === t.id;
        const isIncognito = t.profileId === 'incognito';
        const isBank = bankModeEnabled && isBankUrl(t.url);
        const partition = isIncognito
          ? 'incognito'
          : isBank
            ? 'persist:bank'
            : 'persist:default';

        // Discarded sekmeler: webview yok — uyandırma için tıklanınca activate
        // discarded=false yapar ve burası yeniden mount eder.
        if (t.discarded && !isActive) {
          return null;
        }

        return (
          <TabWebview
            key={`${t.id}-${userAgentId}-${isBank ? 'bank' : 'std'}`}
            url={t.url}
            partition={partition}
            preloadPath={preloadPath}
            userAgent={userAgent}
            isActive={isActive}
            deepFocus={!!t.deepFocus}
            readerMode={!!t.readerMode}
            onUpdate={(patch) => update(t.id, patch)}
            onVisit={(url, title) => {
              if (!isIncognito) recordHistory(url, title);
            }}
            onDownload={(item) =>
              addDownload({
                id: item.id,
                filename: item.filename,
                url: item.url,
                bytesTotal: item.bytesTotal,
              })
            }
          />
        );
      })}
    </div>
  );
}

interface TabWebviewProps {
  url: string;
  partition: string;
  preloadPath: string;
  userAgent: string;
  isActive: boolean;
  deepFocus: boolean;
  readerMode: boolean;
  onUpdate: (patch: {
    url?: string;
    title?: string;
    loading?: boolean;
    faviconUrl?: string;
  }) => void;
  onVisit: (url: string, title: string) => void;
  onDownload: (item: {
    id: string;
    filename: string;
    url: string;
    bytesTotal?: number;
  }) => void;
}

function TabWebview({
  url,
  partition,
  preloadPath,
  userAgent,
  isActive,
  deepFocus,
  readerMode,
  onUpdate,
  onVisit,
  onDownload,
}: TabWebviewProps) {
  const ref = useRef<WebviewElement | null>(null);
  const domReady = useRef(false);
  const initialUrl = useRef(url);

  useEffect(() => {
    const el = ref.current;
    if (!el || !domReady.current) return;
    try {
      if (el.getURL() !== url) {
        el.loadURL(url).catch(() => {
          /* yönlendirme yarışları (ERR_ABORTED) yoksayılır */
        });
      }
    } catch {
      /* webview henüz attach değil */
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
    const onStop = () => onUpdate({ loading: false });
    // Electron webview olayları bazen argümansız veya eksik property ile
    // gelebilir — her zaman el.getURL/getTitle yedeklenir.
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
        const url = e?.url ?? el.getURL();
        if (!url) return;
        onUpdate({ url });
        onVisit(url, '');
      } catch {
        /* yoksay */
      }
    };
    const onNavInPage = (e?: Event & { url?: string }) => {
      try {
        const url = e?.url ?? el.getURL();
        if (url) onUpdate({ url });
      } catch {
        /* yoksay */
      }
    };
    const onDomReady = () => {
      domReady.current = true;
      try {
        if (deepFocus) el.send('aethernode/guest/deepFocus', true);
        if (readerMode) el.send('aethernode/guest/readerMode', true);
      } catch {
        /* yoksay */
      }
    };
    const onDownloadEvt = (e?: Event & { item?: WebviewDownloadItem }) => {
      const item = e?.item;
      if (!item) return;
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      onDownload({
        id,
        filename: item.getFilename(),
        url: item.getURL(),
        bytesTotal: item.getTotalBytes(),
      });
    };

    el.addEventListener('did-start-loading', onStart);
    el.addEventListener('did-stop-loading', onStop);
    el.addEventListener('page-title-updated', onTitle);
    el.addEventListener('page-favicon-updated', onFavicon);
    el.addEventListener('did-navigate', onNav);
    el.addEventListener('did-navigate-in-page', onNavInPage);
    el.addEventListener('dom-ready', onDomReady);
    el.addEventListener('will-download', onDownloadEvt);

    return () => {
      el.removeEventListener('did-start-loading', onStart);
      el.removeEventListener('did-stop-loading', onStop);
      el.removeEventListener('page-title-updated', onTitle);
      el.removeEventListener('page-favicon-updated', onFavicon);
      el.removeEventListener('did-navigate', onNav);
      el.removeEventListener('did-navigate-in-page', onNavInPage);
      el.removeEventListener('dom-ready', onDomReady);
      el.removeEventListener('will-download', onDownloadEvt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUpdate, onDownload]);

  return (
    <webview
      ref={ref}
      src={initialUrl.current}
      // eslint-disable-next-line react/no-unknown-property -- webview tag native attribute
      partition={partition}
      // eslint-disable-next-line react/no-unknown-property -- webview tag native attribute
      preload={preloadPath}
      {...(userAgent ? { useragent: userAgent } : {})}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        visibility: isActive ? 'visible' : 'hidden',
      }}
    />
  );
}
