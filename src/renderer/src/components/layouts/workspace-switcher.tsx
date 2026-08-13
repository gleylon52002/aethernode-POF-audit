import { useWorkspaces } from '@renderer/store/workspaces';
import { useTabs } from '@renderer/store/tabs';

/** Workspace hızlı seçici — adres çubuğu altında. */
export function WorkspaceSwitcher() {
  const workspaces = useWorkspaces((s) => s.workspaces);
  const activeId = useWorkspaces((s) => s.activeId);
  const setActive = useWorkspaces((s) => s.setActive);
  const open = useTabs((s) => s.open);

  if (workspaces.length === 0) return null;

  return (
    <div className="flex h-8 items-center gap-1 overflow-x-auto border-b border-white/5 bg-bg-surface/40 px-2">
      <button
        type="button"
        onClick={() => setActive(null)}
        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] ${
          !activeId ? 'bg-brand/20 text-brand' : 'text-fg-muted hover:bg-white/5 hover:text-fg'
        }`}
      >
        Tümü
      </button>
      {workspaces.map((w) => (
        <button
          key={w.id}
          type="button"
          onClick={() => setActive(w.id)}
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] ${
            activeId === w.id
              ? 'bg-brand/20 text-brand'
              : 'text-fg-muted hover:bg-white/5 hover:text-fg'
          }`}
        >
          {w.name}
        </button>
      ))}
      <button
        type="button"
        onClick={() => open('aethernode://workspaces')}
        className="shrink-0 rounded-md px-2 py-0.5 text-[11px] text-fg-subtle hover:bg-white/5 hover:text-fg"
        title="Workspaces yönet"
      >
        +
      </button>
    </div>
  );
}
