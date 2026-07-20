import { useState } from 'react';
import { useBookmarks } from '@renderer/store/bookmarks';
import { useTabs } from '@renderer/store/tabs';
import { Button, Input } from '@renderer/components/ui';
import { Star, Search } from '@renderer/components/ui/icons';

// Yer imleri sayfası — ekle/sil, ara, içe/dışa aktar (JSON).
export default function Bookmarks() {
  const nodes = useBookmarks((s) => s.nodes);
  const add = useBookmarks((s) => s.add);
  const remove = useBookmarks((s) => s.remove);
  const importJson = useBookmarks((s) => s.importJson);
  const exportJson = useBookmarks((s) => s.exportJson);
  const open = useTabs((s) => s.open);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [q, setQ] = useState('');

  const filtered = nodes.filter(
    (n) => !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.url?.includes(q),
  );

  const handleAdd = () => {
    if (!title.trim() || !url.trim()) return;
    add({ title: title.trim(), url: url.trim() });
    setTitle('');
    setUrl('');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(exportJson(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aethernode-bookmarks.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      file.text().then((txt) => {
        try {
          importJson(JSON.parse(txt));
        } catch {
          /* yoksay */
        }
      });
    };
    input.click();
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <Star className="text-brand" />
        <h1 className="text-xl font-semibold">Yer İmleri</h1>
      </header>

      <section className="glass mb-6 rounded-2xl p-4">
        <div className="flex gap-2">
          <Input placeholder="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button variant="brand" onClick={handleAdd}>Ekle</Button>
        </div>
      </section>

      <section className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-bg-elevated/60 px-3">
          <Search className="h-4 w-4 text-fg-subtle" />
          <input
            className="h-10 w-full bg-transparent text-sm focus:outline-none"
            placeholder="Yer imlerinde ara"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleImport}>İçe Aktar</Button>
        <Button variant="outline" size="sm" onClick={handleExport}>Dışa Aktar</Button>
      </section>

      <ul className="space-y-2">
        {filtered.length === 0 && (
          <li className="text-sm text-fg-subtle">Henüz yer imi yok.</li>
        )}
        {filtered.map((n) => (
          <li
            key={n.id}
            className="glass flex items-center justify-between rounded-xl px-4 py-3"
          >
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => n.url && open(n.url)}
            >
              <div className="truncate text-sm font-medium">{n.title}</div>
              {n.url && <div className="truncate text-xs text-fg-muted">{n.url}</div>}
            </button>
            <button
              className="ml-3 text-xs text-fg-muted hover:text-danger"
              onClick={() => remove(n.id)}
            >
              Sil
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}