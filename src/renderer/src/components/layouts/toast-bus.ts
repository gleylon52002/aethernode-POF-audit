type ToastTone = 'info' | 'error' | 'success';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}

export interface ShowToastOptions {
  message: string;
  tone?: ToastTone;
  duration?: number;
  action?: ToastAction;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((l) => l(items));
}

// Backward-compatible: showToast(message, tone, ms) still works.
// New: showToast({ message, tone, duration, action })
export function showToast(
  messageOrOpts: string | ShowToastOptions,
  tone: ToastTone = 'info',
  ms = 5200,
  action?: ToastAction,
): void {
  let message: string;
  let finalTone: ToastTone = tone;
  let duration = ms;
  let finalAction: ToastAction | undefined = action;

  if (typeof messageOrOpts === 'object') {
    message = messageOrOpts.message;
    finalTone = messageOrOpts.tone ?? 'info';
    duration = messageOrOpts.duration ?? 5200;
    finalAction = messageOrOpts.action;
  } else {
    message = messageOrOpts;
  }

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  items = [...items, { id, message, tone: finalTone, action: finalAction }].slice(-4);
  emit();
  window.setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, duration);
}

// Hook-friendly wrapper
export function useToast() {
  return {
    show: (opts: ShowToastOptions) => showToast(opts),
  };
}

export function subscribeToasts(cb: Listener): () => void {
  listeners.add(cb);
  cb(items);
  return () => listeners.delete(cb);
}
