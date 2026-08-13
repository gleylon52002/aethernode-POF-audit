import { useEffect } from 'react';
import { useDownloads, type DownloadStatus } from '@renderer/store/downloads';
import { useTabs } from '@renderer/store/tabs';
import { Download } from '@renderer/components/ui/icons';
import { EmptyState } from '@renderer/components/ui/empty-state';

const STATUS_TR: Record<DownloadStatus, string> = {
  queued: 'Sırada',
  progressing: 'İndiriliyor',
  paused: 'Duraklatıldı',
  completed: 'Tamamlandı',
  failed: 'Başarısız',
  cancelled: 'İptal',
};

function fmtSize(n?: number): string {
  if (n === undefined || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function pct(received: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((received / total) * 100));
}

export default function Downloads() {
  const items = useDownloads((s) => s.items);
  const loaded = useDownloads((s) => s.loaded);
  const load = useDownloads((s) => s.load);
  const pause = useDownloads((s) => s.pause);
  const resume = useDownloads((s) => s.resume);
  const cancel = useDownloads((s) => s.cancel);
  const open = useDownloads((s) => s.open);
  const openFolder = useDownloads((s) => s.openFolder);
  const remove = useDownloads((s) => s.remove);
  const clearCompleted = useDownloads((s) => s.clearCompleted);
  const openTab = useTabs((s) => s.open);

  const previewPdf = (d: { path: string; filename: string; mimeType?: string }) => {
    const isPdf =
      /\.pdf$/i.test(d.filename) ||
      (d.mimeType || '').includes('pdf');
    if (!isPdf || !d.path) return;
    // Windows yolu → file:// URL
    const fileUrl = d.path.startsWith('file:')
      ? d.path
      : `file:///${d.path.replace(/\\/g, '/')}`;
    openTab(`aethernode://pdf?src=${encodeURIComponent(fileUrl)}`);
  };

  useEffect(() => {
    void load();
  }, [load]);

  const activeCount = items.filter(
    (d) => d.status === 'progressing' || d.status === 'paused' || d.status === 'queued',
  ).length;
  const doneCount = items.filter(
    (d) => d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled',
  ).length;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Download className="text-brand" />
          <div>
            <h1 className="text-xl font-semibold">İndirilenler</h1>
            <p className="text-xs text-fg-muted">
              {loaded
                ? `${activeCount} aktif · ${doneCount} tamamlanan`
                : 'Yükleniyor…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"
            onClick={() => void openFolder()}
          >
            Klasörü aç
          </button>
          {doneCount > 0 ? (
            <button
              type="button"
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"
              onClick={() => void clearCompleted()}
            >
              Tamamlananları temizle
            </button>
          ) : null}
        </div>
      </header>

      {items.length === 0 ? (
        <div className="glass rounded-2xl">
          <EmptyState
            variant="downloads"
            title="Henüz indirme yok"
            description="Bir dosya indirdiğinde burada görünecek — İndirilenler klasörüne kaydedilir."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((d) => {
            const progress = pct(d.bytesReceived, d.bytesTotal);
            const active =
              d.status === 'progressing' || d.status === 'paused' || d.status === 'queued';
            return (
              <li key={d.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="truncate text-left text-sm font-medium hover:text-brand"
                      title={d.path || d.filename}
                      onClick={() => {
                        if (d.status === 'completed') void open(d.id);
                      }}
                    >
                      {d.filename}
                    </button>
                    <div className="truncate text-xs text-fg-muted">{d.url}</div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {d.status === 'progressing' ? (
                      <button
                        type="button"
                        className="rounded-md border border-white/10 px-2.5 py-1 text-xs hover:bg-white/5"
                        onClick={() => void pause(d.id)}
                      >
                        Duraklat
                      </button>
                    ) : null}
                    {d.status === 'paused' || (d.status === 'failed' && d.canResume) ? (
                      <button
                        type="button"
                        className="rounded-md border border-white/10 px-2.5 py-1 text-xs hover:bg-white/5"
                        onClick={() => void resume(d.id)}
                      >
                        Devam
                      </button>
                    ) : null}
                    {active ? (
                      <button
                        type="button"
                        className="rounded-md border border-danger/30 px-2.5 py-1 text-xs text-danger hover:bg-danger/10"
                        onClick={() => void cancel(d.id)}
                      >
                        İptal
                      </button>
                    ) : null}
                    {d.status === 'completed' ? (
                      <>
                        {( /\.pdf$/i.test(d.filename) || (d.mimeType || '').includes('pdf') ) && (
                          <button
                            type="button"
                            className="rounded-md border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs text-brand hover:bg-brand/20"
                            onClick={() => previewPdf(d)}
                          >
                            Önizle
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded-md border border-white/10 px-2.5 py-1 text-xs hover:bg-white/5"
                          onClick={() => void open(d.id)}
                        >
                          Aç
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-white/10 px-2.5 py-1 text-xs hover:bg-white/5"
                          onClick={() => void openFolder(d.id)}
                        >
                          Konumu göster
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-amber-500/30 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-500/10"
                          title="VirusTotal ile kontrol (harici)"
                          onClick={() => {
                            const q = encodeURIComponent(d.filename);
                            openTab(`https://www.virustotal.com/gui/search/${q}`);
                          }}
                        >
                          VT
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-md px-2.5 py-1 text-xs text-fg-muted hover:bg-white/5"
                      onClick={() => void remove(d.id)}
                    >
                      Sil
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-fg-muted">
                  <span>
                    {fmtSize(d.bytesReceived)}
                    {d.bytesTotal > 0 ? ` / ${fmtSize(d.bytesTotal)}` : ''}
                  </span>
                  {d.bytesTotal > 0 && active ? (
                    <>
                      <span>·</span>
                      <span>%{progress}</span>
                    </>
                  ) : null}
                  <span>·</span>
                  <span>{STATUS_TR[d.status] ?? d.status}</span>
                  {d.sha256 ? (
                    <>
                      <span>·</span>
                      <span title={d.sha256} className="font-mono">
                        sha256:{d.sha256.slice(0, 12)}…
                      </span>
                    </>
                  ) : null}
                </div>
                {(active || d.status === 'completed') && d.bytesTotal > 0 ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full transition-[width] duration-200 ${
                        d.status === 'completed'
                          ? 'bg-emerald-500'
                          : d.status === 'paused'
                            ? 'bg-amber-400'
                            : 'bg-brand'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
