import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabs } from '@renderer/store/tabs';
import { useSettings } from '@renderer/store/settings';
import { showToast } from './toast-bus';
import {
  Close,
  Plus,
  Globe,
  Incognito,
  Volume,
  VolumeOff,
  ChevronDown,
  ChevronRight,
} from '@renderer/components/ui/icons';
import { GROUP_COLORS, openTabGroupMenu } from './tab-group-menu';
import type { TabSnapshot, TabGroup } from '@shared/types/tabs';
import { useWorkspaces } from '@renderer/store/workspaces';

// Dikey sekme çubuğu — Ctrl+Shift+V ile yatay moddan geçilir.
// Gruplar katlanabilir bölümler halinde görünür; panel genişliği sağ
// kenardan sürüklenerek ayarlanır ve ayarlarda kalıcıdır.

const MIN_W = 160;
const MAX_W = 480;
const ICON_ONLY_KEY = 'aether.vtabs.iconOnly';

export function VerticalTabBar() {
  const allTabs = useTabs((s) => s.tabs);
  const workspaceId = useWorkspaces((s) => s.activeId);
  const treeTabs = useSettings((s) => s.settings.general.treeTabs);
  const tabs = allTabs.filter((t) => {
    if (!workspaceId) return true;
    return t.workspaceId === workspaceId;
  });
  const groups = useTabs((s) => s.groups);
  const activeId = useTabs((s) => s.activeId);
  const splitId = useTabs((s) => s.splitId);
  const activate = useTabs((s) => s.activate);
  const close = useTabs((s) => s.close);
  const open = useTabs((s) => s.open);
  const toggleMute = useTabs((s) => s.toggleMute);
  const toggleGroupCollapse = useTabs((s) => s.toggleGroupCollapse);
  const closeGroup = useTabs((s) => s.closeGroup);
  const moveTab = useTabs((s) => s.moveTab);
  const settings = useSettings((s) => s.settings);
  const applySettings = useSettings((s) => s.apply);

  const [iconOnly, setIconOnly] = useState(() => {
    try {
      return localStorage.getItem(ICON_ONLY_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const closeBatch = useRef<{ count: number; timer: number | null }>({ count: 0, timer: null });
  const triggerCloseToast = (n: number) => {
    const msg = n === 1 ? 'Sekme kapatıldı' : `${n} sekme kapatıldı`;
    showToast({ message: msg, tone: 'info', duration: 3800, action: { label: 'Geri Al', onClick: () => useTabs.getState().reopen() } });
  };
  const handleClose = (id: string) => {
    close(id);
    closeBatch.current.count += 1;
    if (closeBatch.current.timer) window.clearTimeout(closeBatch.current.timer);
    closeBatch.current.timer = window.setTimeout(() => {
      const c = closeBatch.current.count;
      closeBatch.current.count = 0;
      closeBatch.current.timer = null;
      triggerCloseToast(c);
    }, 500) as unknown as number;
  };
  const width = iconOnly ? 52 : Math.min(MAX_W, Math.max(MIN_W, settings.general.tabBarWidth));
  const dragging = useRef(false);
  const liveWidth = useRef(width);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const toggleIconOnly = () => {
    const next = !iconOnly;
    setIconOnly(next);
    try {
      localStorage.setItem(ICON_ONLY_KEY, next ? '1' : '0');
    } catch {
      /* yoksay */
    }
  };

  // Genişlik sürükleme — mousemove sırasında doğrudan DOM'a yazılır
  // (her pikselde ayar IPC'si tetiklenmesin), bırakınca kalıcılaştırılır.
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (iconOnly) return;
      e.preventDefault();
      dragging.current = true;
      const startX = e.clientX;
      const startW = liveWidth.current;
      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const w = Math.min(MAX_W, Math.max(MIN_W, startW + (ev.clientX - startX)));
        liveWidth.current = w;
        if (panelRef.current) panelRef.current.style.width = `${w}px`;
      };
      const onUp = () => {
        dragging.current = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        void applySettings({
          ...useSettings.getState().settings,
          general: {
            ...useSettings.getState().settings.general,
            tabBarWidth: liveWidth.current,
          },
        });
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [iconOnly, applySettings],
  );

  useEffect(() => {
    liveWidth.current = Math.min(MAX_W, Math.max(MIN_W, settings.general.tabBarWidth));
  }, [settings.general.tabBarWidth]);

  const renderRow = (t: TabSnapshot, groupColor?: TabGroup['color']) => (
    <button
      key={t.id}
      type="button"
      draggable
      onDragStart={(e) => {
        dragId.current = t.id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', t.id);
        if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '0.45';
      }}
      onDragEnd={(e) => {
        dragId.current = null;
        setDragOverId(null);
        if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '1';
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverId !== t.id) setDragOverId(t.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const from = e.dataTransfer.getData('text/plain') || dragId.current;
        setDragOverId(null);
        dragId.current = null;
        if (from && from !== t.id) moveTab(from, t.id);
      }}
      onClick={() => activate(t.id)}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          handleClose(t.id);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        openTabGroupMenu({ tabId: t.id, x: e.clientX, y: e.clientY });
      }}
      title={`${t.title || 'Sekme'} — sürükleyerek sırayı değiştir`}
      className={`group relative flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs transition ${
        activeId === t.id
          ? 'bg-bg-elevated text-fg'
          : 'text-fg-muted hover:bg-white/5 hover:text-fg'
      } ${t.profileId === 'incognito' ? 'ring-1 ring-inset ring-purple-500/40' : ''} ${
        t.discarded ? 'opacity-50' : ''
      } ${splitId === t.id ? 'ring-1 ring-inset ring-brand/50' : ''} ${
        dragOverId === t.id ? 'ring-2 ring-brand/60 shadow-glow' : ''
      }`}
      style={
        {
          contentVisibility: 'auto',
          paddingLeft: treeTabs && t.parentId ? 20 : undefined,
        } as React.CSSProperties
      }
    >
      {groupColor && (
        <span
          className="absolute inset-y-1 left-0 w-[3px] rounded-full"
          style={{ backgroundColor: GROUP_COLORS[groupColor].line }}
        />
      )}
      {t.profileId === 'incognito' ? (
        <Incognito className="h-3.5 w-3.5 shrink-0 text-purple-300" />
      ) : t.faviconUrl ? (
        <img src={t.faviconUrl} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" onError={(e) => (e.currentTarget.style.display = 'none')} />
      ) : (
        <Globe className={`h-3.5 w-3.5 shrink-0 ${t.loading ? 'animate-pulse-soft' : ''}`} />
      )}
      {!iconOnly && (
        <span className="min-w-0 flex-1 truncate">
          {t.discarded ? `${t.title || 'Sekme'} (uykuda)` : t.title || 'Yeni Sekme'}
        </span>
      )}
      {!iconOnly && (t.audible || t.muted) && (
        <span
          role="button"
          aria-label={t.muted ? 'Sesi aç' : 'Sessize al'}
          onClick={(e) => {
            e.stopPropagation();
            toggleMute(t.id);
          }}
          className={`grid h-4 w-4 shrink-0 place-items-center rounded hover:bg-white/10 ${
            t.muted ? 'text-fg-muted' : 'text-brand'
          }`}
        >
          {t.muted ? <VolumeOff className="h-3 w-3" /> : <Volume className="h-3 w-3" />}
        </span>
      )}
      {!iconOnly && (
        <span
          role="button"
          aria-label="Sekmeyi kapat"
          onClick={(e) => {
            e.stopPropagation();
            handleClose(t.id);
          }}
          className="grid h-4 w-4 shrink-0 place-items-center rounded opacity-0 hover:bg-white/10 group-hover:opacity-100"
        >
          <Close className="h-3 w-3" />
        </span>
      )}
      {t.loading && (
        <span className="absolute inset-x-1 bottom-0 h-0.5 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-1/2 animate-pulse-soft bg-brand" />
        </span>
      )}
    </button>
  );

  // Grupsuz + grup bazlı bölümleme (sekme dizisindeki sıra korunur)
  const ungrouped = tabs.filter((t) => !t.groupId || !groups.some((g) => g.id === t.groupId));
  const orderedGroups = groups.filter((g) => tabs.some((t) => t.groupId === g.id));

  return (
    <div
      ref={panelRef}
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col border-r border-white/5 bg-bg-base/60"
    >
      <div className="flex items-center justify-between px-2 pb-1 pt-2">
        {!iconOnly && (
          <span className="text-[10.5px] font-medium uppercase tracking-wide text-fg-subtle">
            Sekmeler ({tabs.length})
          </span>
        )}
        <button
          type="button"
          onClick={toggleIconOnly}
          title={iconOnly ? 'Genişlet' : 'Yalnızca ikon'}
          className="grid h-6 w-6 place-items-center rounded text-fg-muted hover:bg-white/5 hover:text-fg"
          aria-label={iconOnly ? 'Paneli genişlet' : 'Yalnızca ikon görünümü'}
        >
          {iconOnly ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5 -rotate-90" />}
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1.5 pb-2">
        {ungrouped.map((t) => renderRow(t))}

        {orderedGroups.map((g) => {
          const members = tabs.filter((t) => t.groupId === g.id);
          return (
            <div key={g.id} className="pt-1">
              <div className="group/hdr flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleGroupCollapse(g.id)}
                  title={g.name}
                  className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 text-[11px] font-medium text-fg-muted hover:bg-white/5 hover:text-fg"
                >
                  {g.collapsed ? (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  )}
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: GROUP_COLORS[g.color].line }}
                  />
                  {!iconOnly && <span className="min-w-0 truncate">{g.name}</span>}
                  {!iconOnly && (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={members.length}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="ml-auto text-[10px] text-fg-subtle"
                      >
                        {members.length}
                      </motion.span>
                    </AnimatePresence>
                  )}
                </button>
                {!iconOnly && (
                  <button
                    type="button"
                    onClick={() => closeGroup(g.id)}
                    title="Gruptaki tüm sekmeleri kapat"
                    className="grid h-5 w-5 shrink-0 place-items-center rounded text-fg-subtle opacity-0 hover:bg-white/10 hover:text-fg group-hover/hdr:opacity-100"
                    aria-label="Grubu kapat"
                  >
                    <Close className="h-3 w-3" />
                  </button>
                )}
              </div>
              {!g.collapsed && (
                <div className="mt-0.5 space-y-0.5">{members.map((t) => renderRow(t, g.color))}</div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => open()}
          className={`mt-1 flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-fg-muted hover:bg-white/5 hover:text-fg ${
            iconOnly ? 'justify-center px-0' : ''
          }`}
          aria-label="Yeni sekme"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!iconOnly && <span>Yeni sekme</span>}
        </button>
      </div>

      {/* Genişlik sürükleme tutamacı */}
      {!iconOnly && (
        <div
          onMouseDown={onDragStart}
          className="absolute inset-y-0 right-0 w-1 cursor-col-resize hover:bg-brand/40"
          role="separator"
          aria-orientation="vertical"
          aria-label="Panel genişliği"
        />
      )}
    </div>
  );
}
