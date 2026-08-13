import { useEffect, useState } from 'react';
import { Min, Max, Close } from '@renderer/components/ui/icons';
import logoUrl from '@renderer/assets/logo.svg';

export function Titlebar() {
  const [platform, setPlatform] = useState<string>('');
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    void window.aether.app.platform().then((r) => {
      if (r.ok && r.data) setPlatform(r.data);
    });
    void window.aether.window.isMaximized().then((r) => r.ok && setMaximized(!!r.data));
    const off = window.aether.window.onMaximizedChange((max) => setMaximized(max));
    return () => off();
  }, []);

  const isMac = platform === 'darwin';

  return (
    <header className="titlebar flex h-10 shrink-0 items-center justify-between border-b border-white/5 bg-bg-base/80 px-3 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <img src={logoUrl} alt="AetherNode" className="h-6 w-6 rounded-full object-cover" draggable={false} />
        <span className="font-medium tracking-wide">AetherNode</span>
      </div>
      {isMac ? null : (
        <div className="no-drag flex items-center gap-1">
          <button
            type="button"
            className="grid h-8 w-10 place-items-center rounded text-fg-muted hover:bg-white/5 hover:text-fg"
            onClick={() => void window.aether.window.minimize()}
            aria-label="Küçült"
          >
            <Min />
          </button>
          <button
            type="button"
            className="grid h-8 w-10 place-items-center rounded text-fg-muted hover:bg-white/5 hover:text-fg"
            onClick={() => void window.aether.window.maximize()}
            aria-label={maximized ? 'Önceki boyut' : 'Büyüt'}
          >
            <Max />
          </button>
          <button
            type="button"
            className="grid h-8 w-10 place-items-center rounded text-fg-muted hover:bg-danger hover:text-white"
            onClick={() => void window.aether.window.close()}
            aria-label="Kapat"
          >
            <Close />
          </button>
        </div>
      )}
    </header>
  );
}
