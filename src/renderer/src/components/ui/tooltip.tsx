import { type ReactNode } from 'react';
import { cn } from './cn';

export function Tooltip({
  label,
  children,
  side = 'right',
  className,
}: {
  label: string;
  children: ReactNode;
  side?: 'right' | 'top' | 'bottom';
  className?: string;
}) {
  return (
    <div className={cn('group relative', className)}>
      {children}
      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 opacity-0 transition-opacity group-hover:opacity-100',
          'rounded-md bg-bg-elevated/90 border border-white/10 px-2 py-1 text-xs text-fg shadow-glass',
          side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2',
          side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
          side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
        )}
      >
        {label}
      </div>
    </div>
  );
}