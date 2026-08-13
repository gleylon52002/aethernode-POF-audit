import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Input } from '@renderer/components/ui';
import { Note, Lock as LockIcon, Search as SearchIcon, Pin as PinIcon } from '@renderer/components/ui/icons';
import { useNotes } from '@renderer/store/notes';
import { usePasswords } from '@renderer/store/passwords';
import { useTabs } from '@renderer/store/tabs';
import { EmptyState } from '@renderer/components/ui/empty-state';
import type { SecureNote, NoteColor } from '@shared/types/notes';

// Güvenli Notlar — zengin özellikli markdown + pin/sort/checklist/highlight

const COLORS: Record<NoteColor, string> = {
  default: 'bg-white/5 border-white/10',
  purple: 'bg-purple-500/15 border-purple-500/30',
  blue: 'bg-sky-500/15 border-sky-500/30',
  emerald: 'bg-emerald-500/15 border-emerald-500/30',
  amber: 'bg-amber-500/15 border-amber-500/30',
  rose: 'bg-rose-500/15 border-rose-500/30',
};
const DOT: Record<NoteColor, string> = {
  default: 'bg-white/20',
  purple: 'bg-purple-400',
  blue: 'bg-sky-400',
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
};

type SortKey = 'updated' | 'created' | 'title';

function highlight(text: string, q: string): React.ReactNode {
  if (!q.trim()) return text;
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${esc})`, 'ig'));
  const lower = q.toLowerCase();
  return parts.map((p, i) =>
    p.toLowerCase() === lower ? (
      <mark key={i} className="rounded bg-amber-400/30 px-0.5 text-amber-100">
        {p}
      </mark>
    ) : (
      p
    ),
  );
}

function MarkdownView({
  md,
  query,
  onToggleTask,
}: {
  md: string;
  query: string;
  onToggleTask: (lineIdx: number, checked: boolean) => void;
}) {
  const lines = md.split('\n');
  const els: React.ReactNode[] = [];
  let inCode = false;
  let codeBuf: string[] = [];

  const flushCode = (key: number) => {
    if (codeBuf.length === 0) return;
    els.push(
      <pre key={`code-${key}`} className="my-2 overflow-auto rounded-xl bg-black/40 p-3 text-xs leading-relaxed">
        <code>{codeBuf.join('\n')}</code>
      </pre>,
    );
    codeBuf = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw;
    if (line.trim().startsWith('```')) {
      if (inCode) {
        flushCode(idx);
        inCode = false;
      } else inCode = true;
      return;
    }
    if (inCode) {
      codeBuf.push(line);
      return;
    }
    // Checklist
    const task = line.match(/^(\s*)-\s*\[( |x|X)\]\s*(.*)$/);
    if (task) {
      const checked = task[2].toLowerCase() === 'x';
      const text = task[3] ?? '';
      els.push(
        <label key={idx} className="my-1 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onToggleTask(idx, e.target.checked)}
            className="mt-0.5 accent-brand"
          />
          <span className={checked ? 'line-through text-fg-subtle' : 'text-fg'}>{highlight(text, query)}</span>
        </label>,
      );
      return;
    }
    if (/^\s*#{1,3}\s+/.test(line)) {
      const level = (line.match(/^#+/)?.[0].length ?? 1) as 1 | 2 | 3;
      const text = line.replace(/^#+\s+/, '');
      if (level === 1) els.push(<h1 key={idx} className="mt-3 text-lg font-semibold text-fg">{highlight(text, query)}</h1>);
      else if (level === 2) els.push(<h2 key={idx} className="mt-3 text-base font-semibold text-fg">{highlight(text, query)}</h2>);
      else els.push(<h3 key={idx} className="mt-2 text-sm font-semibold text-fg">{highlight(text, query)}</h3>);
      return;
    }
    if (/^\s*>\s+/.test(line)) {
      els.push(<blockquote key={idx} className="my-1 border-l-2 border-brand/40 pl-3 text-sm italic text-fg-muted">{highlight(line.replace(/^\s*>\s+/, ''), query)}</blockquote>);
      return;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      els.push(<li key={idx} className="ml-5 list-disc text-sm text-fg">{highlight(line.replace(/^\s*[-*]\s+/, ''), query)}</li>);
      return;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      els.push(<li key={idx} className="ml-5 list-decimal text-sm text-fg">{highlight(line.replace(/^\s*\d+\.\s+/, ''), query)}</li>);
      return;
    }
    if (line.trim() === '') {
      els.push(<div key={idx} className="h-2" />);
      return;
    }
    // Inline: bold, italic, code, link
    const inline = highlight(line, query);
    els.push(<p key={idx} className="my-1 text-sm leading-relaxed text-fg-muted">{inline}</p>);
  });
  if (inCode) flushCode(lines.length);
  return <div>{els}</div>;
}

