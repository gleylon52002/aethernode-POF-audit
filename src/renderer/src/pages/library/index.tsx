import { useArchive } from '@renderer/store/archive';
import { useTabs } from '@renderer/store/tabs';

export default function LibraryPage() {
  const items = useArchive((s) => s.items);
  const remove = useArchive((s) => s.remove);
  const clear = useArchive((s) => s.clear);
  const open = useTabs((s) => s.open);

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Kütüphane</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Arşivlenen sekmeler — silinmedi, buradan geri açabilirsiniz.
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => clear()}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-fg-muted hover:bg-white/10 hover:text-fg"
          >
            Tümünü temizle
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-12 text-center text-sm text-fg-subtle">Arşiv boş</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-bg-elevated/50 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-fg">{it.title || it.url}</div>
                <div className="truncate text-xs text-fg-subtle">{it.url}</div>
                <div className="mt-0.5 text-[10px] text-fg-subtle">
                  {new Date(it.archivedAt).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg bg-brand/20 px-2.5 py-1 text-xs text-brand hover:bg-brand/30"
                onClick={() => {
                  open(it.url);
                  remove(it.id);
                }}
              >
                Geri aç
              </button>
              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-fg-muted hover:bg-white/10 hover:text-fg"
                onClick={() => remove(it.id)}
              >
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
