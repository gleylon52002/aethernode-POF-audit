import { useEffect, useMemo, useRef, useState } from 'react';
import { useTabs } from '@renderer/store/tabs';
import { useOwnTabId } from '@renderer/router';

function parseSrc(tabUrl: string): string | null {
  try {
    const u = new URL(tabUrl);
    if (u.protocol !== 'aethernode:' || u.hostname !== 'annotate') return null;
    const src = u.searchParams.get('src');
    return src ? decodeURIComponent(src) : null;
  } catch {
    return null;
  }
}

export default function AnnotatePage() {
  const ownTabId = useOwnTabId();
  const tab = useTabs((s) => s.tabs.find((t) => t.id === (ownTabId ?? s.activeId)));
  const update = useTabs((s) => s.update);
  const src = useMemo(() => (tab ? parseSrc(tab.url) : null), [tab]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (tab) update(tab.id, { title: 'İşaretle — Ekran görüntüsü' });
  }, [tab, update]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const maxW = Math.min(1200, window.innerWidth - 48);
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setReady(true);
    };
    img.src = src;
  }, [src]);

  const pos = (e: React.MouseEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  if (!src) {
    return (
      <div className="grid h-full place-items-center text-sm text-fg-muted">
        Görüntü kaynağı yok. Ctrl+Shift+P ile ekran görüntüsü alın.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#121214]">
      <div className="flex h-11 items-center gap-2 border-b border-white/10 px-3">
        <span className="flex-1 text-xs text-fg-muted">Kırmızı kalemle işaretleyin</span>
        <button
          type="button"
          className="rounded-lg bg-white/10 px-2 py-1 text-xs text-fg"
          onClick={() => {
            const c = canvasRef.current;
            if (!c) return;
            const a = document.createElement('a');
            a.href = c.toDataURL('image/png');
            a.download = `annotate-${Date.now()}.png`;
            a.click();
          }}
        >
          PNG indir
        </button>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto p-4">
        <canvas
          ref={canvasRef}
          className={`max-w-full cursor-crosshair rounded border border-white/10 ${ready ? '' : 'opacity-40'}`}
          onMouseDown={(e) => {
            drawing.current = true;
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;
            const p = pos(e);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
          }}
          onMouseMove={(e) => {
            if (!drawing.current) return;
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;
            const p = pos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }}
          onMouseUp={() => {
            drawing.current = false;
          }}
          onMouseLeave={() => {
            drawing.current = false;
          }}
        />
      </div>
    </div>
  );
}
