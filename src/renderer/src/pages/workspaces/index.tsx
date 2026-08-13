import { useState } from 'react';
import { useWorkspaces } from '@renderer/store/workspaces';
import type { TabGroupColor } from '@shared/types/tabs';

const COLORS: TabGroupColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'gray',
];

export default function WorkspacesPage() {
  const workspaces = useWorkspaces((s) => s.workspaces);
  const activeId = useWorkspaces((s) => s.activeId);
  const create = useWorkspaces((s) => s.create);
  const rename = useWorkspaces((s) => s.rename);
  const remove = useWorkspaces((s) => s.remove);
  const setActive = useWorkspaces((s) => s.setActive);
  const [name, setName] = useState('');
  const [color, setColor] = useState<TabGroupColor>('blue');

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-fg">Workspaces</h1>
      <p className="mt-1 text-sm text-fg-muted">
        İş / kişisel / proje bağlamlarını ayırın. Aktif workspace’teki sekmeler sekme çubuğunda
        süzülür; “Tümü” tüm sekmeleri gösterir.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-bg-elevated/60 p-4">
        <label className="flex flex-1 flex-col gap-1 text-xs text-fg-muted">
          Ad
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-fg"
            placeholder="Örn. İş"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fg-muted">
          Renk
          <select
            value={color}
            onChange={(e) => setColor(e.target.value as TabGroupColor)}
            className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-sm text-fg"
          >
            {COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="rounded-lg bg-brand/20 px-3 py-2 text-sm text-brand hover:bg-brand/30"
          onClick={() => {
            if (!name.trim()) return;
            create(name, color);
            setName('');
          }}
        >
          Oluştur
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        <li>
          <button
            type="button"
            onClick={() => setActive(null)}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${
              !activeId
                ? 'border-brand/40 bg-brand/10 text-fg'
                : 'border-white/10 bg-bg-elevated/40 text-fg-muted hover:text-fg'
            }`}
          >
            Tümü (filtre yok)
          </button>
        </li>
        {workspaces.map((w) => (
          <li
            key={w.id}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${
              activeId === w.id
                ? 'border-brand/40 bg-brand/10'
                : 'border-white/10 bg-bg-elevated/40'
            }`}
          >
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left text-sm text-fg"
              onClick={() => setActive(w.id)}
            >
              {w.name}
            </button>
            <input
              defaultValue={w.name}
              className="w-28 rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-fg"
              onBlur={(e) => rename(w.id, e.target.value)}
            />
            <button
              type="button"
              className="text-xs text-fg-muted hover:text-red-400"
              onClick={() => remove(w.id)}
            >
              Sil
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
