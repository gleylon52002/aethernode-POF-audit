import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTabs } from '@renderer/store/tabs';
import { getWebview } from './webview-registry';
import type { TabGroupColor } from '@shared/types/tabs';

// Sekme gruplama menüsü — sekmeye sağ tık veya Ctrl+Shift+G ile açılır.
// Mevcut gruba ekleme, yeni grup oluşturma (isim + 8 renk) ve gruptan
// çıkarma işlemleri buradan yapılır. Grup verisi yalnızca yerelde tutulur.

export const TAB_GROUP_EVENT = 'aether:tab-group-menu';

export interface TabGroupMenuDetail {
  tabId: string;
  x: number;
  y: number;
}

export function openTabGroupMenu(detail: TabGroupMenuDetail): void {
  window.dispatchEvent(new CustomEvent(TAB_GROUP_EVENT, { detail }));
}

export const GROUP_COLORS: Record<TabGroupColor, { dot: string; line: string; label: string }> = {
  red: { dot: 'bg-red-500', line: '#ef4444', label: 'Kırmızı' },
  orange: { dot: 'bg-orange-500', line: '#f97316', label: 'Turuncu' },
  yellow: { dot: 'bg-yellow-400', line: '#facc15', label: 'Sarı' },
  green: { dot: 'bg-green-500', line: '#22c55e', label: 'Yeşil' },
  blue: { dot: 'bg-blue-500', line: '#3b82f6', label: 'Mavi' },
  purple: { dot: 'bg-purple-500', line: '#a855f7', label: 'Mor' },
  pink: { dot: 'bg-pink-500', line: '#ec4899', label: 'Pembe' },
  gray: { dot: 'bg-gray-400', line: '#9ca3af', label: 'Gri' },
};

const COLOR_KEYS = Object.keys(GROUP_COLORS) as TabGroupColor[];

export function TabGroupMenu() {
  const [state, setState] = useState<TabGroupMenuDetail | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<TabGroupColor>('blue');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const groups = useTabs((s) => s.groups);
  const tabs = useTabs((s) => s.tabs);
  const createGroup = useTabs((s) => s.createGroup);
  const assignToGroup = useTabs((s) => s.assignToGroup);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<TabGroupMenuDetail>).detail;
      if (!detail?.tabId) return;
      setNewName('');
      setNewColor(COLOR_KEYS[(useTabs.getState().groups.length + 4) % COLOR_KEYS.length]!);
      setState(detail);
    };
    window.addEventListener(TAB_GROUP_EVENT, onOpen);
    return () => window.removeEventListener(TAB_GROUP_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!state) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setState(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setState(null);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [state]);

  if (!state) return null;
  const tab = tabs.find((t) => t.id === state.tabId);
  if (!tab) return null;

  const createAndAssign = () => {
    const id = createGroup(newName || `Grup ${groups.length + 1}`, newColor);
    assignToGroup(tab.id, id);
    setState(null);
  };

  const forceClose = async () => {
    try {
      const el = getWebview(tab.id);
      const wcId = (() => {
        try { return el?.getWebContentsId(); } catch { return undefined; }
      })();
      if (wcId) {
        try { await (window.aether as unknown as { tabs: { forceClose: (id: number) => Promise<unknown> } }).tabs.forceClose(wcId); } catch {}
      }
    } catch {}
    useTabs.getState().forceClose(tab.id);
    setState(null);
  };

  // Menü ekran dışına taşmasın
  const left = Math.min(state.x, window.innerWidth - 280);
  const top = Math.min(state.y, window.innerHeight - 320);

  return createPortal(
    <div
      ref={rootRef}
      className="fixed z-[320] w-[264px] rounded-xl border border-white/10 bg-bg-elevated/95 p-2 shadow-2xl backdrop-blur-xl"
      style={{ left, top }}
    >
      <p className="mb-1.5 truncate px-2 pt-1 text-[11px] font-medium text-fg-subtle">
        {tab.title || 'Sekme'} — gruba ekle
      </p>

      {groups.length > 0 && (
        <div className="mb-1.5 max-h-40 overflow-y-auto">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                assignToGroup(tab.id, g.id);
                setState(null);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] hover:bg-white/5 ${
                tab.groupId === g.id ? 'text-brand' : 'text-fg-muted'
              }`}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${GROUP_COLORS[g.color].dot}`} />
              <span className="min-w-0 flex-1 truncate">{g.name}</span>
              {tab.groupId === g.id && <span className="text-[10px]">✓</span>}
            </button>
          ))}
        </div>
      )}

      {tab.groupId && (
        <button
          type="button"
          onClick={() => {
            assignToGroup(tab.id, null);
            setState(null);
          }}
          className="mb-1.5 w-full rounded-lg px-2 py-1.5 text-left text-[12px] text-fg-muted hover:bg-white/5 hover:text-fg"
        >
          Gruptan çıkar
        </button>
      )}

      <div className="rounded-lg border border-white/8 bg-black/20 p-2">
        <p className="mb-1.5 text-[10.5px] font-medium text-fg-subtle">Yeni grup</p>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              createAndAssign();
            }
          }}
          placeholder={`Grup ${groups.length + 1}`}
          className="mb-2 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[12px] text-fg focus:border-brand/50 focus:outline-none"
        />
        <div className="mb-2 flex items-center gap-1.5">
          {COLOR_KEYS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewColor(c)}
              title={GROUP_COLORS[c].label}
              aria-label={GROUP_COLORS[c].label}
              className={`h-4.5 w-4.5 h-[18px] w-[18px] rounded-full ${GROUP_COLORS[c].dot} ${
                newColor === c ? 'ring-2 ring-white/70 ring-offset-1 ring-offset-black' : ''
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={createAndAssign}
          className="w-full rounded-md bg-brand/20 px-2 py-1.5 text-[11.5px] font-medium text-brand hover:bg-brand/30"
        >
          Oluştur ve ekle
        </button>
      </div>
      <p className="mt-1.5 px-2 pb-0.5 text-[10px] leading-relaxed text-fg-subtle">
        Grup adı ve rengi yalnızca bu cihazda saklanır.
      </p>
      <div className="mt-2 border-t border-white/5 pt-2">
        <button
          type="button"
          onClick={() => void forceClose()}
          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[12px] text-amber-300 hover:bg-amber-500/10"
        >
          <span>Sekmeyi Zorla Kapat</span>
          <span className="text-[10px] text-fg-subtle">donmuşsa</span>
        </button>
        <p className="px-2 pt-1 text-[10px] leading-relaxed text-fg-subtle">Sekme donmuşsa kullanın — renderer çökertilip sekme kapatılır, geri alma yığınına eklenmez.</p>
      </div>
    </div>,
    document.body,
  );
}
