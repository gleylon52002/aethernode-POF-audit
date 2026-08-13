import { useMemo, useState } from 'react';
import { useBookmarks, type BookmarkNode } from '@renderer/store/bookmarks';
import { usePasswords } from '@renderer/store/passwords';
import { showToast } from '@renderer/components/layouts/toast-bus';

function parseNetscapeHtml(html: string): BookmarkNode[] {
  const nodes: BookmarkNode[] = [];
  const re = /<A\s+[^>]*HREF\s*=\s*"([^"]+)"[^>]*>([^<]*)<\/A>/gi;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(html))) {
    const url = m[1]?.trim();
    const title = (m[2] || url || 'Yer imi').trim();
    if (!url || !/^https?:\/\//i.test(url)) continue;
    nodes.push({
      id: `imp-${Date.now().toString(36)}-${i++}`,
      title,
      url,
    });
  }
  return nodes;
}

function parseChromeCsv(text: string): Array<{
  title: string;
  url?: string;
  username: string;
  password: string;
}> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0]!.toLowerCase();
  const cols = header.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  const idx = (name: string) => cols.findIndex((c) => c === name);
  const iName = idx('name');
  const iUrl = idx('url');
  const iUser = idx('username');
  const iPass = idx('password');
  if (iUser < 0 || iPass < 0) return [];

  const out: Array<{ title: string; url?: string; username: string; password: string }> = [];
  for (let li = 1; li < lines.length; li++) {
    const cells: string[] = [];
    let cur = '';
    let q = false;
    for (const ch of lines[li]!) {
      if (ch === '"') {
        q = !q;
        continue;
      }
      if (ch === ',' && !q) {
        cells.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    cells.push(cur);
    const username = cells[iUser]?.trim() ?? '';
    const password = cells[iPass]?.trim() ?? '';
    if (!username && !password) continue;
    out.push({
      title: (iName >= 0 ? cells[iName] : username) || username || 'Hesap',
      url: iUrl >= 0 ? cells[iUrl]?.trim() : undefined,
      username,
      password,
    });
  }
  return out;
}

function exportNetscape(nodes: BookmarkNode[]): string {
  const links = nodes
    .filter((n) => n.url)
    .map((n) => `    <DT><A HREF="${n.url}">${n.title.replace(/</g, '')}</A>`)
    .join('\n');
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${links}
</DL><p>
`;
}

export default function ImportPage() {
  const [tab, setTab] = useState<'bookmarks' | 'passwords'>('bookmarks');
  const nodes = useBookmarks((s) => s.nodes);
  const importJson = useBookmarks((s) => s.importJson);
  const exportJson = useBookmarks((s) => s.exportJson);
  const passwords = usePasswords();

  const onBookmarksFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseNetscapeHtml(text);
    if (parsed.length === 0) {
      showToast('Yer imi bulunamadı (Netscape HTML bekleniyor)', 'error');
      return;
    }
    const existing = exportJson();
    const urls = new Set(existing.map((n) => n.url).filter(Boolean));
    const merged = [...existing, ...parsed.filter((p) => p.url && !urls.has(p.url))];
    importJson(merged);
    showToast(`${parsed.length} yer imi içe aktarıldı`, 'success');
  };

  const onPasswordsFile = async (file: File) => {
    await passwords.load();
    if (!passwords.status?.unlocked) {
      showToast('Önce Şifreler sayfasından kasayı açın', 'error');
      return;
    }
    const text = await file.text();
    const rows = parseChromeCsv(text);
    if (rows.length === 0) {
      showToast('CSV satırı bulunamadı (Chrome formatı: name,url,username,password)', 'error');
      return;
    }
    let ok = 0;
    for (const r of rows) {
      if (await passwords.add(r)) ok++;
    }
    showToast(`${ok}/${rows.length} şifre eklendi`, ok ? 'success' : 'error');
  };

  const bookmarkCount = useMemo(() => nodes.filter((n) => n.url).length, [nodes]);

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-fg">İçe / Dışa Aktar</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Chrome, Brave veya Edge’den yer imi HTML ve şifre CSV dosyalarını aktarın.
      </p>

      <div className="mt-6 flex gap-2">
        {(['bookmarks', 'passwords'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t ? 'bg-brand/20 text-brand' : 'bg-white/5 text-fg-muted hover:text-fg'
            }`}
          >
            {t === 'bookmarks' ? `Yer İmleri (${bookmarkCount})` : 'Şifreler'}
          </button>
        ))}
      </div>

      {tab === 'bookmarks' && (
        <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-bg-elevated/60 p-5">
          <p className="text-sm text-fg-muted">
            Chrome: Yer işaretleri yöneticisi → Dışa aktar → HTML. Dosyayı seçin.
          </p>
          <input
            type="file"
            accept=".html,.htm"
            className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-fg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onBookmarksFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-fg hover:bg-white/15"
            onClick={() => {
              const blob = new Blob([exportNetscape(exportJson())], { type: 'text/html' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'aethernode-bookmarks.html';
              a.click();
            }}
          >
            Yer imlerini HTML olarak dışa aktar
          </button>
        </div>
      )}

      {tab === 'passwords' && (
        <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-bg-elevated/60 p-5">
          <p className="text-sm text-fg-muted">
            Chrome: Ayarlar → Şifreler → Dışa aktar (CSV). Kasa açık olmalıdır.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-fg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPasswordsFile(f);
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
}
