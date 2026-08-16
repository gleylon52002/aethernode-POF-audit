import { useState } from 'react';
import { useWorkspaces } from '@renderer/store/workspaces';
import { useTabs } from '@renderer/store/tabs';
import type { TabGroupColor } from '@shared/types/tabs';
import { WorkspaceIcon, WORKSPACE_ICONS } from '@renderer/components/workspaces/workspace-icon';
import { Layers, Globe, Plus, Edit2, Check, Trash2, ArrowRightLeft } from 'lucide-react';

const COLORS: { key: TabGroupColor; label: string; bg: string; border: string; glow: string }[] = [
  { key: 'purple', label: 'Mor', bg: 'bg-purple-500', border: 'border-purple-500/40', glow: 'shadow-purple-500/30' },
  { key: 'blue', label: 'Mavi', bg: 'bg-sky-500', border: 'border-sky-500/40', glow: 'shadow-sky-500/30' },
  { key: 'green', label: 'Zümrüt', bg: 'bg-emerald-500', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/30' },
  { key: 'orange', label: 'Turuncu', bg: 'bg-orange-500', border: 'border-orange-500/40', glow: 'shadow-orange-500/30' },
  { key: 'red', label: 'Gül Kırmızı', bg: 'bg-rose-500', border: 'border-rose-500/40', glow: 'shadow-rose-500/30' },
  { key: 'yellow', label: 'Kehribar', bg: 'bg-amber-400', border: 'border-amber-400/40', glow: 'shadow-amber-400/30' },
  { key: 'pink', label: 'Pembe', bg: 'bg-pink-500', border: 'border-pink-500/40', glow: 'shadow-pink-500/30' },
  { key: 'gray', label: 'Gri', bg: 'bg-slate-400', border: 'border-slate-400/40', glow: 'shadow-slate-400/30' },
];

export default function WorkspacesPage() {
  const workspaces = useWorkspaces((s) => s.workspaces);
  const activeId = useWorkspaces((s) => s.activeId);
  const create = useWorkspaces((s) => s.create);
  const update = useWorkspaces((s) => s.update);
  const remove = useWorkspaces((s) => s.remove);
  const setActive = useWorkspaces((s) => s.setActive);
  const tabs = useTabs((s) => s.tabs);
  const updateTab = useTabs((s) => s.update);

  const [name, setName] = useState('');
  const [color, setColor] = useState<TabGroupColor>('purple');
  const [icon, setIcon] = useState('briefcase');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    create(name.trim(), color, icon);
    setName('');
  };

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-brand" />
            <span>Çalışma Alanları (Workspaces 2.0)</span>
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            İş, Kripto, Gizli ve Kişisel sekmelerinizi izole edin. Her çalışma alanının kendi sekme seti bulunur.
          </p>
        </div>
      </div>

      {/* Yeni Çalışma Alanı Oluşturma Kartı */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-bg-surface/60 p-5 backdrop-blur-xl shadow-xl">
        <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand" />
          <span>Yeni Çalışma Alanı Ekle</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* İkon Seçici */}
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-fg-muted mb-1.5">Vektör İkon</label>
            <div className="flex flex-wrap gap-1 bg-black/20 p-1.5 rounded-xl border border-white/10 max-h-24 overflow-y-auto">
              {WORKSPACE_ICONS.map((ic) => {
                const isSel = icon === ic.key;
                return (
                  <button
                    key={ic.key}
                    type="button"
                    onClick={() => setIcon(ic.key)}
                    title={ic.label}
                    className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                      isSel ? 'bg-brand/30 text-brand border border-brand/50 scale-110 shadow-sm' : 'text-fg-muted hover:bg-white/10 hover:text-fg'
                    }`}
                  >
                    <WorkspaceIcon name={ic.key} size={14} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ad */}
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-fg-muted mb-1.5">Çalışma Alanı Adı</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-brand/50 focus:outline-none"
              placeholder="Örn. Kripto & Borsa"
            />
          </div>

          {/* Renk Paleti */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-fg-muted mb-1.5">Vurgu Rengi</label>
            <div className="flex flex-wrap items-center gap-1.5 bg-black/20 p-2 rounded-xl border border-white/10">
              {COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.key)}
                  className={`h-4 w-4 rounded-full ${c.bg} transition-all ${
                    color === c.key ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Oluştur Butonu */}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim()}
              className="w-full rounded-xl bg-brand/25 border border-brand/40 px-4 py-2.5 text-sm font-medium text-fg hover:bg-brand/35 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand/10"
            >
              + Oluştur
            </button>
          </div>
        </div>
      </div>

      {/* Çalışma Alanları Listesi / Grid */}
      <div className="mt-8 space-y-3">
        {/* Tümü (Filtre Yok) */}
        <div
          onClick={() => setActive(null)}
          className={`flex items-center justify-between rounded-2xl border p-4 cursor-pointer transition-all ${
            !activeId
              ? 'border-brand/40 bg-brand/15 shadow-lg shadow-brand/10'
              : 'border-white/10 bg-bg-surface/40 hover:bg-bg-surface/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-brand">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg">Tüm Sekmeler (Filtre Yok)</h3>
              <p className="text-xs text-fg-muted">Tüm çalışma alanlarındaki sekmeler tek havuzda görüntülenir</p>
            </div>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-fg-muted">
            {tabs.length} Sekme
          </span>
        </div>

        {/* Alan Kartları */}
        {workspaces.map((w) => {
          const wsTabs = tabs.filter((t) => t.workspaceId === w.id);
          const isAct = activeId === w.id;
          const col = COLORS.find((c) => c.key === w.color) || COLORS[0]!;

          return (
            <div
              key={w.id}
              className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                isAct
                  ? 'border-brand/40 bg-brand/15 shadow-lg shadow-brand/10'
                  : 'border-white/10 bg-bg-surface/40 hover:bg-bg-surface/70'
              }`}
            >
              <div
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                onClick={() => setActive(w.id)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand">
                  <WorkspaceIcon name={w.icon} className="h-5 w-5" size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  {editingId === w.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          update(w.id, { name: editName.trim() || w.name });
                          setEditingId(null);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      autoFocus
                      className="rounded-lg border border-brand/50 bg-black/40 px-2 py-1 text-sm text-fg"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-fg truncate">{w.name}</h3>
                      <span className={`h-2 w-2 rounded-full ${col.bg} ${col.glow} shadow-sm`} />
                    </div>
                  )}
                  <p className="text-xs text-fg-muted">
                    {wsTabs.length} aktif sekme · {isAct ? 'Şu an aktif alan' : 'Geçmek için tıklayın'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                {/* Tüm açık sekmeleri bu alana taşı */}
                <button
                  type="button"
                  onClick={() => {
                    tabs.forEach((t) => updateTab(t.id, { workspaceId: w.id }));
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-fg-muted hover:bg-white/10 hover:text-fg transition-all"
                  title="Açık tüm sekmeleri bu alana taşı"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  <span>Tümünü Taşı</span>
                </button>

                {/* Düzenle */}
                <button
                  type="button"
                  onClick={() => {
                    if (editingId === w.id) {
                      update(w.id, { name: editName.trim() || w.name });
                      setEditingId(null);
                    } else {
                      setEditingId(w.id);
                      setEditName(w.name);
                    }
                  }}
                  className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs text-fg-muted hover:bg-white/10 hover:text-fg transition-all"
                >
                  {editingId === w.id ? <Check className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                  <span>{editingId === w.id ? 'Kaydet' : 'Düzenle'}</span>
                </button>

                {/* Sil */}
                <button
                  type="button"
                  onClick={() => remove(w.id)}
                  className="flex items-center gap-1 rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/20 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Sil</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
