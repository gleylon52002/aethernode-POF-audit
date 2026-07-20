import { type HTMLAttributes } from 'react';
import { cn } from './cn';

// Yatay/dikey ayraç.
export function Separator({
  orientation = 'horizontal',
  className,
}: HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      role="separator"
      className={cn(
        'shrink-0 bg-white/5',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
    />
  );
}