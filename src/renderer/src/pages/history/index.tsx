import { useEffect, useState } from 'react';
import { HistoryIcon, Trash, Globe } from '@renderer/components/ui/icons';
import { useHistory } from '@renderer/store/history';
import { useTabs } from '@renderer/store/tabs';

// Gezinme geçmişi sayfası (Ctrl+H).
// Arama, tek kayıt silme ve toplu temizleme. Incognito ziyaretleri
// buraya hiç düşmez (renderer kayıt aşamasında filtreler).
export default function HistoryPage() {
  const entries = useHistory((s) => s.entries);
  const loaded = useHistory((s) => s.loaded);
  const load = useHistory((s) => s.load);
  const remove = useHistory((s) => s.remove);
  const clear = useHistory((s) => s.clear);
  const openTab = useTabs((s) => s.open);

  const [query, setQuery] = useState('');

  useEffect(() => {
    void load(query || undefined);
  }, [load, query]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HistoryIcon className="text-brand" />
          <h1 className="text-xl font-semibold">Geçmiş</h1>
          <span className="text-xs text-fg-muted">{entries.length} kayıt</span>
        </div>
        <button
          onClick={() => void clear()}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-bg-elevated/60 px-3 py-1.5 text-xs text-fg-muted transition hover:border-red-500/40 hover:text-red-400"
        >
          <Trash className="h-3.5 w-3.5" />
          Tümünü temizle
        </button>
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Geçmişte ara…"
        className="mb-4 h-10 w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-3 text-sm placeholder:text-fg-subtle focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/25"
        spellCheck={false}
      />

      {!loaded ? (
        <div className="py-16 text-center text-sm text-fg-muted">Yükleniyor…</div>
      ) : entries.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center text-sm text-fg-muted">
          {query ? 'Eşleşen kayıt yok.' : 'Geçmiş boş.'}
        </div>
      ) : (
        <div className="glass divide-y divide-white/5 rounded-2xl">
          {entries.map((e) => (
            <div key={e.id} className="group flex items-center gap-3 px-4 py-2.5">
              <Globe className="h-4 w-4 shrink-0 text-fg-subtle" />
              <button
                onClick={() => openTab(e.url)}
                className="min-w-0 flex-1 text-left"
                title={e.url}
              >
                <div className="truncate text-sm text-fg">{e.title || e.url}</div>
                <div className="truncate text-xs text-fg-subtle">{e.url}</div>
              </button>
              <div className="shrink-0 text-right">
                <div className="text-xs text-fg-muted">
                  {new Date(e.visitedAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                {e.visitCount > 1 && (
                  <div className="text-[10px] text-fg-subtle">{e.visitCount} ziyaret</div>
                )}
              </div>
              <button
                onClick={() => void remove(e.id)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-fg-subtle opacity-0 transition hover:bg-white/5 hover:text-red-400 group-hover:opacity-100"
                aria-label="Kaydı sil"
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
