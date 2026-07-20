import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Dialog, Input, Switch } from '@renderer/components/ui';
import { Key, Lock as LockIcon } from '@renderer/components/ui/icons';
import { usePasswords } from '@renderer/store/passwords';
import type { PasswordEntry } from '@shared/types/passwords';

// Şifre Yöneticisi — Aşama 6.
//
// Kilitliyken unlock kartı; açıkça entry listesi (arama + göster/kopyala) ve
// ekle/düzenle Dialog'u. Tüm CRUD main kasa üzerinden; hatalı parola unlock
// ekranında hata mesajı olarak gösterilir.

export default function PasswordsPage() {
  const status = usePasswords((s) => s.status);
  const loaded = usePasswords((s) => s.loaded);
  const load = usePasswords((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded || !status) {
    return (
      <div className="grid h-full place-items-center text-sm text-fg-muted">
        Kasa durumu yükleniyor…
      </div>
    );
  }

  return status.unlocked ? <VaultOpen /> : <VaultLocked initialized={status.initialized} />;
}

function VaultLocked({ initialized }: { initialized: boolean }) {
  const unlock = usePasswords((s) => s.unlock);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const ok = await unlock(password);
    setBusy(false);
    if (!ok) setError(initialized ? 'Hatalı parola.' : 'Kasa açılamadı.');
  };

  return (
    <div className="mx-auto grid h-full max-w-md place-items-center p-6">
      <div className="glass-strong w-full rounded-3xl p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand">
          <LockIcon />
        </div>
        <h1 className="text-lg font-semibold">
          {initialized ? 'Kasayı Aç' : 'Şifre Kasası Kur'}
        </h1>
        <p className="mt-1 text-xs text-fg-muted">
          {initialized
            ? 'Kasanızı açmak için master parolanızı girin.'
            : 'İlk kurulum — tüm şifrelerinizi koruyacak master parolayı belirleyin.'}
        </p>
        <div className="mt-5 text-left">
          <label className="mb-1 block text-xs text-fg-muted">Master parola</label>
          <Input
            type="password"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
            placeholder="••••••••"
          />
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
        <Button
          variant="brand"
          className="mt-5 w-full"
          disabled={busy || password.length === 0}
          onClick={() => void submit()}
        >
          {busy ? 'Açılıyor…' : initialized ? 'Kilidi Aç' : 'Kur ve Aç'}
        </Button>
        <p className="mt-4 text-[11px] text-fg-subtle">
          Parola cihazda kalır; AES-256-GCM ile şifrelenir, sunucuya gönderilmez.
        </p>
      </div>
    </div>
  );
}

function VaultOpen() {
  const entries = usePasswords((s) => s.entries);
  const add = usePasswords((s) => s.add);
  const update = usePasswords((s) => s.update);
  const remove = usePasswords((s) => s.remove);
  const lock = usePasswords((s) => s.lock);

  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<{ open: boolean; entry?: PasswordEntry }>({ open: false });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        (e.url ?? '').toLowerCase().includes(q),
    );
  }, [entries, query]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="text-brand" />
          <div>
            <h1 className="text-xl font-semibold">Şifre Yöneticisi</h1>
            <p className="text-xs text-fg-muted">{entries.length} kayıt · AES-256 kasa açık</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="brand" size="sm" onClick={() => setEditor({ open: true })}>
            + Yeni
          </Button>
          <Button variant="outline" size="sm" onClick={() => void lock()}>
            Kilitle
          </Button>
        </div>
      </header>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ara: başlık, kullanıcı, site…"
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-fg-muted">
          {entries.length === 0
            ? 'Henüz kayıt yok. İlk şifrenizi ekleyin.'
            : 'Aramayla eşleşen kayıt yok.'}
        </div>
      ) : (
        <div className="glass divide-y divide-white/5 rounded-2xl">
          {filtered.map((e) => (
            <EntryRow
              key={e.id}
              entry={e}
              onEdit={() => setEditor({ open: true, entry: e })}
              onRemove={async () => {
                if (confirm(`"${e.title}" silinsin mi?`)) await remove(e.id);
              }}
            />
          ))}
        </div>
      )}

      <EntryEditor
        open={editor.open}
        entry={editor.entry}
        onClose={() => setEditor({ open: false })}
        onSave={async (data) => {
          if (editor.entry) await update(editor.entry.id, data);
          else await add(data);
          setEditor({ open: false });
        }}
      />
    </div>
  );
}

function EntryRow({
  entry,
  onEdit,
  onRemove,
}: {
  entry: PasswordEntry;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard kullanılamıyor */
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{entry.title}</span>
          {entry.url && <Badge tone="muted">{hostOf(entry.url)}</Badge>}
        </div>
        <div className="mt-0.5 truncate text-xs text-fg-muted">{entry.username || '—'}</div>
        <div className="mt-1 font-mono text-xs text-fg-subtle">
          {show ? entry.password : '•'.repeat(Math.min(12, entry.password.length))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Switch
          checked={show}
          ariaLabel="Şifreyi göster"
          onCheckedChange={(v) => setShow(v)}
        />
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Düzenle
        </Button>
        <Button variant="danger" size="sm" onClick={onRemove}>
          Sil
        </Button>
      </div>
    </div>
  );
}

function EntryEditor({
  open,
  entry,
  onClose,
  onSave,
}: {
  open: boolean;
  entry?: PasswordEntry;
  onClose: () => void;
  onSave: (data: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(entry?.title ?? '');
      setUsername(entry?.username ?? '');
      setPassword(entry?.password ?? '');
      setUrl(entry?.url ?? '');
      setNotes(entry?.notes ?? '');
    }
  }, [open, entry]);

  const valid = title.trim().length > 0 && password.length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={entry ? 'Kaydı Düzenle' : 'Yeni Şifre'}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            İptal
          </Button>
          <Button
            variant="brand"
            size="sm"
            disabled={!valid}
            onClick={() =>
              onSave({ title: title.trim(), username: username.trim(), password, url: url.trim() || undefined, notes: notes.trim() || undefined })
            }
          >
            Kaydet
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Başlık">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: GitHub" autoFocus />
        </Field>
        <Field label="Kullanıcı adı">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Parola">
          <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Site (opsiyonel)">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Not (opsiyonel)">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}