export default function NotesPage() {
  const loaded = useNotes((s) => s.loaded);
  const locked = useNotes((s) => s.locked);
  const error = useNotes((s) => s.error);
  const load = useNotes((s) => s.load);
  useEffect(() => { void load(); }, [load]);
  if (!loaded) return <div className="grid h-full place-items-center text-sm text-fg-muted">Notlar yükleniyor…</div>;
  if (locked) return <NotesVaultLocked lastError={error} onUnlocked={() => void load()} />;
  return <NotesWorkspace />;
}

function NotesVaultLocked({ lastError, onUnlocked }: { lastError: string | null; onUnlocked: () => void }) {
  const unlock = usePasswords((s) => s.unlock);
  const loadPw = usePasswords((s) => s.load);
  const status = usePasswords((s) => s.status);
  const openTab = useTabs((s) => s.open);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void loadPw(); }, [loadPw]);
  const initialized = status?.initialized !== false;
  const submit = async () => {
    setBusy(true); setError(null);
    const ok = await unlock(password);
    setBusy(false);
    if (!ok) { setError(initialized ? 'Hatalı parola.' : 'Kasa açılamadı.'); return; }
    onUnlocked();
  };
  return (
    <div className="mx-auto grid h-full max-w-md place-items-center p-6">
      <div className="glass-strong w-full rounded-3xl p-8 text-center animate-slide-up">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand"><LockIcon /></div>
        <h1 className="text-lg font-semibold">{initialized ? 'Notlar için kasayı aç' : 'Şifre kasası kur'}</h1>
        <p className="mt-1 text-xs text-fg-muted">{initialized ? 'Güvenli notlar şifre kasasıyla korunur. Master parolanızı girin.' : 'İlk kurulum — notlar ve şifreler aynı master parola ile şifrelenir.'}</p>
        <div className="mt-5 text-left">
          <label className="mb-1 block text-xs text-fg-muted">Master parola</label>
          <Input type="password" value={password} autoFocus onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} placeholder="••••••••" />
          {(error || lastError) && <p className="mt-2 text-xs text-danger">{error || lastError}</p>}
        </div>
        <Button variant="brand" className="mt-5 w-full" disabled={busy || password.length === 0} onClick={() => void submit()}>{busy ? 'Açılıyor…' : initialized ? 'Kilidi aç ve notlara gir' : 'Kur ve aç'}</Button>
        <button type="button" className="mt-3 text-xs text-brand underline" onClick={() => openTab('aethernode://passwords')}>Şifre yöneticisine git →</button>
        <p className="mt-4 text-[11px] text-fg-subtle">AES-256-GCM · parola cihazda kalır, sunucuya gitmez.</p>
      </div>
    </div>
  );
}

