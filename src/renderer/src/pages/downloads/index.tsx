import { useDownloads } from '@renderer/store/downloads';
import { Download } from '@renderer/components/ui/icons';

// Modern indirme yöneticisi. v1: listeleme + duraklat/devam simülasyonu;
// gerçek kontroller Electron downloads API ile Aşama 6'da bağlanacak.
export default function Downloads() {
  const items = useDownloads((s) => s.items);
  const update = useDownloads((s) => s.update);
  const remove = useDownloads((s) => s.remove);

  const fmtSize = (n?: number) =>
    n === undefined ? '—' : n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <Download className="text-brand" />
        <h1 className="text-xl font-semibold">İndirilenler</h1>
      </header>

      {items.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-fg-muted">
          Henüz indirme yok.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((d) => (
            <li key={d.id} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.filename}</div>
                  <div className="truncate text-xs text-fg-muted">{d.url}</div>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <button
                    className="rounded-md border border-white/10 px-3 py-1 text-xs hover:bg-white/5"
                    onClick={() => update(d.id, { status: d.status === 'paused' ? 'progressing' : 'paused' })}
                  >
                    {d.status === 'paused' ? 'Devam' : 'Duraklat'}
                  </button>
                  <button
                    className="rounded-md border border-danger/30 px-3 py-1 text-xs text-danger hover:bg-danger/10"
                    onClick={() => update(d.id, { status: 'cancelled' })}
                  >
                    İptal
                  </button>
                  <button
                    className="rounded-md px-3 py-1 text-xs text-fg-muted hover:bg-white/5"
                    onClick={() => remove(d.id)}
                  >
                    Sil
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-fg-muted">
                <span>
                  {fmtSize(d.bytesReceived)} / {fmtSize(d.bytesTotal)}
                </span>
                <span>·</span>
                <span className="capitalize">{d.status}</span>
              </div>
              {d.bytesTotal ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full bg-brand"
                    style={{
                      width: `${Math.min(100, ((d.bytesReceived ?? 0) / d.bytesTotal) * 100)}%`,
                    }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}