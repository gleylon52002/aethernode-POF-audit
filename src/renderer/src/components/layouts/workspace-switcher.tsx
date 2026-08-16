import { useWorkspaces } from '@renderer/store/workspaces';
import { useTabs } from '@renderer/store/tabs';
import type { TabGroupColor } from '@shared/types/tabs';

const COLOR_DOTS: Record<TabGroupColor, string> = {
  red: 'bg-rose-500 shadow-rose-500/50',
  orange: 'bg-orange-500 shadow-orange-500/50',
  yellow: 'bg-amber-400 shadow-amber-400/50',
  green: 'bg-emerald-500 shadow-emerald-500/50',
  blue: 'bg-sky-500 shadow-sky-500/50',
  purple: 'bg-purple-500 shadow-purple-500/50',
  pink: 'bg-pink-500 shadow-pink-500/50',
  gray: 'bg-slate-400 shadow-slate-400/50',
};

/** Workspace 2.0 hızlı seçici — adres çubuğu altında. */
export function WorkspaceSwitcher() {
  const workspaces = useWorkspaces((s) => s.workspaces);
  const activeId = useWorkspaces((s) => s.activeId);
  const setActive = useWorkspaces((s) => s.setActive);
  const tabs = useTabs((s) => s.tabs);
  const open = useTabs((s) => s.open);

  return (
    <div className="flex h-8 items-center gap-1.5 overflow-x-auto border-b border-white/5 bg-bg-surface/60 px-3 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setActive(null)}
        className={`flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
          !activeId
            ? 'bg-brand/25 text-brand border border-brand/40 shadow-sm shadow-brand/20'
            : 'text-fg-muted hover:bg-white/5 hover:text-fg'
        }`}
      >
        <span>🌐</span>
        <span>Tümü</span>
        <span className="ml-0.5 rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-fg-subtle">
          {tabs.length}
        </span>
      </button>

      {workspaces.map((w) => {
        const count = tabs.filter((t) => t.workspaceId === w.id).length;
        const isActive = activeId === w.id;
        const dotColor = COLOR_DOTS[w.color] || COLOR_DOTS.blue;

        return (
          <button
            key={w.id}
            type="button"
            onClick={() => setActive(w.id)}
            className={`group relative flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              isActive
                ? 'bg-brand/25 text-fg border border-brand/40 shadow-sm shadow-brand/20'
                : 'text-fg-muted hover:bg-white/5 hover:text-fg'
            }`}
          >
            <span className="text-[13px]">{w.icon || '💼'}</span>
            <span className="truncate max-w-[120px]">{w.name}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${dotColor} shadow-sm`} />
            {count > 0 && (
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-fg-subtle">
                {count}
              </span>
            )}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => open('aethernode://workspaces')}
        className="flex h-6 w-6 items-center justify-center shrink-0 rounded-lg text-xs text-fg-subtle hover:bg-white/10 hover:text-fg transition-all"
        title="Çalışma Alanlarını Yönet (Workspaces 2.0)"
      >
        +
      </button>
    </div>
  );
}
