import { useMemo } from 'react';

interface CircularGaugeProps {
  value: number;
  min: number;
  max: number;
  redlineAt?: number;    // bu değerden sonra ibre kırmızı bölgeye girer
  limitValue?: number;   // kullanıcının ayarladığı limit (kırmızı çizgi)
  label: string;
  unit?: string;
  size?: number;
  className?: string;
  /** Gerçek zamanlı kullanım değeri (ibre bunu gösterir) */
  realValue?: number;
}

/**
 * Otomotiv tarzı dairesel gösterge (hız göstergesi / devir saati).
 * SVG tabanlı, bağımsız — resim veya ek kütüphane yok.
 */
export function CircularGauge({
  value,
  min,
  max,
  redlineAt,
  limitValue,
  label,
  unit = '',
  size = 200,
  className = '',
  realValue,
}: CircularGaugeProps) {
  const cx = size / 2;
  const cy = size * 0.52;
  const radius = size * 0.36;
  const strokeWidth = size * 0.06;

  // Açı aralığı: 135° → 405° (270° sweep, alt-orta başlangıç)
  const startAngle = 135;
  const sweep = 270;

  const displayValue = realValue ?? value;
  const normalized = Math.max(min, Math.min(max, displayValue));
  const percent = (normalized - min) / (max - min);
  const needleAngle = startAngle + percent * sweep;

  // Redline başlangıç açısı
  const redlineAngle = redlineAt != null
    ? startAngle + ((redlineAt - min) / (max - min)) * sweep
    : null;

  // Limit işaret açısı
  const limitAngle = limitValue != null && limitValue > 0
    ? startAngle + ((limitValue - min) / (max - min)) * sweep
    : null;

  // Tick hesaplama
  const ticks = useMemo(() => {
    const count = 21; // 20 aralık
    const items: { angle: number; major: boolean; inRed: boolean }[] = [];
    for (let i = 0; i <= count; i++) {
      const val = min + (i / count) * (max - min);
      const a = startAngle + (i / count) * sweep;
      items.push({
        angle: a,
        major: i % 5 === 0,
        inRed: redlineAt != null ? val >= redlineAt : false,
      });
    }
    return items;
  }, [min, max, startAngle, sweep, redlineAt]);

  const polarToCart = (angle: number, r: number): [number, number] => {
    const rad = (angle - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  const describeArc = (fromA: number, toA: number, r: number): string => {
    const [x1, y1] = polarToCart(fromA, r);
    const [x2, y2] = polarToCart(toA, r);
    const large = toA - fromA > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  // Redline bandı
  const redlinePath =
    redlineAngle != null
      ? describeArc(redlineAngle, startAngle + sweep, radius + strokeWidth * 0.3)
      : null;

  // Limit çizgisi
  const limitLine = limitAngle != null
    ? (() => {
        const [ix, iy] = polarToCart(limitAngle, radius - strokeWidth * 0.5);
        const [ox, oy] = polarToCart(limitAngle, radius + strokeWidth * 0.8);
        return { x1: ix, y1: iy, x2: ox, y2: oy };
      })()
    : null;

  // İbre (needle)
  const needleLen = radius * 0.78;
  const [nx, ny] = polarToCart(needleAngle, needleLen);
  const [bx1, by1] = polarToCart(needleAngle - 90, strokeWidth * 0.55);
  const [bx2, by2] = polarToCart(needleAngle + 90, strokeWidth * 0.55);

  const isInRed = redlineAt != null && normalized >= redlineAt;

  // Değer formatlaması
  const display =
    unit === 'MB' && normalized >= 1024
      ? `${(normalized / 1024).toFixed(1)} GB`
      : unit === 'Mbps'
        ? normalized.toFixed(1)
        : unit === '%'
          ? Math.round(normalized).toString()
          : normalized < 10
            ? normalized.toFixed(1)
            : Math.round(normalized).toString();

  return (
    <div
      className={`relative inline-flex flex-col items-center ${className}`}
      style={{ width: size, height: size + 36 }}
      role="meter"
      aria-valuenow={Math.round(normalized)}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={`${label}: ${display}${unit}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
      >
        <defs>
          {/* Metal bezel gradient */}
          <linearGradient id={`bezel-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>

          {/* Karbon fiber hissi — iç arka plan */}
          <radialGradient id={`bg-${label}`} cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(20,20,24,1)" />
            <stop offset="85%" stopColor="rgba(14,14,18,1)" />
            <stop offset="100%" stopColor="rgba(8,8,12,1)" />
          </radialGradient>

          {/* Redline glow */}
          {isInRed && (
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Dış bezel */}
        <circle
          cx={cx}
          cy={cy}
          r={radius + strokeWidth * 1.6}
          fill="none"
          stroke="url(#bezel-metal)"
          strokeWidth={strokeWidth * 1.8}
          className="[filter:url(#bezel-metal)]"
        />
        {/* Bezel — solid arka planla hallediyoruz */}
        <circle
          cx={cx}
          cy={cy}
          r={radius + strokeWidth * 1.6}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth * 1.8}
        />

        {/* İç arka plan */}
        <circle cx={cx} cy={cy} r={radius + strokeWidth * 0.6} fill={`url(#bg-${label})`} />

        {/* Tick çizgileri */}
        {ticks.map((t, i) => {
          const inner = t.major ? radius - strokeWidth * 0.7 : radius - strokeWidth * 0.3;
          const outer = radius + strokeWidth * 0.15;
          const [x1, y1] = polarToCart(t.angle, inner);
          const [x2, y2] = polarToCart(t.angle, outer);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={t.inRed ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.35)'}
              strokeWidth={t.major ? 1.5 : 0.6}
              strokeLinecap="round"
            />
          );
        })}

        {/* Değer arkı (aktif kısım) */}
        <path
          d={describeArc(startAngle, needleAngle, radius)}
          fill="none"
          stroke={isInRed ? '#ef4444' : 'var(--brand, #a855f7)'}
          strokeWidth={strokeWidth * 0.55}
          strokeLinecap="round"
          filter={isInRed ? `url(#glow-${label})` : undefined}
          className={isInRed ? '' : 'transition-[d] duration-500 ease-out'}
        />

        {/* Redline bandı */}
        {redlinePath && (
          <path
            d={redlinePath}
            fill="none"
            stroke="rgba(239,68,68,0.25)"
            strokeWidth={strokeWidth * 0.9}
            strokeLinecap="butt"
          />
        )}

        {/* Limit işaret çizgisi (kırmızı) */}
        {limitLine && (
          <line
            x1={limitLine.x1}
            y1={limitLine.y1}
            x2={limitLine.x2}
            y2={limitLine.y2}
            stroke="#ef4444"
            strokeWidth={2}
            strokeLinecap="round"
            className="[filter:drop-shadow(0_0_3px_rgba(239,68,68,0.7))]"
          />
        )}

        {/* İbre (needle) */}
        <g filter={isInRed ? `url(#glow-${label})` : undefined}>
          <polygon
            points={`${nx},${ny} ${bx1},${by1} ${bx2},${by2}`}
            fill={isInRed ? '#ef4444' : '#f1f5f9'}
            className="transition-[fill] duration-300"
          />
          {/* İbre pivot noktası */}
          <circle cx={cx} cy={cy} r={strokeWidth * 0.65} fill="#1a1a1e" stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
        </g>

        {/* Orta dijital okuma */}
        <text
          x={cx}
          y={cy + radius * 0.55}
          textAnchor="middle"
          className="fill-white font-mono text-[13px] font-bold tracking-tighter"
          style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" }}
        >
          {display}
        </text>
        <text
          x={cx}
          y={cy + radius * 0.55 + 16}
          textAnchor="middle"
          className="fill-fg-muted font-mono text-[11px]"
          style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" }}
        >
          {unit}
        </text>
      </svg>

      {/* Etiket */}
      <span
        className="mt-1 text-[11px] font-medium uppercase tracking-widest text-fg-muted"
        style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" }}
      >
        {label}
      </span>
    </div>
  );
}
