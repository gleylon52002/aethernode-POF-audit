import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';
import { playUiSound } from '@renderer/hooks/use-sound';

// shadcn tarzı minimal Button. Üç varyant + iki boyut. Framer Motion yok —
// CSS transition ile yeterince akıcı.
type Variant = 'brand' | 'ghost' | 'outline' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  brand:
    'bg-brand-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 hover:shadow-[0_8px_32px_rgba(124,58,237,0.4)]',
  ghost: 'text-fg-muted hover:text-fg hover:bg-white/5',
  outline:
    'border border-white/10 text-fg hover:bg-white/5 hover:border-white/20',
  danger: 'text-danger hover:bg-danger/10 border border-danger/20',
  subtle: 'text-fg-muted hover:text-fg hover:bg-white/5',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  icon: 'h-9 w-9 rounded-lg grid place-items-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'subtle', size = 'md', onClick, ...props }, ref) => (
    <button
      ref={ref}
      onClick={(e) => {
        if (variant === 'brand' && !props.disabled) {
          try { playUiSound('primaryClick'); } catch {}
        }
        onClick?.(e as React.MouseEvent<HTMLButtonElement>);
      }}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 font-medium transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';