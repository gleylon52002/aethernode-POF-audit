import { useEffect, useState } from 'react';
import { Min, Max, Close } from '@renderer/components/ui/icons';
import logoUrl from '@renderer/assets/logo.svg';

export function Titlebar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    void window.aether.window.isMaximized().then((r) => r.ok && setMaximized(!!r.data));
    const off = window.aether.window.onMaximizedChange((max) => setMaximized(max));
    return () => off();
  }, []);

  return (
    <header className="titlebar flex h-10 shrink-0 items-center border-b border-white/5 bg-bg-base/80 px-3 backdrop-blur gap-3">
      <div className="no-drag flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className="h-3 w-3 rounded-full bg-[#FF5F56] hover:bg-[#FF5F56]/80 flex items-center justify-center group"
          onClick={() => void window.aether.window.close()}
          aria-label="Kapat"
        >
          <Close className="h-2 w-2 opacity-0 group-hover:opacity-100 text-[#4c0000]" />
        </button>
        <button
          type="button"
          className="h-3 w-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFBD2E]/80 flex items-center justify-center group"
          onClick={() => void window.aether.window.minimize()}
          aria-label="Küçült"
        >
          <Min className="h-2 w-2 opacity-0 group-hover:opacity-100 text-[#995700]" />
        </button>
        <button
          type="button"
          className="h-3 w-3 rounded-full bg-[#27C93F] hover:bg-[#27C93F]/80 flex items-center justify-center group"
          onClick={() => void window.aether.window.maximize()}
          aria-label={maximized ? 'Önceki boyut' : 'Büyüt'}
        >
          <Max className="h-2 w-2 opacity-0 group-hover:opacity-100 text-[#006500]" />
        </button>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <img src={logoUrl} alt="AetherNode" className="h-5 w-5 object-cover" draggable={false} />
        <span className="font-medium tracking-wide">AetherNode</span>
      </div>
    </header>
  );
}