function NotesWorkspace() {
  const notes = useNotes((s) => s.notes);
  const selectedId = useNotes((s) => s.selectedId);
  const add = useNotes((s) => s.add);
  const update = useNotes((s) => s.update);
  const remove = useNotes((s) => s.remove);
  const select = useNotes((s) => s.select);
  const togglePin = useNotes((s) => s.togglePin);
  const error = useNotes((s) => s.error);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [colorFilter, setColorFilter] = useState<NoteColor | 'all'>('all');

  const filtered = useMemo(() => {
    let list = notes.filter((n) => {
      if (colorFilter !== 'all' && (n.color ?? 'default') !== colorFilter) return false;
      if (query.trim() === '') return true;
      const q = query.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || (n.tags ?? []).some((t) => t.toLowerCase().includes(q));
    });
    list = [...list].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'tr');
      if (sort === 'created') return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });
    // Pinned first
    const pinned = list.filter((n) => n.pinned);
    const rest = list.filter((n) => !n.pinned);
    return [...pinned, ...rest];
  }, [notes, query, sort, colorFilter]);

  const pinnedCount = filtered.filter((n) => n.pinned).length;
  const selected = notes.find((n) => n.id === selectedId) ?? filtered[0];

  return (
    <div className="mx-auto flex h-full max-w-6xl gap-4 p-6">
      <aside className="flex w-80 shrink-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <Note className="text-brand" />
          <h1 className="text-lg font-semibold">Notlar</h1>
          <Badge tone="muted">{notes.length}</Badge>
          {pinnedCount > 0 && <Badge tone="muted">📌{pinnedCount}</Badge>}
        </div>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Başlık, içerik veya etikette ara…" className="pl-8" />
        </div>
        <div className="flex items-center gap-2">
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-8 flex-1 rounded-xl border border-white/10 bg-bg-elevated/60 px-2 text-xs">
            <option value="updated">Son düzenlenme</option>
            <option value="created">Oluşturulma</option>
            <option value="title">Başlık A-Z</option>
          </select>
          <select value={colorFilter} onChange={(e) => setColorFilter(e.target.value as NoteColor | 'all')} className="h-8 w-28 rounded-xl border border-white/10 bg-bg-elevated/60 px-2 text-xs">
            <option value="all">Tüm renkler</option>
            <option value="default">Varsayılan</option>
            <option value="purple">Mor</option>
            <option value="blue">Mavi</option>
            <option value="emerald">Yeşil</option>
            <option value="amber">Sarı</option>
            <option value="rose">Pembe</option>
          </select>
        </div>
        <Button variant="brand" size="sm" onClick={async () => { await add('Yeni not', ''); }}>+ Yeni Not</Button>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="glass flex-1 overflow-y-auto rounded-2xl">
          {filtered.length === 0 ? (
            <EmptyState
              variant="notes"
              title={query || colorFilter !== 'all' ? 'Eşleşen not yok' : 'Henüz not yok'}
              description={query || colorFilter !== 'all' ? 'Arama veya renk filtresini değiştir.' : 'Yeni bir not oluşturduğunda burada görünecek.'}
            />
          ) : (
            <ul className="divide-y divide-white/5">
              {filtered.some((n) => n.pinned) && (
                <li className="bg-amber-500/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300/60">Sabitlenenler</li>
              )}
              {filtered.map((n) => {
                const isSelected = selected?.id === n.id;
                const isPinned = !!n.pinned;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => select(n.id)}
                      className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5 ${isSelected ? 'bg-brand/10' : ''} ${COLORS[(n.color ?? 'default') as NoteColor]} ${isSelected ? 'border-l-2 border-brand' : 'border-l-2 border-transparent'}`}
                    >
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT[(n.color ?? 'default') as NoteColor]}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1">
                          {isPinned && <PinIcon className="h-3 w-3 shrink-0 text-amber-300" />}
                          <span className="truncate font-medium">{highlight(n.title || 'Başlıksız', query) as React.ReactNode}</span>
                        </span>
                        <span className="line-clamp-2 text-xs text-fg-muted">
                          {n.body ? (highlight(n.body.slice(0, 80), query) as React.ReactNode) : 'Boş'}
                        </span>
                        {(n.tags?.length ?? 0) > 0 && (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {n.tags!.slice(0, 3).map((t) => (
                              <span key={t} className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-fg-muted">#{t}</span>
                            ))}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section className="glass flex min-w-0 flex-1 flex-col rounded-2xl">
        {selected ? (
          <Editor key={selected.id} note={selected} query={query} onSave={async (patch) => { await update(selected.id, patch); }} onDelete={async () => { if (confirm(`"${selected.title}" silinsin mi?`)) await remove(selected.id); }} onTogglePin={() => void togglePin(selected.id)} />
        ) : (
          <p className="grid h-full place-items-center text-sm text-fg-muted">Bir not seçin veya yeni oluşturun.</p>
        )}
      </section>
    </div>
  );
}

function Editor({
  note,
  query,
  onSave,
  onDelete,
  onTogglePin,
}: {
  note: SecureNote;
  query: string;
  onSave: (patch: Partial<Pick<SecureNote, 'title' | 'body' | 'color' | 'tags'>>) => Promise<void>;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [color, setColor] = useState<NoteColor>((note.color as NoteColor) ?? 'default');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(note.tags ?? []);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const dirty = title !== note.title || body !== note.body || color !== (note.color ?? 'default') || JSON.stringify(tags) !== JSON.stringify(note.tags ?? []);

  useEffect(() => {
    setTitle(note.title); setBody(note.body); setColor((note.color as NoteColor) ?? 'default'); setTags(note.tags ?? []);
  }, [note.id, note.title, note.body, note.color, note.tags]);

  const handleToggleTask = (lineIdx: number, checked: boolean) => {
    const lines = body.split('\n');
    const line = lines[lineIdx];
    if (!line) return;
    const next = line.replace(/- \[( |x|X)\]/, `- [${checked ? 'x' : ' '}]`);
    lines[lineIdx] = next;
    const nextBody = lines.join('\n');
    setBody(nextBody);
    void onSave({ body: nextBody });
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t].slice(0, 10);
    setTags(next); setTagInput('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-5 py-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık" className="flex-1 text-base" />
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onTogglePin} title={note.pinned ? 'Sabitlemeyi kaldır' : 'Sola sabitle'} className={`grid h-8 w-8 place-items-center rounded-lg border ${note.pinned ? 'border-amber-400/40 bg-amber-500/20 text-amber-300' : 'border-white/10 bg-white/5 text-fg-muted hover:text-fg'}`}><PinIcon className="h-4 w-4" /></button>
          <select value={color} onChange={(e) => setColor(e.target.value as NoteColor)} className="h-8 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-xs">
            <option value="default">⚪ Varsayılan</option>
            <option value="purple">🟣 Mor</option>
            <option value="blue">🔵 Mavi</option>
            <option value="emerald">🟢 Yeşil</option>
            <option value="amber">🟡 Sarı</option>
            <option value="rose">🔴 Pembe</option>
          </select>
          <Button variant="danger" size="sm" onClick={onDelete}>Sil</Button>
          <Button variant="brand" size="sm" disabled={!dirty} onClick={() => void onSave({ title: title.trim() || 'Başlıksız', body, color, tags })}>Kaydet</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-white/5 px-5 py-2">
        <div className="flex rounded-lg border border-white/10 p-0.5">
          <button type="button" onClick={() => setTab('write')} className={`rounded-md px-3 py-1 text-xs font-medium ${tab === 'write' ? 'bg-white/10 text-fg' : 'text-fg-muted hover:text-fg'}`}>Yaz</button>
          <button type="button" onClick={() => setTab('preview')} className={`rounded-md px-3 py-1 text-xs font-medium ${tab === 'preview' ? 'bg-white/10 text-fg' : 'text-fg-muted hover:text-fg'}`}>Önizle</button>
        </div>
        <span className="text-[11px] text-fg-subtle">Markdown · - [ ] checklist · # başlık · **kalın**</span>
        <span className="ml-auto text-[11px] text-fg-subtle">{body.length} karakter</span>
      </div>

      <div className="flex min-h-0 flex-1">
        {tab === 'write' ? (
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={"Notunuz…\n\n# Başlık\n- [ ] görev\n- [x] tamam\n**kalın** ve `kod`"} className="flex-1 resize-none bg-transparent p-5 font-mono text-sm leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none" />
        ) : (
          <div className="flex-1 overflow-auto p-5">
            {body.trim() ? <MarkdownView md={body} query={query} onToggleTask={handleToggleTask} /> : <p className="text-sm italic text-fg-subtle">Önizlenecek içerik yok.</p>}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 px-5 py-3">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-1 text-xs text-brand">
              #{t}
              <button type="button" onClick={() => { const next = tags.filter((x) => x !== t); setTags(next); }} className="ml-0.5 text-brand/60 hover:text-brand">×</button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="etiket ekle" className="h-7 w-28 text-xs" />
          <Button size="sm" variant="ghost" onClick={addTag}>Ekle</Button>
        </div>
        <span className="ml-auto text-[11px] text-fg-subtle">Son güncelleme: {new Date(note.updatedAt).toLocaleString('tr-TR')}</span>
      </div>
    </div>
  );
}
