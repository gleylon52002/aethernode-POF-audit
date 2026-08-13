import { useEffect, useMemo, useRef, useState } from 'react';
import { useTabs } from '@renderer/store/tabs';
import { useOwnTabId } from '@renderer/router';
import { Download, Close } from '@renderer/components/ui/icons';

/**
 * Yerleşik PDF önizleyici — aethernode://pdf?src=<encodeURIComponent(url)>
 */

function parseSrc(tabUrl: string): string | null {
  try {
    const u = new URL(tabUrl);
    if (u.protocol !== 'aethernode:' || u.hostname !== 'pdf') return null;
    const src = u.searchParams.get('src');
    return src ? decodeURIComponent(src) : null;
  } catch {
    return null;
  }
}

export default function PdfViewerPage() {
  const ownTabId = useOwnTabId();
  const tab = useTabs((s) => s.tabs.find((t) => t.id === (ownTabId ?? s.activeId)));
  const update = useTabs((s) => s.update);
  const open = useTabs((s) => s.open);
  const src = useMemo(() => (tab ? parseSrc(tab.url) : null), [tab]);
  const [zoom, setZoom] = useState(100);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const webviewRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (tab && src) {
      const name = (() => {
        try {
          const path = new URL(src).pathname;
          return decodeURIComponent(path.split('/').pop() || 'PDF');
        } catch {
          return 'PDF';
        }
      })();
      update(tab.id, { title: `${name} — PDF` });
    }
  }, [src, tab, update]);

  // Yerel dosyalar için webview + plugins (iframe file:// engeli)
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !src) return;
    host.innerHTML = '';
    const el = document.createElement('webview') as HTMLElement & {
      src: string;
      setAttribute(n: string, v: string): void;
    };
    el.setAttribute('style', 'width:100%;height:100%;display:block;border:0;transform-origin:top center;');
    el.setAttribute('webpreferences', 'plugins=yes,javascript=yes');
    el.src = src;
    host.appendChild(el);
    webviewRef.current = el;
    return () => {
      webviewRef.current = null;
      host.innerHTML = '';
    };
  }, [src]);

  useEffect(() => {
    const el = webviewRef.current;
    if (!el) return;
    el.style.width = `${zoom}%`;
    el.style.height = `${zoom}%`;
  }, [zoom]);

  if (!src) {
    return (
      <div className="grid h-full place-items-center bg-bg-base text-sm text-fg-muted">
        PDF kaynağı bulunamadı.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#1a1a1e]">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-white/10 bg-bg-elevated/80 px-3">
        <span className="min-w-0 flex-1 truncate text-xs text-fg-muted" title={src}>
          {src}
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="grid h-7 w-7 place-items-center rounded text-fg-muted hover:bg-white/10 hover:text-fg"
            aria-label="Uzaklaştır"
          >
            −
          </button>
          <span className="w-10 text-center text-[11px] tabular-nums text-fg-muted">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            className="grid h-7 w-7 place-items-center rounded text-fg-muted hover:bg-white/10 hover:text-fg"
            aria-label="Yakınlaştır"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={() => open(src)}
          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-fg-muted hover:bg-white/5 hover:text-fg"
        >
          Kaynak
        </button>
        <a
          href={src}
          download
          className="flex items-center gap-1 rounded-lg bg-brand/20 px-2.5 py-1.5 text-[11px] font-medium text-brand hover:bg-brand/30"
        >
          <Download className="h-3.5 w-3.5" />
          İndir
        </a>
        {tab && (
          <button
            type="button"
            onClick={() => update(tab.id, { url: 'aethernode://dashboard', loading: false })}
            className="grid h-7 w-7 place-items-center rounded text-fg-muted hover:bg-white/10"
            aria-label="Kapat"
          >
            <Close className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto bg-[#2b2b2f]">
        <div ref={hostRef} className="h-full w-full" />
      </div>
    </div>
  );
}
