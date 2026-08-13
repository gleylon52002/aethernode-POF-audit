import { useEffect, useRef, useState } from 'react';
import { Tooltip } from '@renderer/components/ui';
import { getActiveWebviewControl } from './webview-control-bus';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;
const GAINS = [0, 0.5, 1, 1.5, 2, 3] as const;
const MIN_RATE = 0.1;
const MAX_RATE = 10;

// Video hızı + sekme ses yükseltme — tüm sitelerde (iframe player'lar dahil).
export function MediaControls({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(1);
  const [gain, setGain] = useState(1);
  const [rateText, setRateText] = useState('1');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || disabled) return;
    void getActiveWebviewControl()
      .getMediaState()
      .then((s) => {
        setRate(s.rate);
        setGain(s.gain);
        setRateText(String(s.rate));
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

  const applyRate = (r: number) => {
    const clamped = Math.min(MAX_RATE, Math.max(MIN_RATE, r));
    setRate(clamped);
    setRateText(String(clamped));
    void getActiveWebviewControl().setPlaybackRate(clamped);
  };

  const commitManualRate = () => {
    const parsed = Number(rateText.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) {
      applyRate(parsed);
    } else {
      setRateText(String(rate));
    }
  };

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
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 rounded-xl border border-white/10 bg-bg-elevated/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Oynatma hızı
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            {RATES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => applyRate(r)}
                className={`rounded-md px-2 py-1 text-[11px] tabular-nums ${
                  Math.abs(rate - r) < 0.001
                    ? 'bg-brand text-white'
                    : 'bg-white/5 text-fg-muted hover:bg-white/10 hover:text-fg'
                }`}
              >
                {r}×
              </button>
            ))}
          </div>

          {/* Manuel hız girişi */}
          <div className="mb-3 flex items-center gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              value={rateText}
              onChange={(e) => setRateText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitManualRate();
                }
              }}
              onBlur={commitManualRate}
              placeholder="örn. 1.85"
              className="w-20 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] tabular-nums text-fg focus:border-brand/50 focus:outline-none"
              aria-label="Manuel oynatma hızı"
            />
            <span className="text-[11px] text-fg-subtle">× manuel ({MIN_RATE}–{MAX_RATE})</span>
            <button
              type="button"
              onClick={commitManualRate}
              className="ml-auto rounded-md bg-white/5 px-2 py-1 text-[11px] text-fg-muted hover:bg-white/10 hover:text-fg"
            >
              Uygula
            </button>
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
            Tüm sitelerde geçerli — iframe içindeki oynatıcılar dahil. %100 üzeri boost, korumasız
            çapraz-origin seslerde otomatik atlanır (ses kesilmesin diye).
          </p>
        </div>
      )}
    </div>
  );
}
