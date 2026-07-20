import { type HTMLAttributes } from 'react';
import { cn } from './cn';

// Anlamsal etiket — durum/ tür gösterimi için.
type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'muted';

const tones: Record<Tone, string> = {
  brand: 'bg-brand/15 text-brand border-brand/20',
  success: 'bg-success/15 text-success border-success/20',
  warning: 'bg-warning/15 text-warning border-warning/20',
  danger: 'bg-danger/15 text-danger border-danger/20',
  muted: 'bg-white/5 text-fg-muted border-white/10',
};

export function Badge({
  tone = 'muted',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}