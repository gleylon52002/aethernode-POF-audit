import { type ReactNode } from 'react';
import { cn } from './cn';

export function Tooltip({
  label,
  children,
  side = 'right',
  align = 'center',
  className,
}: {
  label: string;
  children: ReactNode;
  side?: 'right' | 'top' | 'bottom' | 'left';
  /** Kenara yakın butonlarda `end` / `start` kesilmeyi önler. */
  align?: 'start' | 'center' | 'end';
  className?: string;
}) {
  const alignX =
    align === 'start'
      ? 'left-0'
      : align === 'end'
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2';

  return (
    <div className={cn('group relative shrink-0', className)}>
      {children}
      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-[300] hidden w-max max-w-[min(280px,70vw)] whitespace-normal rounded-lg border border-white/15 bg-[#16161c] px-2.5 py-1.5',
          'text-left text-[11.5px] leading-snug text-zinc-100 shadow-xl group-hover:block',
          side === 'right' && 'left-full top-1/2 ml-2 -translate-y-1/2',
          side === 'left' && 'right-full top-1/2 mr-2 -translate-y-1/2',
          side === 'top' && cn('bottom-full mb-2', alignX),
          side === 'bottom' && cn('top-full mt-2', alignX),
        )}
      >
        {label}
      </div>
    </div>
  );
}
