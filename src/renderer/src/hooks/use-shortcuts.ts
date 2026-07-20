import { useEffect, useState } from 'react';
import { useTabs } from '@renderer/store/tabs';
import { useBookmarks } from '@renderer/store/bookmarks';
import { getActiveWebviewControl } from '@renderer/components/layouts/webview-control-bus';
import { FIND_BAR_EVENT } from '@renderer/components/layouts/find-bar';

// Klavye kısayolu dağıtıcısı.
//
// Kısayollar main process'te before-input-event ile yakalanır (odak webview
// içindeyken de çalışsın diye) ve buraya push edilir. Bu hook aksiyonları
// store'lara / webview kontrolüne dağıtır.
//
// Ayrıca sekme içinden target=_blank ile açılan bağlantılar (main'in
// setWindowOpenHandler'ından iletilir) yeni sekmede açılır.

export const FOCUS_ADDRESS_EVENT = 'aether:focus-address';

export function useShortcuts(): void {
  useEffect(() => {
    const offShortcut = window.aether.shortcuts.onEvent((e) => {
      void dispatch(e.action, e.arg);
    });
    const offOpenUrl = window.aether.guest.onOpenUrl((url) => {
      useTabs.getState().open(url);
    });
    return () => {
      offShortcut();
      offOpenUrl();
    };
  }, []);
}

async function downloadDataUrl(dataUrl: string, filename: string): Promise<void> {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

async function dispatch(action: string, arg?: number): Promise<void> {
  const tabs = useTabs.getState();
  const ctrl = getActiveWebviewControl();

  switch (action) {
    case 'newTab':
      tabs.open();
      break;
    case 'closeTab': {
      const id = tabs.activeId ?? tabs.tabs[tabs.tabs.length - 1]?.id;
      if (id) tabs.close(id);
      break;
    }
    case 'closeWindow':
      await window.aether.window.close();
      break;
    case 'reopenTab':
      tabs.reopen();
      break;
    case 'incognitoTab':
      tabs.open(undefined, 'incognito');
      break;
    case 'nextTab':
      tabs.activateNext(1);
      break;
    case 'prevTab':
      tabs.activateNext(-1);
      break;
    case 'tabIndex':
      if (arg) tabs.activateByIndex(arg - 1);
      break;
    case 'lastTab':
      tabs.activateLast();
      break;
    case 'focusAddress':
      window.dispatchEvent(new CustomEvent(FOCUS_ADDRESS_EVENT));
      break;
    case 'reload':
      ctrl.reload();
      break;
    case 'hardReload':
      ctrl.hardReload();
      break;
    case 'stop': {
      const active = tabs.tabs.find((t) => t.id === tabs.activeId);
      if (active?.loading) ctrl.stop();
      break;
    }
    case 'zoomIn':
      ctrl.zoomIn();
      break;
    case 'zoomOut':
      ctrl.zoomOut();
      break;
    case 'zoomReset':
      ctrl.zoomReset();
      break;
    case 'openHistory':
      tabs.open('aethernode://history');
      break;
    case 'openDownloads':
      tabs.open('aethernode://downloads');
      break;
    case 'openBookmarks':
      tabs.open('aethernode://bookmarks');
      break;
    case 'bookmarkPage': {
      const active = tabs.tabs.find((t) => t.id === tabs.activeId);
      if (active && /^https?:\/\//i.test(active.url)) {
        useBookmarks.getState().add({ title: active.title || active.url, url: active.url });
      }
      break;
    }
    case 'devtools':
      ctrl.openDevTools();
      break;
    case 'fullscreen':
      await window.aether.window.toggleFullscreen();
      break;
    case 'findInPage':
      window.dispatchEvent(new CustomEvent(FIND_BAR_EVENT));
      break;
    case 'print':
      ctrl.print();
      break;
    case 'screenshot': {
      const data = await ctrl.captureScreenshot();
      if (data) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        await downloadDataUrl(data, `pof-screenshot-${stamp}.png`);
      }
      break;
    }
    case 'viewSource': {
      const html = await ctrl.viewSource();
      if (html) {
        const escaped = html
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kaynak — ${ctrl.getTitle() ?? ''}</title><style>body{margin:0;background:#09090b;color:#e4e4e7;font:13px/1.5 ui-monospace,Consolas,monospace}pre{padding:24px;white-space:pre-wrap;word-break:break-word}</style></head><body><pre>${escaped}</pre></body></html>`,
        )}`;
        tabs.open(dataUrl);
      }
      break;
    }
    case 'savePage': {
      const html = await ctrl.viewSource();
      if (html) {
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
        const host = (() => {
          try {
            return new URL(ctrl.getUrl() ?? 'page').hostname || 'page';
          } catch {
            return 'page';
          }
        })();
        await downloadDataUrl(dataUrl, `${host}.html`);
      }
      break;
    }
    case 'readerMode': {
      const active = tabs.tabs.find((t) => t.id === tabs.activeId);
      if (!active || active.url.startsWith('aethernode://')) break;
      const next = !active.readerMode;
      tabs.update(active.id, { readerMode: next });
      ctrl.setReaderMode(next);
      break;
    }
    case 'panic': {
      await window.aether.privacy.panic();
      try {
        localStorage.removeItem('aethernode.downloads');
        localStorage.removeItem(SESSION_KEY);
      } catch {
        /* yoksay */
      }
      tabs.resetAll();
      break;
    }
    default:
      break;
  }
}

export const SESSION_KEY = 'aethernode.session.tabs';

/** Oturum sekmelerini localStorage'a yazar (incognito hariç). */
export function persistSession(): void {
  try {
    const { tabs } = useTabs.getState();
    const snapshot = tabs
      .filter((t) => t.profileId !== 'incognito')
      .map((t) => ({ url: t.url, title: t.title }));
    localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  } catch {
    /* yoksay */
  }
}

/** Kayıtlı oturumu yükler; yoksa null. */
export function loadSession(): Array<{ url: string; title: string }> | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.filter(
      (x): x is { url: string; title: string } =>
        !!x && typeof x === 'object' && typeof (x as { url: unknown }).url === 'string',
    );
  } catch {
    return null;
  }
}

/** Find bar açık/kapalı durumunu AppShell ile paylaşmak için. */
export function useFindBarOpen(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    window.addEventListener(FIND_BAR_EVENT, toggle);
    return () => window.removeEventListener(FIND_BAR_EVENT, toggle);
  }, []);
  return [open, setOpen];
}
