import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Tooltip } from '@renderer/components/ui';
import { Qr } from '@renderer/components/ui/icons';

/**
 * QR ile telefona gönder — URL cihazdan çıkmadan yerel olarak QR koduna
 * çevrilir (sunucu/hesap yok). Telefon kamerasıyla okutulur.
 */
export function QrShare({ url, disabled }: { url: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: 480,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b0b0f', light: '#ffffff' },
    })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (disabled || !/^https?:\/\//i.test(url)) return null;

  return (
    <div className="relative" ref={rootRef}>
      <Tooltip label="QR ile telefona gönder">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`grid h-8 w-8 place-items-center rounded-lg transition ${
            open ? 'bg-brand/20 text-brand' : 'text-fg-muted hover:bg-white/5 hover:text-fg'
          }`}
          aria-label="QR ile telefona gönder"
        >
          <Qr className="h-4 w-4" />
        </button>
      </Tooltip>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 rounded-xl border border-white/10 bg-bg-elevated/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Telefona gönder
          </div>
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="Sayfa QR kodu"
              className="w-full rounded-lg bg-white p-1.5"
              draggable={false}
            />
          ) : (
            <div className="grid h-56 w-full place-items-center rounded-lg bg-white/5 text-xs text-fg-subtle">
              QR oluşturuluyor…
            </div>
          )}
          <p className="mt-2 break-all text-[10px] leading-relaxed text-fg-subtle">
            {url.length > 90 ? `${url.slice(0, 90)}…` : url}
          </p>
          <p className="mt-1.5 text-[10px] text-fg-subtle">
            Telefon kamerasıyla okut — adres cihazından hiç çıkmaz, sunucu ve hesap gerekmez.
          </p>
        </div>
      )}
    </div>
  );
}
