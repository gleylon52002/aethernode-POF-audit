import { useEffect, useState } from 'react';
import { Badge, Button, Input } from '@renderer/components/ui';
import { Note, Lock as LockIcon } from '@renderer/components/ui/icons';
import { useNotes } from '@renderer/store/notes';
import type { SecureNote } from '@shared/types/notes';

// Güvenli Notlar — Aşama 6.
//
// Sol kolon: not listesi (arama + seç). Sağ kolon: düzenleyici. Kasa kilitliyse
// unlock kartı. Notlar AES-256-GCM ile mühürlenir; render her seferinde main'den
// taze çekilir (cache tutulmaz, çıkınca RAM'den silinir).

export default function NotesPage() {
  const loaded = useNotes((s) => s.loaded);
  const locked = useNotes((s) => s.locked);
  const error = useNotes((s) => s.error);
  const load = useNotes((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) {
    return (
      <div className="grid h-full place-items-center text-sm text-fg-muted">
        Notlar yükleniyor…
      </div>
    );
  }
  if (locked) {
    return (
      <div className="mx-auto grid h-full max-w-md place-items-center p-6">
        <div className="glass-strong w-full rounded-3xl p-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand">
            <LockIcon />
          </div>
          <h1 className="text-lg font-semibold">Kasa Kilitli</h1>
          <p className="mt-1 text-xs text-fg-muted">
            Güvenli notlara erişmek için önce şifre yöneticisini açın.
          </p>
          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
          <a
            href="aethernode://passwords"
            className="mt-4 inline-block text-xs text-brand underline"
          >
            Şifre kasasını aç →
          </a>
        </div>
      </div>
    );
  }
  return <NotesWorkspace />;
}

function NotesWorkspace() {
  const notes = useNotes((s) => s.notes);
  const selectedId = useNotes((s) => s.selectedId);
  const add = useNotes((s) => s.add);
  const update = useNotes((s) => s.update);
  const remove = useNotes((s) => s.remove);
  const select = useNotes((s) => s.select);

  const [query, setQuery] = useState('');
  const filtered = notes.filter(
    (n) =>
      query.trim() === '' ||
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.body.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = notes.find((n) => n.id === selectedId) ?? filtered[0];

  return (
    <div className="mx-auto flex h-full max-w-5xl gap-4 p-6">
      <aside className="flex w-72 shrink-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <Note className="text-brand" />
          <h1 className="text-lg font-semibold">Notlar</h1>
          <Badge tone="muted">{notes.length}</Badge>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ara…"
        />
        <Button
          variant="brand"
          size="sm"
          onClick={async () => {
            await add('Yeni not', '');
          }}
        >
          + Yeni Not
        </Button>
        <div className="glass flex-1 overflow-y-auto rounded-2xl">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-xs text-fg-muted">Eşleşen not yok.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {filtered.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => select(n.id)}
                    className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-white/5 ${
                      selected?.id === n.id ? 'bg-brand/10' : ''
                    }`}
                  >
                    <div className="truncate font-medium">{n.title || 'Başlıksız'}</div>
                    <div className="truncate text-xs text-fg-muted">
                      {n.body ? n.body.slice(0, 48) : 'Boş'}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section className="glass flex-1 rounded-2xl p-5">
        {selected ? (
          <Editor
            key={selected.id}
            note={selected}
            onSave={async (patch) => {
              await update(selected.id, patch);
            }}
            onDelete={async () => {
              if (confirm(`"${selected.title}" silinsin mi?`)) {
                await remove(selected.id);
              }
            }}
          />
        ) : (
          <p className="grid h-full place-items-center text-sm text-fg-muted">
            Bir not seçin veya yeni oluşturun.
          </p>
        )}
      </section>
    </div>
  );
}

function Editor({
  note,
  onSave,
  onDelete,
}: {
  note: SecureNote;
  onSave: (patch: { title?: string; body?: string }) => Promise<void>;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const dirty = title !== note.title || body !== note.body;

  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
  }, [note.id, note.title, note.body]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Başlık"
          className="text-base"
        />
        <div className="flex shrink-0 gap-2">
          <Button variant="danger" size="sm" onClick={onDelete}>
            Sil
          </Button>
          <Button
            variant="brand"
            size="sm"
            disabled={!dirty}
            onClick={() => void onSave({ title: title.trim() || 'Başlıksız', body })}
          >
            Kaydet
          </Button>
        </div>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Notunuz…"
        className="flex-1 resize-none rounded-xl border border-white/10 bg-bg-elevated/60 p-3 text-sm font-mono focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/25"
      />
      <div className="mt-2 text-[11px] text-fg-subtle">
        AES-256-GCM ile mühürlenir · son güncelleme:{' '}
        {new Date(note.updatedAt).toLocaleString('tr-TR')}
      </div>
    </div>
  );
}