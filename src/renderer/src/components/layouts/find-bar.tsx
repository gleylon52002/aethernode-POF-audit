import { useEffect, useRef, useState } from 'react';
import { Close } from '@renderer/components/ui/icons';
import { getActiveWebviewControl } from './webview-control-bus';

export const FIND_BAR_EVENT = 'aether:toggle-find';

interface FindBarProps {
  open: boolean;
  onClose: () => void;
}

export function FindBar({ open, onClose }: FindBarProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      getActiveWebviewControl().stopFindInPage();
      setQuery('');
      setActive(0);
      setTotal(0);
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
    return getActiveWebviewControl().onFindResult((r) => {
      setActive(r.active);
      setTotal(r.total);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const ctrl = getActiveWebviewControl();
    if (query.trim()) ctrl.findInPage(query, { findNext: false });
    else {
      ctrl.stopFindInPage();
      setActive(0);
      setTotal(0);
    }
  }, [query, open]);

  if (!open) return null;

  const next = (forward: boolean) => {
    if (!query.trim()) return;
    getActiveWebviewControl().findInPage(query, { forward, findNext: true });
  };

  return (
    <div className="absolute right-4 top-2 z-40 flex items-center gap-2 rounded-xl border border-white/10 bg-bg-elevated/95 px-3 py-2 shadow-lg backdrop-blur-md">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            next(!e.shiftKey);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
        placeholder="Sayfada bul…"
        className="w-48 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
      />
      <span className="min-w-[3.5rem] text-center text-xs text-fg-muted tabular-nums">
        {query ? `${active}/${total}` : '0/0'}
      </span>
      <button
        type="button"
        onClick={() => next(false)}
        className="rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-white/5 hover:text-fg"
        title="Önceki"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => next(true)}
        className="rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-white/5 hover:text-fg"
        title="Sonraki"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded-md p-1 text-fg-muted hover:bg-white/5 hover:text-fg"
        title="Kapat"
      >
        <Close />
      </button>
    </div>
  );
}
