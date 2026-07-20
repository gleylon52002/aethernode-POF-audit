import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './cn';

// Adres çubuğu dahil her metin girişi için ortak Input.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl bg-bg-elevated/60 border border-white/10 px-3 h-10 text-sm text-fg placeholder:text-fg-subtle',
        'focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/25 transition',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';