import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabs } from '@renderer/store/tabs';
import { showToast } from './toast-bus';
import {
  Close,
  Plus,
  Flame,
  Globe,
  Incognito,
  Min,
  Max,
  Volume,
  VolumeOff,
  Columns,
} from '@renderer/components/ui/icons';
import { Tooltip } from '@renderer/components/ui';
import { GROUP_COLORS, openTabGroupMenu } from './tab-group-menu';
import { useWorkspaces } from '@renderer/store/workspaces';

const TAB_WARN_KEY = 'aether.tabWarn.dismissed';
const TAB_WARN_AT = 30;

export function TabBar({ showTabs = true }: { showTabs?: boolean }) {
  const allTabs = useTabs((s) => s.tabs);
  const workspaceId = useWorkspaces((s) => s.activeId);
  const tabs = useMemo(() => {
    if (!workspaceId) return allTabs;
    return allTabs.filter(
      (t) => !t.workspaceId || t.workspaceId === workspaceId || t.id === useTabs.getState().activeId,
    );
  }, [allTabs, workspaceId]);
  const groups = useTabs((s) => s.groups);
  const activeId = useTabs((s) => s.activeId);
  const splitId = useTabs((s) => s.splitId);
  const activate = useTabs((s) => s.activate);
  const close = useTabs((s) => s.close);
  const open = useTabs((s) => s.open);
  const openBurner = useTabs((s) => s.openBurner);
  const toggleMute = useTabs((s) => s.toggleMute);
  const toggleSplit = useTabs((s) => s.toggleSplit);
  const toggleGroupCollapse = useTabs((s) => s.toggleGroupCollapse);
  const moveTab = useTabs((s) => s.moveTab);
  const [maximized, setMaximized] = useState(false);
  const [showWarn, setShowWarn] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const warnShown = useRef(false);
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

  useEffect(() => {
    void window.aether.window.isMaximized().then((r) => r.ok && setMaximized(!!r.data));
    const off = window.aether.window.onMaximizedChange((max) => setMaximized(max));
    return () => off();
  }, []);

  useEffect(() => {
    if (tabs.length < TAB_WARN_AT) {
      warnShown.current = false;
      setShowWarn(false);
      return;
    }
    if (warnShown.current) return;
    try {
      if (sessionStorage.getItem(TAB_WARN_KEY) === '1') return;
    } catch {
      /* yoksay */
    }
    warnShown.current = true;
    setShowWarn(true);
  }, [tabs.length]);

  const dismissWarn = () => {
    setShowWarn(false);
    try {
      sessionStorage.setItem(TAB_WARN_KEY, '1');
    } catch {
      /* yoksay */
    }
  };

  const tabCount = tabs.length;
  // Chrome benzeri sıkışma: çok sekmede daha dar
  const tabClass = useMemo(() => {
    if (tabCount > 24) return 'min-w-[28px] max-w-[96px] px-1';
    if (tabCount > 14) return 'min-w-[40px] max-w-[132px] px-1.5';
    return 'min-w-[72px] max-w-[180px] px-2.5';
  }, [tabCount]);
  const hideTitle = tabCount > 22;

  const renderTab = (t: (typeof tabs)[number], groupColor?: keyof typeof GROUP_COLORS) => {
    const compact = hideTitle && activeId !== t.id;
    return (
      <button
        key={t.id}
        type="button"
        draggable
        onDragStart={(e) => {
          dragId.current = t.id;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', t.id);
          // Sürüklerken yarı saydam
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
        onDragLeave={() => {
          if (dragOverId === t.id) setDragOverId(null);
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
        className={`group no-drag relative flex h-7 flex-1 items-center gap-1 rounded-md text-xs transition ${tabClass} ${
          activeId === t.id
            ? 'bg-bg-elevated text-fg'
            : 'bg-white/[0.02] text-fg-muted hover:bg-white/5 hover:text-fg'
        } ${t.profileId === 'incognito' ? 'ring-1 ring-inset ring-purple-500/40' : ''} ${
          t.discarded ? 'opacity-50' : ''
        } ${splitId === t.id ? 'ring-1 ring-inset ring-brand/50' : ''} ${
          dragOverId === t.id ? 'ring-2 ring-brand/60 shadow-glow' : ''
        }`}
        style={
          groupColor
            ? { boxShadow: `inset 0 2px 0 0 ${GROUP_COLORS[groupColor].line}` }
            : undefined
        }
      >
        {t.isBurner ? (
          <Flame className="h-3.5 w-3.5 shrink-0 text-orange-500 animate-pulse-soft" />
        ) : t.profileId === 'incognito' ? (
          <Incognito className="h-3.5 w-3.5 shrink-0 text-purple-300" />
        ) : t.faviconUrl ? (
          <img src={t.faviconUrl} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <Globe className={`h-3.5 w-3.5 shrink-0 ${t.loading ? 'animate-pulse-soft' : ''}`} />
        )}

        {!compact && (
          <span className="min-w-0 flex-1 truncate">
            {t.discarded ? `${t.title || 'Sekme'} (uykuda)` : t.title || 'Yeni Sekme'}
          </span>
        )}

        {(t.audible || t.muted) && (
          <button
            type="button"
            aria-label={t.muted ? 'Sesi aç' : 'Sessize al'}
            title={t.muted ? 'Sesi aç' : 'Sessize al'}
            onClick={(e) => {
              e.stopPropagation();
              toggleMute(t.id);
            }}
            className={`grid h-4 w-4 shrink-0 place-items-center rounded hover:bg-white/10 ${
              t.muted ? 'text-fg-muted' : 'text-brand'
            }`}
          >
            {t.muted ? <VolumeOff className="h-3 w-3" /> : <Volume className="h-3 w-3" />}
          </button>
        )}

        <button
          type="button"
          aria-label="Sekmeyi kapat"
          onClick={(e) => {
            e.stopPropagation();
            handleClose(t.id);
          }}
          className="grid h-4 w-4 shrink-0 place-items-center rounded opacity-0 hover:bg-white/10 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-1 focus-visible:ring-brand"
        >
          <Close className="h-3 w-3" />
        </button>

        {t.loading && (
          <span className="absolute inset-x-1 bottom-0 h-0.5 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full w-1/2 animate-pulse-soft bg-brand" />
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="relative titlebar flex h-10 shrink-0 items-center gap-1 border-b border-white/5 bg-bg-base/80 pl-2 pr-1 backdrop-blur">
      <div className="no-drag flex shrink-0 items-center gap-1.5 px-2">
        <button
          type="button"
          className="h-3 w-3 rounded-full bg-[#FF5F56] hover:bg-[#FF5F56]/80 flex items-center justify-center group"
          onClick={() => void window.aether.window.close()}
          aria-label="Kapat"
        >
          <Close className="h-2 w-2 opacity-0 group-hover:opacity-100 text-[#4c0000]" />
        </button>
        <button
          type="button"
          className="h-3 w-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFBD2E]/80 flex items-center justify-center group"
          onClick={() => void window.aether.window.minimize()}
          aria-label="Küçült"
        >
          <Min className="h-2 w-2 opacity-0 group-hover:opacity-100 text-[#995700]" />
        </button>
        <button
          type="button"
          className="h-3 w-3 rounded-full bg-[#27C93F] hover:bg-[#27C93F]/80 flex items-center justify-center group"
          onClick={() => void window.aether.window.maximize()}
          aria-label={maximized ? 'Önceki boyut' : 'Büyüt'}
        >
          <Max className="h-2 w-2 opacity-0 group-hover:opacity-100 text-[#006500]" />
        </button>
      </div>

      <div className="mx-0.5 h-4 w-px shrink-0 bg-white/10" />

      <div className="no-drag flex shrink-0 items-center gap-1.5 px-1.5">
        <div className="h-2 w-2 rounded-full bg-brand shadow-glow" />
        <span className="text-[11px] font-semibold tracking-wide text-fg">
          AetherNode <span className="font-medium text-brand">POF</span>
        </span>
      </div>

      <div className="mx-0.5 h-4 w-px shrink-0 bg-white/10" />

      {/* overflow yok — sekmeler flex ile sıkışır (Chrome gibi) */}
      {!showTabs && <div className="min-w-0 flex-1" />}
      {showTabs && (
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
        {(() => {
          const seenGroups = new Set<string>();
          const items: JSX.Element[] = [];
          for (const t of tabs) {
            const group = t.groupId ? groups.find((g) => g.id === t.groupId) : undefined;
            // Grubun ilk üyesinden önce kapsül
            if (group && !seenGroups.has(group.id)) {
              seenGroups.add(group.id);
              const count = tabs.filter((x) => x.groupId === group.id).length;
              items.push(
                <button
                  key={`grp-${group.id}`}
                  type="button"
                  onClick={() => toggleGroupCollapse(group.id)}
                  title={`${group.name} — ${group.collapsed ? 'aç' : 'daralt'}`}
                  className="no-drag flex h-6 max-w-[110px] shrink-0 items-center gap-1 rounded-full px-2 text-[10.5px] font-medium text-white/90"
                  style={{ backgroundColor: `${GROUP_COLORS[group.color].line}55` }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: GROUP_COLORS[group.color].line }}
                  />
                  <span className="min-w-0 truncate">{group.name}</span>
                  {group.collapsed && (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={count}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="ml-1 text-[10px] opacity-80"
                      >
                        +{count}
                      </motion.span>
                    </AnimatePresence>
                  )}
                </button>,
              );
            }
            // Daraltılmış grup: yalnızca aktif üye görünür
            if (group?.collapsed && t.id !== activeId && t.id !== splitId) continue;
            items.push(renderTab(t, group?.color));
          }
          return items;
        })()}
        <button
          type="button"
          onClick={() => open()}
          className="no-drag grid h-7 w-7 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-white/5 hover:text-fg"
          aria-label="Yeni sekme"
        >
          <Plus className="h-4 w-4" />
        </button>
        <Tooltip label="Kullan-At (Burner) Sekme Aç">
          <button
            type="button"
            onClick={() => openBurner()}
            className="no-drag grid h-7 w-7 shrink-0 place-items-center rounded-md text-orange-400 hover:bg-orange-500/20 transition-colors"
            aria-label="Kullan-At sekme"
          >
            <Flame className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
      )}

      <Tooltip label={splitId ? 'Split view kapat (Ctrl+Shift+L)' : 'Split view — yan yana (Ctrl+Shift+L)'}>
        <button
          type="button"
          onClick={() => toggleSplit()}
          className={`no-drag grid h-8 w-8 shrink-0 place-items-center rounded-md transition ${
            splitId ? 'bg-brand/20 text-brand' : 'text-fg-muted hover:bg-white/5 hover:text-fg'
          }`}
          aria-label="Split view"
        >
          <Columns className="h-3.5 w-3.5" />
        </button>
      </Tooltip>

      {false && (
        <div className="no-drag flex shrink-0 items-center">
          <button
            type="button"
            className="grid h-9 w-10 place-items-center text-fg-muted hover:bg-white/5 hover:text-fg"
            onClick={() => void window.aether.window.minimize()}
            aria-label="Küçült"
          >
            <Min className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="grid h-9 w-10 place-items-center text-fg-muted hover:bg-white/5 hover:text-fg"
            onClick={() => void window.aether.window.maximize()}
            aria-label={maximized ? 'Önceki boyut' : 'Büyüt'}
          >
            <Max className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="grid h-9 w-11 place-items-center text-fg-muted hover:bg-danger hover:text-white"
            onClick={() => void window.aether.window.close()}
            aria-label="Kapat"
          >
            <Close className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {showWarn &&
        createPortal(
          <div className="fixed left-1/2 top-[92px] z-[300] w-[min(440px,92vw)] -translate-x-1/2 rounded-xl border border-amber-400/25 bg-[#16120a]/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <p className="text-[12.5px] leading-relaxed text-amber-50/90">
              Biraz fazla sekme açık ({tabCount}). İstersen bazılarını kapatarak gezinmeyi daha
              akıcı tutabilirsin — acele yok.
            </p>
            <div className="mt-2.5 flex justify-end gap-2">
              <button
                type="button"
                onClick={dismissWarn}
                className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-[11px] font-medium text-amber-100 hover:bg-amber-500/30"
              >
                Anladım
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
