import { useRef, useCallback, useEffect, useState, type KeyboardEvent } from 'react';

interface RotaryKnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  unit?: string;
  size?: number;
  disabled?: boolean;
}

/**
 * Otomotiv tarzı döner potansiyometre (rotary knob).
 * Sürükleme + scroll + klavye ile değer ayarlanabilir.
 */
export function RotaryKnob({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit = '',
  size = 90,
  disabled = false,
}: RotaryKnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(value);
  const [focused, setFocused] = useState(false);

  // Açı aralığı: -135° → +135° (270° sweep, alt-orta başlangıç)
  const startAngle = -135;
  const sweep = 270;

  const percent = (value - min) / (max - min);
  const pointerAngle = startAngle + percent * sweep;

  // Değer formatlaması
  const displayValue =
    unit === 'MB' && value >= 1024
      ? `${(value / 1024).toFixed(1)} GB`
      : unit === 'Mbps'
        ? value.toFixed(1)
        : Math.round(value).toString();

  const snap = useCallback(
    (v: number) => {
      const stepped = Math.round(v / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      dragging.current = true;
      startY.current = e.clientY;
      startValue.current = value;
      knobRef.current?.setPointerCapture(e.pointerId);
    },
    [disabled, value],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || disabled) return;
      const dy = startY.current - e.clientY; // yukarı sürükle = artır
      const range = max - min;
      const sensitivity = 0.015; // 100px sürükleme ≈ tüm aralık
      const newVal = startValue.current + dy * range * sensitivity;
      onChange(snap(newVal));
    },
    [max, min, onChange, snap, disabled],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = false;
      knobRef.current?.releasePointerCapture(e.pointerId);
    },
    [],
  );

  // Scroll ile ayarlama
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      onChange(snap(value + dir * step));
    },
    [disabled, onChange, snap, step, value],
  );

  useEffect(() => {
    const el = knobRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Klavye
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        onChange(snap(value + step));
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        onChange(snap(value - step));
      }
    },
    [disabled, onChange, snap, step, value],
  );

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const trackR = size * 0.35;

  // Pointer konumu
  const pointerRad = (pointerAngle - 90) * (Math.PI / 180);
  const pointerLen = outerR * 0.55;
  const px = cx + pointerLen * Math.cos(pointerRad);
  const py = cy + pointerLen * Math.sin(pointerRad);

  // Aktif ark
  const arcStartRad = (startAngle - 90) * (Math.PI / 180);
  const arcEndRad = (startAngle + percent * sweep - 90) * (Math.PI / 180);
  const ax1 = cx + trackR * Math.cos(arcStartRad);
  const ay1 = cy + trackR * Math.sin(arcStartRad);
  const ax2 = cx + trackR * Math.cos(arcEndRad);
  const ay2 = cy + trackR * Math.sin(arcEndRad);
  const largeArc = percent * sweep > 180 ? 1 : 0;
  const arcPath = `M ${ax1} ${ay1} A ${trackR} ${trackR} 0 ${largeArc} 1 ${ax2} ${ay2}`;

  return (
    <div
      className={`inline-flex flex-col items-center select-none ${disabled ? 'opacity-40' : ''}`}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={`${label}: ${displayValue}${unit}`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative touch-none"
        style={{ width: size, height: size, cursor: disabled ? 'default' : 'grab' }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <radialGradient id={`knob-bg-${label}`} cx="50%" cy="40%">
              <stop offset="0%" stopColor="rgba(45,45,55,1)" />
              <stop offset="70%" stopColor="rgba(25,25,30,1)" />
              <stop offset="100%" stopColor="rgba(15,15,20,1)" />
            </radialGradient>
          </defs>

          {/* Dış halka */}
          <circle
            cx={cx}
            cy={cy}
            r={outerR}
            fill={`url(#knob-bg-${label})`}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1.5}
          />
          <circle
            cx={cx}
            cy={cy}
            r={outerR}
            fill="none"
            stroke={focused ? 'rgba(168,85,247,0.4)' : 'transparent'}
            strokeWidth={2}
          />

          {/* Değer arkı */}
          <path
            d={arcPath}
            fill="none"
            stroke="var(--brand, #a855f7)"
            strokeWidth={2.5}
            strokeLinecap="round"
            className="transition-[d] duration-200"
          />

          {/* Pointer çizgisi */}
          <line
            x1={cx}
            y1={cy}
            x2={px}
            y2={py}
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Merkez nokta */}
          <circle cx={cx} cy={cy} r={3} fill="rgba(255,255,255,0.5)" />
        </svg>
      </div>

      {/* Dijital okuma */}
      <span
        className="mt-1 font-mono text-[11px] font-medium tracking-tight text-fg"
        style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" }}
      >
        {displayValue}
      </span>
      {unit && (
        <span className="font-mono text-[9px] tracking-wider text-fg-muted">{unit}</span>
      )}
      <span
        className="mt-0.5 text-[9px] font-medium uppercase tracking-widest text-fg-subtle"
        style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" }}
      >
        {label}
      </span>
    </div>
  );
}
