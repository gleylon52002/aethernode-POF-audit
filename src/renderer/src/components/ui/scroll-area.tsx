import { type HTMLAttributes, type UIEvent, useRef } from 'react';
import { cn } from './cn';

// Stilize scroll alanı. Native overflow + özel scrollbar (global.css).
export function ScrollArea({
  className,
  children,
  onScrollCapture,
}: HTMLAttributes<HTMLDivElement> & { onScrollCapture?: (e: UIEvent<HTMLDivElement>) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={cn('h-full w-full overflow-y-auto', className)}
      onScrollCapture={onScrollCapture}
    >
      {children}
    </div>
  );
}