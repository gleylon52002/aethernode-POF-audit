import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTabs } from '@renderer/store/tabs';
import { showToast } from './toast-bus';
import { LinkIcon, Close } from '@renderer/components/ui/icons';

// Geçici / tek kullanımlık bağlantı oluşturma paneli — Ctrl+Shift+K.
// Sunucusuz model: süre + kullanım sayısı imzalı token olarak linke gömülür,
// hiçbir sunucuya veri gitmez. Alıcının AetherNode'u süreyi yerel denetler.

export const TEMP_LINK_EVENT = 'aether:temp-link';

const DURATIONS = [
  { label: '15 dakika', ms: 15 * 60_000 },
  { label: '1 saat', ms: 3600_000 },
  { label: '24 saat', ms: 24 * 3600_000 },
] as const;

export function TempLinkPanel() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const active = useTabs((s) => s.tabs.find((t) => t.id === s.activeId));

  useEffect(() => {
    const toggle = () => {
      setOpen((v) => !v);
      setCreated(null);
    };
    window.addEventListener(TEMP_LINK_EVENT, toggle);
    return () => window.removeEventListener(TEMP_LINK_EVENT, toggle);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const url = active?.url ?? '';
  const shareable = /^https?:\/\//i.test(url);

  const create = async (ttlMs: number, maxUses: number) => {
    setBusy(true);
    const res = await window.aether.relay.create(url, ttlMs, maxUses);
    setBusy(false);
    if (res.ok && res.data?.token) {
      setCreated(res.data.token);
      showToast('Geçici bağlantı panoya kopyalandı', 'success');
    } else {
      showToast(`Bağlantı oluşturulamadı: ${res.ok ? '' : res.error}`, 'error');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="mx-auto mt-[14vh] w-[min(460px,92vw)] rounded-2xl border border-white/10 bg-bg-elevated/95 p-5 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-brand" />
          <h2 className="flex-1 text-sm font-semibold text-fg">Geçici Bağlantı Oluştur</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-6 w-6 place-items-center rounded text-fg-muted hover:bg-white/10 hover:text-fg"
            aria-label="Kapat"
          >
            <Close className="h-3.5 w-3.5" />
          </button>
        </div>

        {!shareable ? (
          <p className="text-xs text-fg-muted">
            Bu sayfa paylaşılamaz — yalnızca http(s) sayfaları için geçici bağlantı
            oluşturulabilir.
          </p>
        ) : created ? (
          <div>
            <p className="mb-2 text-xs text-fg-muted">
              Bağlantı panoya kopyalandı. Alıcı, AetherNode&apos;da açtığında sayfa izole
              (çerezsiz/oturumsuz) bir bağlamda yüklenir.
            </p>
            <div className="break-all rounded-lg border border-white/10 bg-black/30 p-2.5 text-[10.5px] text-fg-muted">
              {created}
            </div>
          </div>
        ) : (
          <>
            <p className="mb-1 truncate text-xs text-fg-muted" title={url}>
              {url}
            </p>
            <p className="mb-3 text-[11px] leading-relaxed text-fg-subtle">
              Süre ve kullanım sınırı bağlantının içine imzalı olarak gömülür — hiçbir sunucuya
              veri gönderilmez. Not: bu, dürüstlük temelli bir sınırdır; giriş gerektiren
              (kişiselleştirilmiş) sayfalarda alıcı sayfanın herkese açık halini görür.
            </p>
            <div className="mb-2 grid grid-cols-3 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.ms}
                  type="button"
                  disabled={busy}
                  onClick={() => void create(d.ms, 0)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[11.5px] text-fg-muted hover:bg-white/10 hover:text-fg disabled:opacity-50"
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void create(24 * 3600_000, 1)}
              className="w-full rounded-lg bg-brand/20 px-3 py-2 text-[11.5px] font-medium text-brand hover:bg-brand/30 disabled:opacity-50"
            >
              Tek kullanımlık (açılınca geçersizleşir, en fazla 24 saat)
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
