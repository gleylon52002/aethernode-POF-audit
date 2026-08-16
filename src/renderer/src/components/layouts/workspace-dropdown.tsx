import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspaces } from '@renderer/store/workspaces';
import { useTabs } from '@renderer/store/tabs';
import { WorkspaceIcon } from '@renderer/components/workspaces/workspace-icon';
import { ChevronDown, Plus, Globe, Layers } from 'lucide-react';
import type { TabGroupColor } from '@shared/types/tabs';

const COLOR_DOTS: Record<TabGroupColor, string> = {
  red: 'bg-rose-500',
  orange: 'bg-orange-500',
  yellow: 'bg-amber-400',
  green: 'bg-emerald-500',
  blue: 'bg-sky-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  gray: 'bg-slate-400',
};

export function WorkspaceDropdown() {
  const workspaces = useWorkspaces((s) => s.workspaces);
  const activeId = useWorkspaces((s) => s.activeId);
  const setActive = useWorkspaces((s) => s.setActive);
  const tabs = useTabs((s) => s.tabs);
  const open = useTabs((s) => s.open);

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentWorkspace = workspaces.find((w) => w.id === activeId);

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleScrollOrResize = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      window.addEventListener('mousedown', handleOutside);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
    }
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  return (
    <div className="relative no-drag shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className={`flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-all ${
          activeId
            ? 'bg-brand/20 text-fg border border-brand/40 shadow-sm shadow-brand/10 hover:bg-brand/30'
            : 'bg-white/5 text-fg-muted hover:bg-white/10 hover:text-fg border border-white/5'
        }`}
        title="Çalışma Alanını Değiştir (Workspaces)"
      >
        {currentWorkspace ? (
          <WorkspaceIcon name={currentWorkspace.icon} className="h-3.5 w-3.5 text-brand" size={14} />
        ) : (
          <Layers className="h-3.5 w-3.5 text-fg-muted" size={14} />
        )}
        <span className="truncate max-w-[100px] text-[11.5px]">
          {currentWorkspace ? currentWorkspace.name : 'Tüm Alanlar'}
        </span>
        <ChevronDown className={`h-3 w-3 text-fg-subtle transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
            }}
            className="w-56 rounded-xl border border-white/10 bg-[#16161f]/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-pop-in no-drag"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
              Çalışma Alanları
            </div>

            <button
              type="button"
              onClick={() => {
                setActive(null);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                !activeId
                  ? 'bg-brand/25 text-fg font-medium'
                  : 'text-fg-muted hover:bg-white/5 hover:text-fg'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-fg-subtle" />
                <span>Tüm Sekmeler</span>
              </div>
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-fg-subtle">
                {tabs.length}
              </span>
            </button>

            <div className="my-1 h-[1px] bg-white/5" />

            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {workspaces.map((w) => {
                const count = tabs.filter((t) => t.workspaceId === w.id).length;
                const isActive = activeId === w.id;
                const dot = COLOR_DOTS[w.color] || COLOR_DOTS.blue;

                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setActive(w.id);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      isActive
                        ? 'bg-brand/25 text-fg font-medium'
                        : 'text-fg-muted hover:bg-white/5 hover:text-fg'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <WorkspaceIcon name={w.icon} className={`h-3.5 w-3.5 ${isActive ? 'text-brand' : 'text-fg-subtle'}`} size={14} />
                      <span className="truncate">{w.name}</span>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                    </div>
                    {count > 0 && (
                      <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-fg-subtle">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="my-1 h-[1px] bg-white/5" />

            <button
              type="button"
              onClick={() => {
                open('aethernode://workspaces');
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-brand hover:bg-brand/10 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Alanları Yönet</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
