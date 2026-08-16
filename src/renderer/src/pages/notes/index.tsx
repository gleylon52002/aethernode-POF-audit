import { useEffect, useMemo, useState, useRef } from 'react';
import { Badge, Button, Input } from '@renderer/components/ui';
import { Note, Lock as LockIcon, Search as SearchIcon, Pin as PinIcon } from '@renderer/components/ui/icons';
import { useNotes } from '@renderer/store/notes';
import { usePasswords } from '@renderer/store/passwords';
import { useTabs } from '@renderer/store/tabs';
import { EmptyState } from '@renderer/components/ui/empty-state';
import type { SecureNote, NoteColor } from '@shared/types/notes';

// ---------------------------------------------------------------------------
// Dahili Notlar ➔ Çift Yönlü Bağlantılı Araştırma Grafı (Mini Obsidian)
// ---------------------------------------------------------------------------

const COLORS: Record<NoteColor, string> = {
  default: 'bg-white/5 border-white/10',
  purple: 'bg-purple-500/15 border-purple-500/30',
  blue: 'bg-sky-500/15 border-sky-500/30',
  emerald: 'bg-emerald-500/15 border-emerald-500/30',
  amber: 'bg-amber-500/15 border-amber-500/30',
  rose: 'bg-rose-500/15 border-rose-500/30',
};

const DOT: Record<NoteColor, string> = {
  default: 'bg-white/30',
  purple: 'bg-purple-400 shadow-purple-400/50',
  blue: 'bg-sky-400 shadow-sky-400/50',
  emerald: 'bg-emerald-400 shadow-emerald-400/50',
  amber: 'bg-amber-400 shadow-amber-400/50',
  rose: 'bg-rose-400 shadow-rose-400/50',
};

type ViewMode = 'split' | 'write' | 'preview' | 'graph';
type SortKey = 'updated' | 'created' | 'title';

function highlightAndWiki(
  text: string,
  query: string,
  onNavigateWiki: (title: string) => void,
): React.ReactNode {
  // 1. [[WikiLink]] parsing
  const wikiRegex = /\[\[(.*?)\]\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = wikiRegex.exec(text)) !== null) {
    const preText = text.slice(lastIndex, match.index);
    if (preText) parts.push(highlightText(preText, query));
    
    const targetTitle = match[1] ?? '';
    parts.push(
      <button
        key={`wiki-${match.index}`}
        type="button"
        onClick={() => onNavigateWiki(targetTitle)}
        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-semibold text-brand bg-brand/15 hover:bg-brand/25 border border-brand/30 transition-all"
      >
        <span>🔗</span>
        <span>{targetTitle}</span>
      </button>
    );
    lastIndex = match.index + match[0].length;
  }
  
  const remaining = text.slice(lastIndex);
  if (remaining) parts.push(highlightText(remaining, query));

  return parts.length > 0 ? parts : highlightText(text, query);
}

