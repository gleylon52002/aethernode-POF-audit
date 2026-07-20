import { useEffect, useRef, useState } from 'react';
import { Tooltip } from '@renderer/components/ui';
import { getActiveWebviewControl } from './webview-control-bus';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;
const GAINS = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3] as const;

// Video hızı + sekme ses yükseltme (GainNode ile %100 üzeri).
export function MediaControls({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(1);
  const [gain, setGain] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || disabled) return;
    void getActiveWebviewControl()
      .getMediaState()
      .then((s) => {
        setRate(s.rate);
        setGain(s.gain);
      });
  }, [open, disabled]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (disabled) return null;

  return (
    <div className="relative" ref={rootRef}>
      <Tooltip label="Medya: hız & ses">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`grid h-8 min-w-[2.5rem] place-items-center rounded-lg px-1.5 text-[11px] font-semibold tabular-nums transition ${
            open || rate !== 1 || gain !== 1
              ? 'bg-brand/20 text-brand'
              : 'text-fg-muted hover:bg-white/5 hover:text-fg'
          }`}
          aria-label="Medya kontrolleri"
        >
          {rate !== 1 ? `${rate}×` : gain !== 1 ? `${Math.round(gain * 100)}%` : '▶︎'}
        </button>
      </Tooltip>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 rounded-xl border border-white/10 bg-bg-elevated/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Oynatma hızı
          </div>
          <div className="mb-3 flex flex-wrap gap-1">
            {RATES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRate(r);
                  void getActiveWebviewControl().setPlaybackRate(r);
                }}
                className={`rounded-md px-2 py-1 text-[11px] tabular-nums ${
                  rate === r
                    ? 'bg-brand text-white'
                    : 'bg-white/5 text-fg-muted hover:bg-white/10 hover:text-fg'
                }`}
              >
                {r}×
              </button>
            ))}
          </div>

          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Sekme sesi {gain > 1 ? `(boost ${Math.round(gain * 100)}%)` : ''}
          </div>
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={gain}
            onChange={(e) => {
              const g = Number(e.target.value);
              setGain(g);
              void getActiveWebviewControl().setVolumeGain(g);
            }}
            className="mb-2 w-full accent-brand"
          />
          <div className="flex flex-wrap gap-1">
            {GAINS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGain(g);
                  void getActiveWebviewControl().setVolumeGain(g);
                }}
                className={`rounded-md px-2 py-1 text-[11px] tabular-nums ${
                  Math.abs(gain - g) < 0.01
                    ? 'bg-brand text-white'
                    : 'bg-white/5 text-fg-muted hover:bg-white/10 hover:text-fg'
                }`}
              >
                {Math.round(g * 100)}%
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-fg-subtle">
            %100 üzeri ses yükseltme (laptop için). Tüm sitelerdeki video/audio için geçerli.
          </p>
        </div>
      )}
    </div>
  );
}
