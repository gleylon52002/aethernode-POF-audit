import { useEffect, useRef } from 'react';

const THROTTLE_MS = 30_000;

export function useVaultIdle(): void {
  const last = useRef(0);

  useEffect(() => {
    const touch = () => {
      const now = Date.now();
      if (now - last.current < THROTTLE_MS) return;
      last.current = now;
      void window.aether.passwords.touchIdle().catch(() => undefined);
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'];
    for (const ev of events) window.addEventListener(ev, touch, { passive: true });

    // Webview navigasyonu da aktivite sayılır — ipc via webview-stack already triggers, but also listen for visibility
    const onVisibility = () => {
      if (document.visibilityState === 'visible') touch();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      for (const ev of events) window.removeEventListener(ev, touch);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