function highlightText(text: string, q: string): React.ReactNode {
  if (!q.trim()) return text;
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${esc})`, 'ig'));
  const lower = q.toLowerCase();
  return parts.map((p, i) =>
    p.toLowerCase() === lower ? (
      <mark key={i} className="rounded bg-amber-400/30 px-0.5 text-amber-100 font-medium">
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
  onNavigateWiki,
}: {
  md: string;
  query: string;
  onToggleTask: (lineIdx: number, checked: boolean) => void;
  onNavigateWiki: (title: string) => void;
}) {
  const lines = md.split('\n');
  const els: React.ReactNode[] = [];
  let inCode = false;
  let codeBuf: string[] = [];

  const flushCode = (key: number) => {
    if (codeBuf.length === 0) return;
    els.push(
      <pre key={`code-${key}`} className="my-2 overflow-auto rounded-xl bg-black/50 border border-white/10 p-3.5 text-xs leading-relaxed font-mono text-emerald-300">
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
        <label key={idx} className="my-1.5 flex items-start gap-2 text-sm cursor-pointer group">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onToggleTask(idx, e.target.checked)}
            className="mt-0.5 accent-brand rounded h-4 w-4"
          />
          <span className={checked ? 'line-through text-fg-subtle' : 'text-fg group-hover:text-fg-bright'}>
            {highlightAndWiki(text, query, onNavigateWiki)}
          </span>
        </label>,
      );
      return;
    }
    if (/^\s*#{1,3}\s+/.test(line)) {
      const level = (line.match(/^#+/)?.[0].length ?? 1) as 1 | 2 | 3;
      const text = line.replace(/^#+\s+/, '');
      if (level === 1) els.push(<h1 key={idx} className="mt-4 mb-2 text-xl font-bold text-fg border-b border-white/10 pb-1">{highlightAndWiki(text, query, onNavigateWiki)}</h1>);
      else if (level === 2) els.push(<h2 key={idx} className="mt-3 mb-1.5 text-lg font-semibold text-fg">{highlightAndWiki(text, query, onNavigateWiki)}</h2>);
      else els.push(<h3 key={idx} className="mt-2.5 mb-1 text-sm font-semibold text-fg-bright">{highlightAndWiki(text, query, onNavigateWiki)}</h3>);
      return;
    }
    if (/^\s*>\s+/.test(line)) {
      els.push(<blockquote key={idx} className="my-2 border-l-2 border-brand/60 bg-brand/5 pl-3 py-1 text-sm italic text-fg-muted rounded-r-lg">{highlightAndWiki(line.replace(/^\s*>\s+/, ''), query, onNavigateWiki)}</blockquote>);
      return;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      els.push(<li key={idx} className="ml-5 list-disc text-sm text-fg my-0.5">{highlightAndWiki(line.replace(/^\s*[-*]\s+/, ''), query, onNavigateWiki)}</li>);
      return;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      els.push(<li key={idx} className="ml-5 list-decimal text-sm text-fg my-0.5">{highlightAndWiki(line.replace(/^\s*\d+\.\s+/, ''), query, onNavigateWiki)}</li>);
      return;
    }
    if (line.trim() === '') {
      els.push(<div key={idx} className="h-2" />);
      return;
    }
    // Inline text
    els.push(<p key={idx} className="my-1.5 text-sm leading-relaxed text-fg-muted">{highlightAndWiki(line, query, onNavigateWiki)}</p>);
  });
  if (inCode) flushCode(lines.length);
  return <div className="prose prose-invert max-w-none">{els}</div>;
}

// ---------------------------------------------------------------------------
// Mini Obsidian Knowledge Graph Canvas
// ---------------------------------------------------------------------------

function KnowledgeGraph({
  notes,
  activeId,
  onSelectNote,
}: {
  notes: SecureNote[];
  activeId: string | null;
  onSelectNote: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    const height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    // Build graph nodes
    const nodeMap = new Map<string, { id: string; title: string; x: number; y: number; vx: number; vy: number; color: string }>();
    notes.forEach((n, idx) => {
      const angle = (idx / Math.max(1, notes.length)) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.35;
      nodeMap.set(n.id, {
        id: n.id,
        title: n.title || 'Başlıksız',
        x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        color: n.color === 'purple' ? '#a855f7' : n.color === 'blue' ? '#38bdf8' : n.color === 'emerald' ? '#34d399' : n.color === 'rose' ? '#fb7185' : '#818cf8',
      });
    });

    // Build edges from [[wikilinks]] and tags
    const edges: { source: string; target: string }[] = [];
    notes.forEach((n) => {
      const wikiMatches = n.body.match(/\[\[(.*?)\]\]/g) || [];
      wikiMatches.forEach((w) => {
        const title = w.replace(/^\[\[|\]\]$/g, '').toLowerCase().trim();
        const target = notes.find((t) => t.title.toLowerCase().trim() === title && t.id !== n.id);
        if (target) {
          edges.push({ source: n.id, target: target.id });
        }
      });

      // Shared tags link
      if (n.tags && n.tags.length > 0) {
        notes.forEach((other) => {
          if (other.id !== n.id && other.tags && other.tags.some((t) => n.tags!.includes(t))) {
            if (!edges.some((e) => (e.source === n.id && e.target === other.id) || (e.source === other.id && e.target === n.id))) {
              edges.push({ source: n.id, target: other.id });
            }
          }
        });
      }
    });

    const nodes = Array.from(nodeMap.values());

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Physics simulation (repulsion + attraction)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j]!.x - nodes[i]!.x;
          const dy = nodes[j]!.y - nodes[i]!.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 180) {
            const force = (180 - dist) / 180 * 0.08;
            nodes[i]!.vx -= (dx / dist) * force;
            nodes[i]!.vy -= (dy / dist) * force;
            nodes[j]!.vx += (dx / dist) * force;
            nodes[j]!.vy += (dy / dist) * force;
          }
        }
      }

      edges.forEach((e) => {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) return;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 100) * 0.003;
        s.vx += (dx / dist) * force;
        s.vy += (dy / dist) * force;
        t.vx -= (dx / dist) * force;
        t.vy -= (dy / dist) * force;
      });

      // Update positions with center gravity
      nodes.forEach((n) => {
        n.vx += (width / 2 - n.x) * 0.002;
        n.vy += (height / 2 - n.y) * 0.002;
        n.vx *= 0.88;
        n.vy *= 0.88;
        n.x += n.vx;
        n.y += n.vy;
      });

      // Draw edges
      edges.forEach((e) => {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) return;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = 'rgba(124, 58, 237, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((n) => {
        const isAct = n.id === activeId;
        ctx.beginPath();
        ctx.arc(n.x, n.y, isAct ? 9 : 6, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        if (isAct) {
          ctx.shadowColor = n.color;
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();

        // Title label
        ctx.shadowBlur = 0;
        ctx.fillStyle = isAct ? '#ffffff' : '#94a3b8';
        ctx.font = isAct ? 'bold 11px Inter, sans-serif' : '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.title.slice(0, 16), n.x, n.y + (isAct ? 18 : 15));
      });

      animId = requestAnimationFrame(render);
    };

    render();

    // Click handler on Canvas
    const handleClick = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = ev.clientX - rect.left;
      const clickY = ev.clientY - rect.top;

      for (const n of nodes) {
        const dx = clickX - n.x;
        const dy = clickY - n.y;
        if (dx * dx + dy * dy < 256) {
          onSelectNote(n.id);
          break;
        }
      }
    };

    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('click', handleClick);
    };
  }, [notes, activeId, onSelectNote]);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-4 bg-black/20 rounded-2xl border border-white/10 overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-md">
        <span className="text-xs text-fg-muted font-medium">🕸️ Bilgi Ağı (Knowledge Graph)</span>
        <Badge tone="brand">{notes.length} Düğüm</Badge>
      </div>
      <canvas ref={canvasRef} className="h-full w-full cursor-pointer" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Notes Page
// ---------------------------------------------------------------------------

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
      <div className="glass-strong w-full rounded-3xl p-8 text-center animate-slide-up shadow-2xl border border-white/10">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand/20 text-brand border border-brand/30"><LockIcon /></div>
        <h1 className="text-xl font-bold">{initialized ? 'Araştırma Kasasını Aç' : 'Şifre Kasası Kur'}</h1>
        <p className="mt-1.5 text-xs text-fg-muted">{initialized ? 'Güvenli notlar ve araştırma grafı donanım şifre kasasıyla korunur.' : 'İlk kurulum — notlar ve şifreler aynı master parola ile şifrelenir.'}</p>
        <div className="mt-5 text-left">
          <label className="mb-1 block text-xs text-fg-muted">Master parola</label>
          <Input type="password" value={password} autoFocus onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} placeholder="••••••••" />
          {(error || lastError) && <p className="mt-2 text-xs text-danger">{error || lastError}</p>}
        </div>
        <Button variant="brand" className="mt-5 w-full" disabled={busy || password.length === 0} onClick={() => void submit()}>{busy ? 'Açılıyor…' : initialized ? 'Kilidi Aç ve Grafı Yükle' : 'Kur ve Aç'}</Button>
        <button type="button" className="mt-3 text-xs text-brand underline" onClick={() => openTab('aethernode://passwords')}>Şifre yöneticisine git →</button>
        <p className="mt-4 text-[11px] text-fg-subtle">AES-256-GCM · Çift yönlü bağlantılı Mini Obsidian araştırma grafı.</p>
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
  const tabs = useTabs((s) => s.tabs);
  const activeTabId = useTabs((s) => s.activeId);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [colorFilter, setColorFilter] = useState<NoteColor | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('split');

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
    const pinned = list.filter((n) => n.pinned);
    const rest = list.filter((n) => !n.pinned);
    return [...pinned, ...rest];
  }, [notes, query, sort, colorFilter]);

  const selected = notes.find((n) => n.id === selectedId) ?? filtered[0];

  // Web Clipper
  const handleClipPage = async () => {
    const act = tabs.find((t) => t.id === activeTabId);
    if (!act || !act.url || act.url.startsWith('aethernode://')) {
      await add('Yeni Not', '# Yeni Araştırma Notu\n\n- [ ] [[Bağlantı Ekle]]');
      return;
    }
    const title = act.title || 'Kırpılan Sayfa';
    const body = `# ${title}\n\nKaynak: [${act.url}](${act.url})\n\n> Kırpılma Zamanı: ${new Date().toLocaleString('tr-TR')}\n\n- [ ] Bu sayfa ile ilgili notları ekleyin\n- [ ] [[Araştırma]] konusuyla bağlayın\n`;
    await add(title, body, {
      sourceUrl: act.url,
      sourceTitle: title,
      tags: ['web-clip'],
    });
  };

  const handleNavigateWiki = (targetTitle: string) => {
    const found = notes.find((n) => n.title.toLowerCase().trim() === targetTitle.toLowerCase().trim());
    if (found) {
      select(found.id);
    } else {
      // Auto-create linked note
      void add(targetTitle, `# ${targetTitle}\n\nBu not çift yönlü bağlantı ile otomatik oluşturuldu.`);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-7xl gap-4 p-6 overflow-hidden">
      {/* Sol Kenar Çubuğu */}
      <aside className="flex w-80 shrink-0 flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Note className="text-brand" />
            <h1 className="text-lg font-bold text-fg">Mini Obsidian</h1>
            <Badge tone="muted">{notes.length}</Badge>
          </div>
          {/* Web Clipper Butonu */}
          <button
            type="button"
            onClick={handleClipPage}
            className="flex items-center gap-1 rounded-lg bg-brand/20 border border-brand/40 px-2 py-1 text-xs font-medium text-brand hover:bg-brand/30 transition-all shadow-sm shadow-brand/10"
            title="Açık olan web sayfasını not olarak kırp"
          >
            <span>✂️</span>
            <span>Sayfayı Kırp</span>
          </button>
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Başlık, etiket veya [[bağlantı]] ara…" className="pl-8 text-xs" />
        </div>

        <div className="flex items-center gap-2">
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-8 flex-1 rounded-xl border border-white/10 bg-bg-elevated/60 px-2 text-xs">
            <option value="updated">Son Düzenlenen</option>
            <option value="created">Oluşturulma</option>
            <option value="title">Başlık A-Z</option>
          </select>
          <select value={colorFilter} onChange={(e) => setColorFilter(e.target.value as NoteColor | 'all')} className="h-8 w-28 rounded-xl border border-white/10 bg-bg-elevated/60 px-2 text-xs">
            <option value="all">Tüm Renkler</option>
            <option value="default">Varsayılan</option>
            <option value="purple">🟣 Mor</option>
            <option value="blue">🔵 Mavi</option>
            <option value="emerald">🟢 Yeşil</option>
            <option value="amber">🟡 Sarı</option>
            <option value="rose">🔴 Pembe</option>
          </select>
        </div>

        <Button variant="brand" size="sm" onClick={async () => { await add('Yeni Not', '# Yeni Not\n\n[[Diğer Not]] ile çift yönlü bağ kurun.'); }}>
          + Yeni Not Ekle
        </Button>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="glass flex-1 overflow-y-auto rounded-2xl border border-white/10 p-1">
          {filtered.length === 0 ? (
            <EmptyState
              variant="notes"
              title={query || colorFilter !== 'all' ? 'Eşleşen not yok' : 'Henüz not yok'}
              description={query || colorFilter !== 'all' ? 'Arama veya renk filtresini değiştir.' : 'Yeni bir not oluşturduğunda burada görünecek.'}
            />
          ) : (
            <ul className="space-y-1">
              {filtered.map((n) => {
                const isSelected = selected?.id === n.id;
                const isPinned = !!n.pinned;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => select(n.id)}
                      className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                        isSelected ? 'bg-brand/20 border border-brand/40 shadow-sm shadow-brand/10' : 'hover:bg-white/5 border border-transparent'
                      } ${COLORS[(n.color ?? 'default') as NoteColor]}`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[(n.color ?? 'default') as NoteColor]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          {isPinned && <PinIcon className="h-3 w-3 shrink-0 text-amber-300" />}
                          <span className="truncate font-medium text-fg">{highlightText(n.title || 'Başlıksız', query) as React.ReactNode}</span>
                        </div>
                        <p className="line-clamp-2 text-xs text-fg-muted mt-0.5">
                          {n.body ? (highlightText(n.body.slice(0, 80), query) as React.ReactNode) : 'Boş not'}
                        </p>
                        {(n.tags?.length ?? 0) > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {n.tags!.slice(0, 3).map((t) => (
                              <span key={t} className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-fg-muted font-medium">#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Sağ Ana İçerik / Editör / Graf */}
      <section className="glass flex min-w-0 flex-1 flex-col rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        {viewMode === 'graph' ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 bg-bg-surface/50">
              <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
                <span>🕸️</span> Araştırma Bağlantı Grafı
              </h2>
              <div className="flex rounded-xl border border-white/10 p-0.5 bg-black/20">
                <button type="button" onClick={() => setViewMode('split')} className="rounded-lg px-3 py-1 text-xs text-fg-muted hover:text-fg font-medium">Editöre Dön</button>
                <button type="button" onClick={() => setViewMode('graph')} className="rounded-lg px-3 py-1 text-xs bg-brand/30 text-fg font-semibold">Graf</button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <KnowledgeGraph notes={notes} activeId={selected?.id || null} onSelectNote={(id) => { select(id); setViewMode('split'); }} />
            </div>
          </div>
        ) : selected ? (
          <Editor
            key={selected.id}
            note={selected}
            allNotes={notes}
            query={query}
            viewMode={viewMode}
            onSetViewMode={setViewMode}
            onNavigateWiki={handleNavigateWiki}
            onSave={async (patch) => { await update(selected.id, patch); }}
            onDelete={async () => { if (confirm(`"${selected.title}" silinsin mi?`)) await remove(selected.id); }}
            onTogglePin={() => void togglePin(selected.id)}
          />
        ) : (
          <p className="grid h-full place-items-center text-sm text-fg-muted">Bir not seçin veya yeni oluşturun.</p>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor & Backlinks Component
// ---------------------------------------------------------------------------

function Editor({
  note,
  allNotes,
  query,
  viewMode,
  onSetViewMode,
  onNavigateWiki,
  onSave,
  onDelete,
  onTogglePin,
}: {
  note: SecureNote;
  allNotes: SecureNote[];
  query: string;
  viewMode: ViewMode;
  onSetViewMode: (m: ViewMode) => void;
  onNavigateWiki: (title: string) => void;
  onSave: (patch: Partial<SecureNote>) => Promise<void>;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [color, setColor] = useState<NoteColor>((note.color as NoteColor) ?? 'default');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(note.tags ?? []);
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
    void onSave({ tags: next });
  };

  // Backlinks detection
  const backlinks = useMemo(() => {
    const t = note.title.toLowerCase().trim();
    if (!t) return [];
    return allNotes.filter((other) => other.id !== note.id && other.body.toLowerCase().includes(`[[${t}]]`));
  }, [allNotes, note.title, note.id]);

  return (
    <div className="flex h-full flex-col bg-bg-surface/30">
      {/* Üst Başlık & Araç Çubuğu */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-3 bg-bg-surface/50">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Not Başlığı" className="flex-1 text-base font-bold" />
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onTogglePin} title={note.pinned ? 'Sabitlemeyi kaldır' : 'Sola sabitle'} className={`grid h-8 w-8 place-items-center rounded-xl border transition-all ${note.pinned ? 'border-amber-400/40 bg-amber-500/20 text-amber-300' : 'border-white/10 bg-white/5 text-fg-muted hover:text-fg'}`}><PinIcon className="h-4 w-4" /></button>
          <select value={color} onChange={(e) => setColor(e.target.value as NoteColor)} className="h-8 rounded-xl border border-white/10 bg-bg-elevated/60 px-2 text-xs">
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

      {/* Mod Seçici (Yaz / Önizle / Yan Yana / Bilgi Grafı) */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-2 bg-black/20 text-xs">
        <div className="flex rounded-xl border border-white/10 p-0.5 bg-black/40">
          <button type="button" onClick={() => onSetViewMode('split')} className={`rounded-lg px-2.5 py-1 font-medium transition-all ${viewMode === 'split' ? 'bg-white/10 text-fg' : 'text-fg-muted hover:text-fg'}`}>🔀 Yan Yana</button>
          <button type="button" onClick={() => onSetViewMode('write')} className={`rounded-lg px-2.5 py-1 font-medium transition-all ${viewMode === 'write' ? 'bg-white/10 text-fg' : 'text-fg-muted hover:text-fg'}`}>📝 Yaz</button>
          <button type="button" onClick={() => onSetViewMode('preview')} className={`rounded-lg px-2.5 py-1 font-medium transition-all ${viewMode === 'preview' ? 'bg-white/10 text-fg' : 'text-fg-muted hover:text-fg'}`}>👁️ Önizle</button>
          <button type="button" onClick={() => onSetViewMode('graph')} className={`rounded-lg px-2.5 py-1 font-medium transition-all ${viewMode === 'graph' ? 'bg-brand/30 text-fg' : 'text-brand hover:text-brand-bright'}`}>🕸️ Graf</button>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-fg-subtle">
          <span>[[Not Adı]] = Bağlantı</span>
          <span>{body.length} karakter</span>
        </div>
      </div>

      {/* Editör & Canlı Önizleme Alanı */}
      <div className="flex min-h-0 flex-1 divide-x divide-white/10">
        {(viewMode === 'split' || viewMode === 'write') && (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"Notunuzu buraya yazın…\n\n# Başlık\n- [ ] Görev\n[[Diğer Not Başlığı]] çift yönlü bağlantı kurar.\n```javascript\nconst a = 1;\n```"}
            className="flex-1 resize-none bg-transparent p-5 font-mono text-sm leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none overflow-y-auto"
          />
        )}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className="flex-1 overflow-y-auto p-5 bg-black/10">
            {body.trim() ? (
              <MarkdownView md={body} query={query} onToggleTask={handleToggleTask} onNavigateWiki={onNavigateWiki} />
            ) : (
              <p className="text-sm italic text-fg-subtle">Canlı önizleme için sol tarafa markdown yazın.</p>
            )}
          </div>
        )}
      </div>

      {/* Alt Geri Bağlantılar (Backlinks) ve Etiket Paneli */}
      <div className="border-t border-white/10 p-4 bg-black/30 space-y-2">
        {/* Backlinks Listesi */}
        {backlinks.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-fg-muted font-semibold flex items-center gap-1">
              <span>⬅️</span> Geri Bağlantılar ({backlinks.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {backlinks.map((bl) => (
                <button
                  key={bl.id}
                  type="button"
                  onClick={() => onNavigateWiki(bl.title)}
                  className="rounded-lg bg-brand/15 border border-brand/30 px-2 py-0.5 text-xs text-brand hover:bg-brand/25 transition-all"
                >
                  [[{bl.title}]]
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Etiketler */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand/15 border border-brand/30 px-2.5 py-0.5 text-xs font-medium text-brand">
                #{t}
                <button type="button" onClick={() => { const next = tags.filter((x) => x !== t); setTags(next); void onSave({ tags: next }); }} className="ml-0.5 text-brand/60 hover:text-brand">×</button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="etiket ekle" className="h-7 w-28 text-xs" />
            <Button size="sm" variant="ghost" onClick={addTag}>Ekle</Button>
          </div>
          <span className="ml-auto text-[11px] text-fg-subtle">Son Düzenleme: {new Date(note.updatedAt).toLocaleString('tr-TR')}</span>
        </div>
      </div>
    </div>
  );
}

