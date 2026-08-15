interface EmptyStateProps {
  title: string;
  description: string;
  variant?: 'downloads' | 'history' | 'bookmarks' | 'notes';
}

function Illustration({ variant }: { variant: EmptyStateProps['variant'] }) {
  // Minimal line-art: all use brand/accent friendly colors via currentColor
  if (variant === 'downloads') {
    return (
      <svg width="96" height="72" viewBox="0 0 96 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="mx-auto">
        <rect x="12" y="10" width="72" height="44" rx="8" className="stroke-white/10" strokeWidth="1.4" />
        <path d="M48 18v18M48 36l-8-8M48 36l8-8" className="stroke-brand/50" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="28" y="42" width="40" height="3" rx="1.5" className="fill-white/10" />
        <rect x="34" y="47" width="28" height="2" rx="1" className="fill-white/5" />
      </svg>
    );
  }
  if (variant === 'history') {
    return (
      <svg width="96" height="72" viewBox="0 0 96 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="mx-auto">
        <circle cx="48" cy="32" r="20" className="stroke-white/10" strokeWidth="1.4" />
        <path d="M48 24v8l6 6" className="stroke-brand/50" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M32 58h32" className="stroke-white/5" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="36" cy="58" r="2" className="fill-brand/40" />
      </svg>
    );
  }
  if (variant === 'bookmarks') {
    return (
      <svg width="96" height="72" viewBox="0 0 96 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="mx-auto">
        <path d="M30 14h36l-6 8 6 8H30V14z" className="stroke-white/10 fill-white/[0.03]" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M42 20h12" className="stroke-brand/40" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M42 26h8" className="stroke-white/10" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="72" cy="42" r="10" className="stroke-accent/30" strokeWidth="1.3" />
        <path d="M72 38v5l3 2" className="stroke-accent/50" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  // notes
  return (
    <svg width="96" height="72" viewBox="0 0 96 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="mx-auto">
      <rect x="24" y="14" width="48" height="40" rx="6" className="stroke-white/10" strokeWidth="1.4" />
      <path d="M32 26h32M32 34h28M32 42h20" className="stroke-white/10" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M62 46l4 4-6 1 1-6 1 1z" className="stroke-brand/40 fill-brand/10" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyState({ title, description, variant = 'notes' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <Illustration variant={variant} />
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="max-w-[320px] text-xs leading-relaxed text-fg-muted">{description}</p>
    </div>
  );
}
