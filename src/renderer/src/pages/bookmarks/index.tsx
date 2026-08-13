import { useMemo, useState } from 'react';
import { useBookmarks } from '@renderer/store/bookmarks';
import { useTabs } from '@renderer/store/tabs';
import { useSettings } from '@renderer/store/settings';
import { Button, Input } from '@renderer/components/ui';
import { Star, Search } from '@renderer/components/ui/icons';
import { EmptyState } from '@renderer/components/ui/empty-state';

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Yer imleri sayfası — ekle/sil/düzenle, ara, klasörle, içe/dışa aktar
export default function Bookmarks() {
  const nodes = useBookmarks((s) => s.nodes);
  const folders = useBookmarks((s) => s.folders);
  const add = useBookmarks((s) => s.add);
  const update = useBookmarks((s) => s.update);
  const remove = useBookmarks((s) => s.remove);
  const createFolder = useBookmarks((s) => s.createFolder);
  const renameFolder = useBookmarks((s) => s.renameFolder);
  const removeFolder = useBookmarks((s) => s.removeFolder);
  const moveToFolder = useBookmarks((s) => s.moveToFolder);
  const importJson = useBookmarks((s) => s.importJson);
  const exportJson = useBookmarks((s) => s.exportJson);
  const open = useTabs((s) => s.open);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [q, setQ] = useState('');
  const [dismissedLocal, setDismissedLocal] = useState(false);
  const settings = useSettings((s) => s.settings);
  const applySettings = useSettings((s) => s.apply);

  // inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');

  // folder UI
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = nodes.filter(
    (n) => !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.url?.includes(q),
  );

  const suggestion = useMemo(() => {
    if (dismissedLocal) return null;
    const dismissedAt = settings.general.bookmarkSuggestionDismissedAt;
    if (dismissedAt) {
      const diff = Date.now() - new Date(dismissedAt).getTime();
      if (diff < 30 * 24 * 60 * 60 * 1000) return null;
    }
    if (nodes.length <= 20) return null;
    const unfiled = nodes.filter((n) => !n.folderId && !n.folder).length;
    if (unfiled / nodes.length < 0.3) return null;
    const byDomain = new Map<string, number>();
    for (const n of nodes) {
      if (!n.url || n.folderId) continue;
      try {
        const h = new URL(n.url).hostname.replace(/^www\./, '');
        byDomain.set(h, (byDomain.get(h) ?? 0) + 1);
      } catch {}
    }
    const candidates = [...byDomain.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (candidates.length === 0) return null;
    return candidates;
  }, [nodes, settings.general.bookmarkSuggestionDismissedAt, dismissedLocal]);

  const dismissSuggestion = () => {
    setDismissedLocal(true);
    void applySettings({ ...settings, general: { ...settings.general, bookmarkSuggestionDismissedAt: new Date().toISOString() } });
  };

  const handleAdd = () => {
    if (!title.trim() || !url.trim()) return;
    if (!isValidUrl(url.trim())) return;
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

  const startEdit = (id: string, t: string, u: string) => {
    setEditingId(id);
    setEditTitle(t);
    setEditUrl(u);
  };

  const saveEdit = () => {
    if (!editingId) return;
    if (!editTitle.trim() || !editUrl.trim() || !isValidUrl(editUrl.trim())) return;
    update(editingId, { title: editTitle.trim(), url: editUrl.trim() });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder(newFolderName.trim());
    setNewFolderName('');
  };

  const isSearching = q.trim().length > 0;

  const renderBookmarkRow = (n: (typeof nodes)[number]) => {
    const isEditing = editingId === n.id;
    if (isEditing) {
      const valid = editTitle.trim().length > 0 && editUrl.trim().length > 0 && isValidUrl(editUrl.trim());
      return (
        <li key={n.id} className="glass flex flex-col gap-2 rounded-xl px-4 py-3">
          <div className="flex gap-2">
            <Input placeholder="Başlık" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && valid) saveEdit(); if (e.key === 'Escape') cancelEdit(); }} />
            <Input placeholder="https://…" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && valid) saveEdit(); if (e.key === 'Escape') cancelEdit(); }} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancelEdit} className="rounded-lg border border-white/10 px-3 py-1 text-xs text-fg-muted hover:bg-white/5">İptal</button>
            <button type="button" disabled={!valid} onClick={saveEdit} className="rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white disabled:opacity-40 hover:bg-brand-600">Kaydet</button>
          </div>
        </li>
      );
    }
    return (
      <li key={n.id} className="glass flex items-center justify-between gap-2 rounded-xl px-4 py-3">
        <button className="min-w-0 flex-1 text-left" onClick={() => n.url && open(n.url)}>
          <div className="truncate text-sm font-medium">{n.title}</div>
          {n.url && <div className="truncate text-xs text-fg-muted">{n.url}</div>}
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          <select
            value={n.folderId ?? ''}
            onChange={(e) => moveToFolder(n.id, e.target.value || null)}
            className="h-7 rounded-lg border border-white/10 bg-bg-elevated/60 px-1.5 text-xs"
            title="Klasör değiştir"
          >
            <option value="">Klasörsüz</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button type="button" onClick={() => startEdit(n.id, n.title, n.url ?? '')} className="grid h-7 w-7 place-items-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-fg" aria-label="Düzenle" title="Düzenle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
          </button>
          <button className="grid h-7 w-7 place-items-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-danger" onClick={() => remove(n.id)} aria-label="Sil">×</button>
        </div>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <Star className="text-brand" />
        <h1 className="text-xl font-semibold">Yer İmleri</h1>
        <span className="text-xs text-fg-muted">{nodes.length} kayıt · {folders.length} klasör</span>
      </header>

      <section className="glass mb-6 rounded-2xl p-4">
        <div className="flex gap-2">
          <Input placeholder="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
          <Button variant="brand" onClick={handleAdd}>Ekle</Button>
        </div>
      </section>

      <section className="glass mb-4 rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <Input placeholder="Yeni klasör adı" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }} className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleCreateFolder}>+ Yeni Klasör</Button>
        </div>
      </section>

      <section className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-bg-elevated/60 px-3">
          <Search className="h-4 w-4 text-fg-subtle" />
          <input className="h-10 w-full bg-transparent text-sm focus:outline-none" placeholder="Yer imlerinde ara" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={handleImport}>İçe Aktar</Button>
        <Button variant="outline" size="sm" onClick={handleExport}>Dışa Aktar</Button>
      </section>

      {suggestion && (
        <div className="glass mb-4 flex items-start justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
          <div>
            <p className="text-sm font-medium text-amber-100">Bunları gruplamak ister misin?</p>
            <p className="mt-1 text-xs text-fg-muted">{suggestion.map(([d, c]) => `${d} (${c})`).join(' · ')} — aynı domainden 3+ yer imin var.</p>
          </div>
          <button type="button" onClick={dismissSuggestion} className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-fg-muted hover:bg-white/5">Daha sonra</button>
        </div>
      )}

      {isSearching ? (
        filtered.length === 0 ? (
          <div className="glass rounded-2xl"><EmptyState variant="bookmarks" title="Eşleşen yer imi yok" description="Farklı bir arama terimi dene." /></div>
        ) : (
          <ul className="space-y-2">{filtered.map(renderBookmarkRow)}</ul>
        )
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl"><EmptyState variant="bookmarks" title="Henüz yer imi yok" description="Beğendiğin siteleri yer imlerine ekle, burada görünecek." /></div>
      ) : (
        <div className="space-y-4">
          {folders.map((f) => {
            const items = filtered.filter((n) => n.folderId === f.id);
            const isCollapsed = !!collapsed[f.id];
            const isEditingFolder = editingFolderId === f.id;
            return (
              <div key={f.id} className="glass rounded-2xl">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button type="button" onClick={() => setCollapsed((s) => ({ ...s, [f.id]: !s[f.id] }))} className="flex flex-1 items-center gap-2 text-left">
                    <span className={`transition ${isCollapsed ? '-rotate-90' : ''}`}>▾</span>
                    {isEditingFolder ? (
                      <input autoFocus value={editFolderName} onChange={(e) => setEditFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && editFolderName.trim()) { renameFolder(f.id, editFolderName.trim()); setEditingFolderId(null); } if (e.key === 'Escape') setEditingFolderId(null); }} onClick={(e) => e.stopPropagation()} className="h-7 flex-1 rounded border border-white/10 bg-bg-elevated px-2 text-sm" />
                    ) : (
                      <span className="text-sm font-medium text-fg">{f.name}</span>
                    )}
                    <span className="text-xs text-fg-muted">({items.length})</span>
                  </button>
                  <div className="flex items-center gap-1">
                    {isEditingFolder ? (
                      <>
                        <button type="button" onClick={() => { if (editFolderName.trim()) renameFolder(f.id, editFolderName.trim()); setEditingFolderId(null); }} className="rounded px-2 py-1 text-xs bg-brand text-white">Kaydet</button>
                        <button type="button" onClick={() => setEditingFolderId(null)} className="rounded px-2 py-1 text-xs text-fg-muted hover:bg-white/5">İptal</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => { setEditingFolderId(f.id); setEditFolderName(f.name); }} className="grid h-7 w-7 place-items-center rounded text-fg-muted hover:bg-white/5" title="Yeniden adlandır">✎</button>
                    )}
                    <button type="button" onClick={() => { if (confirm(`"${f.name}" klasörü silinsin mi? İçindeki yer imleri Klasörsüz'e taşınacak.`)) removeFolder(f.id); }} className="grid h-7 w-7 place-items-center rounded text-fg-muted hover:text-danger" title="Klasörü sil">×</button>
                  </div>
                </div>
                {!isCollapsed && (
                  <ul className="space-y-2 border-t border-white/5 p-2">
                    {items.length === 0 ? <li className="px-2 py-2 text-xs text-fg-subtle">Bu klasör boş.</li> : items.map(renderBookmarkRow)}
                  </ul>
                )}
              </div>
            );
          })}

          <div className="glass rounded-2xl">
            <div className="flex items-center gap-2 px-3 py-2">
              <button type="button" onClick={() => setCollapsed((s) => ({ ...s, __unsorted: !s.__unsorted }))} className="flex flex-1 items-center gap-2 text-left">
                <span className={`transition ${collapsed.__unsorted ? '-rotate-90' : ''}`}>▾</span>
                <span className="text-sm font-medium text-fg">Klasörsüz</span>
                <span className="text-xs text-fg-muted">({filtered.filter((n) => !n.folderId).length})</span>
              </button>
            </div>
            {!collapsed.__unsorted && (
              <ul className="space-y-2 border-t border-white/5 p-2">
                {filtered.filter((n) => !n.folderId).map(renderBookmarkRow)}
                {filtered.filter((n) => !n.folderId).length === 0 && <li className="px-2 py-2 text-xs text-fg-subtle">Klasörsüz yer imi yok.</li>}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
