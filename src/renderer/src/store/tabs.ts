import { create } from 'zustand';
import type { TabSnapshot, TabId, TabGroup, TabGroupColor } from '@shared/types/tabs';
import { NEW_TAB_URL } from '@shared/constants/app';
import { useWorkspaces } from '@renderer/store/workspaces';
import { playUiSound } from '@renderer/hooks/use-sound';

// Sekme mağazası — aktif sekme, sekme listesi, aktif profil.
// Webview ref'leri doğrudan DOM'da tutulur (React); bu store yalnızca meta veri.
//
// closedStack: kapatılan sekmelerin son 25'i tutulur — Ctrl+Shift+T ile
// geri açılır. Incognito sekmeler gizlilik gereği yığına eklenmez.
interface ClosedTab {
  url: string;
  title: string;
}

interface TabsState {
  tabs: TabSnapshot[];
  /** Sekme grupları — yalnızca yerelde saklanır, cihaz dışına çıkmaz */
  groups: TabGroup[];
  activeId: TabId | null;
  /** Split view sağ panel sekmesi (null = kapalı) */
  splitId: TabId | null;
  incognito: boolean;
  closedStack: ClosedTab[];
  open: (url?: string, profileId?: string) => TabId;
  openBurner: (url?: string) => TabId;
  /** Yeni sekmede aç ama odak mevcut sekmede kalsın (Ctrl+tık) */
  openBackground: (url?: string, profileId?: string) => TabId;
  /** Sekme sırasını değiştir (sürükle-bırak) */
  moveTab: (fromId: TabId, toId: TabId) => void;
  close: (id: TabId) => void;
  forceClose: (id: TabId) => void;
  reopen: () => void;
  activate: (id: TabId) => void;
  activateByIndex: (index: number) => void;
  activateLast: () => void;
  activateNext: (dir: 1 | -1) => void;
  update: (id: TabId, patch: Partial<TabSnapshot>) => void;
  setIncognito: (on: boolean) => void;
  resetAll: () => void;
  restoreSession: (entries: Array<{ url: string; title?: string; groupId?: string }>) => void;
  discardInactive: (maxIdleMs: number) => void;
  toggleMute: (id: TabId) => void;
  toggleSplit: () => void;
  setSplit: (id: TabId | null) => void;
  /** Split panellerini yer değiştirir (sağ ↔ sol) */
  swapSplit: () => void;
  /** Yeni grup oluşturur, id döner */
  createGroup: (name: string, color: TabGroupColor) => string;
  /** Sekmeyi gruba atar (null = gruptan çıkar); grup üyeleri bitişik tutulur */
  assignToGroup: (tabId: TabId, groupId: string | null) => void;
  toggleGroupCollapse: (groupId: string) => void;
  /** Gruptaki tüm sekmeleri kapatır ve grubu siler */
  closeGroup: (groupId: string) => void;
  /** Grubu siler, sekmeler grupsuz kalır */
  removeGroup: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  restoreGroups: (groups: TabGroup[]) => void;
}

function newId(): TabId {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getAutoContainerId(url?: string): string | undefined {
  if (!url || url.startsWith('aethernode://')) return undefined;
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (!h) return undefined;
    const raw = localStorage.getItem('aethernode.container-rules');
    if (!raw) return undefined;
    const rules = JSON.parse(raw) as Array<{ domain: string; containerId: string }>;
    for (const r of rules) {
      const d = (r.domain || '').toLowerCase();
      if (!d) continue;
      if (h === d || h.endsWith(`.${d}`)) return r.containerId;
    }
  } catch {}
  return undefined;
}

function makeTab(url?: string, profileId?: string): TabSnapshot {
  const containerId = profileId === 'incognito' ? undefined : getAutoContainerId(url);
  return {
    id: newId(),
    title: profileId === 'incognito' ? 'Gizli Sekme' : 'Yeni Sekme',
    url: url ?? NEW_TAB_URL,
    loading: !!url,
    pinned: false,
    muted: false,
    profileId: profileId ?? 'default',
    containerId,
    wallpaperIndex: Math.floor(Math.random() * 29),
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };
}

const MAX_CLOSED = 25;

function createInitialTab(): TabSnapshot {
  return {
    ...makeTab(),
    title: 'Başlangıç',
    loading: false,
  };
}

const initialTab = createInitialTab();

/** Grup üyelerini bitişik hale getirir — grup kapsülleri parçalanmaz. */
function regroupTabs(tabs: TabSnapshot[]): TabSnapshot[] {
  const seen = new Set<string>();
  const out: TabSnapshot[] = [];
  for (const t of tabs) {
    if (!t.groupId) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        out.push(t);
      }
      continue;
    }
    if (seen.has(t.id)) continue;
    // Bu grubun ilk üyesi — tüm grup üyelerini sırayla ekle
    for (const m of tabs) {
      if (m.groupId === t.groupId && !seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
  }
  return out;
}

export const useTabs = create<TabsState>((set, get) => ({
  tabs: [initialTab],
  groups: [],
  activeId: initialTab.id,
  splitId: null,
  incognito: false,
  closedStack: [],
  open: (url, profileId) => {
    const resolvedProfile = profileId ?? (get().incognito ? 'incognito' : 'default');
    const tab = makeTab(url, resolvedProfile);
    try {
      const ws = useWorkspaces.getState().activeId;
      if (ws && resolvedProfile !== 'incognito') tab.workspaceId = ws;
    } catch {
      /* store henüz yoksa yoksay */
    }
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }));
    playUiSound('tabOpen');
    return tab.id;
  },
  openBurner: (url) => {
    const tab = makeTab(url, 'burner');
    tab.isBurner = true;
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }));
    playUiSound('tabOpen');
    return tab.id;
  },
  openBackground: (url, profileId) => {
    const resolvedProfile = profileId ?? (get().incognito ? 'incognito' : 'default');
    const tab = makeTab(url, resolvedProfile);
    // Chrome: yeni sekme aktif sekmenin hemen sağına eklenir; odak değişmez
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === s.activeId);
      const insertAt = idx >= 0 ? idx + 1 : s.tabs.length;
      const tabs = [...s.tabs];
      tabs.splice(insertAt, 0, tab);
      return { tabs };
    });
    playUiSound('tabOpen');
    return tab.id;
  },
  moveTab: (fromId, toId) => {
    if (fromId === toId) return;
    set((s) => {
      const from = s.tabs.findIndex((t) => t.id === fromId);
      const to = s.tabs.findIndex((t) => t.id === toId);
      if (from < 0 || to < 0) return s;
      const tabs = [...s.tabs];
      const [item] = tabs.splice(from, 1);
      if (!item) return s;
      // Hedef indeks: from < to ise splice sonrası kayar
      const target = tabs.findIndex((t) => t.id === toId);
      const insertAt = target < 0 ? tabs.length : from < to ? target + 1 : target;
      tabs.splice(insertAt, 0, item);
      // Sürükle-bırak sırasını koru — regroupTabs grup üyelerini yeniden
      // yığar ve kullanıcının yerleştirdiği sırayı bozar.
      return { tabs };
    });
  },
  close: (id) =>
    set((s) => {
      const closing = s.tabs.find((t) => t.id === id);
      const closedIdx = s.tabs.findIndex((t) => t.id === id);
      const tabs = s.tabs.filter((t) => t.id !== id);
      // Chrome: kapanan sekmenin sağına (yoksa soluna) geç
      let activeId = s.activeId;
      if (s.activeId === id) {
        const right = s.tabs[closedIdx + 1];
        const left = s.tabs[closedIdx - 1];
        activeId = (right ?? left)?.id ?? null;
      }
      const splitId = s.splitId === id ? null : s.splitId;
      let closedStack = s.closedStack;
      if (closing && closing.profileId !== 'incognito' && closing.url !== NEW_TAB_URL) {
        closedStack = [{ url: closing.url, title: closing.title }, ...s.closedStack];
        if (closedStack.length > MAX_CLOSED) closedStack = closedStack.slice(0, MAX_CLOSED);
      }
      // Üyesi kalmayan gruplar temizlenir
      const groups = s.groups.filter((g) => tabs.some((t) => t.groupId === g.id));
      // Ses — yalnızca kullanıcı tetiklediyse (discard değil)
      try { playUiSound('tabClose'); } catch {}
      return { tabs, activeId, closedStack, splitId, groups };
    }),
  reopen: () => {
    const { closedStack, open } = get();
    const last = closedStack[0];
    if (!last) return;
    set({ closedStack: closedStack.slice(1) });
    open(last.url);
  },
  forceClose: (id) =>
    set((s) => {
      const closedIdx = s.tabs.findIndex((t) => t.id === id);
      const tabs = s.tabs.filter((t) => t.id !== id);
      let activeId = s.activeId;
      if (s.activeId === id) {
        const right = s.tabs[closedIdx + 1];
        const left = s.tabs[closedIdx - 1];
        activeId = (right ?? left)?.id ?? null;
      }
      const splitId = s.splitId === id ? null : s.splitId;
      const groups = s.groups.filter((g) => tabs.some((t) => t.groupId === g.id));
      try { playUiSound('tabClose'); } catch {}
      return { tabs, activeId, splitId, groups };
    }),
  activate: (id) =>
    set((s) => ({
      activeId: id,
      // Split'teki sekmeye tıklanınca panelleri yer değiştir (odak sola)
      splitId: s.splitId === id ? s.activeId : s.splitId,
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, lastActiveAt: Date.now(), discarded: false } : t,
      ),
    })),
  activateByIndex: (index) => {
    const t = get().tabs[index];
    if (t) get().activate(t.id);
  },
  activateLast: () => {
    const tabs = get().tabs;
    const last = tabs[tabs.length - 1];
    if (last) get().activate(last.id);
  },
  activateNext: (dir) => {
    const { tabs, activeId } = get();
    if (tabs.length === 0) return;
    const idx = tabs.findIndex((t) => t.id === activeId);
    const next = tabs[(idx + dir + tabs.length) % tabs.length];
    if (next) get().activate(next.id);
  },
  update: (id, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t;
        // Container kuralı: aynı sekmede farklı domaine gidilirse otomatik container'a taşı
        if (patch.url && t.profileId !== 'incognito') {
          const auto = getAutoContainerId(patch.url);
          if (auto && t.containerId !== auto) {
            return { ...t, ...patch, containerId: auto, lastActiveAt: Date.now() } as TabSnapshot;
          }
        }
        return { ...t, ...patch } as TabSnapshot;
      }),
    })),
  setIncognito: (on) => set({ incognito: on }),
  resetAll: () => {
    const tab = { ...makeTab(), title: 'Başlangıç', loading: false };
    set({
      tabs: [tab],
      groups: [],
      activeId: tab.id,
      incognito: false,
      closedStack: [],
      splitId: null,
    });
  },
  restoreSession: (entries) => {
    if (entries.length === 0) return;
    const tabs = entries.map((e) => {
      const t = makeTab(e.url);
      t.title = e.title || e.url;
      t.loading = /^https?:\/\//i.test(e.url);
      if (e.groupId) t.groupId = e.groupId;
      return t;
    });
    set({ tabs, activeId: tabs[0]!.id, closedStack: [], splitId: null });
  },
  restoreGroups: (groups) => set({ groups }),
  discardInactive: (maxIdleMs) => {
    const now = Date.now();
    const { activeId, splitId } = get();
    const mediaRe =
      /youtube\.com|youtu\.be|music\.youtube|spotify\.com|soundcloud\.com|twitch\.tv|netflix\.com|vimeo\.com/i;
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id === activeId || t.id === splitId || t.pinned || t.discarded) return t;
        if (t.url.startsWith('aethernode://')) return t;
        if (mediaRe.test(t.url)) return t;
        if (t.audible || t.muted) return t;
        if (now - t.lastActiveAt < maxIdleMs) return t;
        return { ...t, discarded: true, loading: false };
      }),
    }));
  },
  toggleMute: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;
    const next = !tab.muted;
    get().update(id, { muted: next });
    void import('@renderer/components/layouts/webview-registry').then(({ setWebviewAudioMuted }) => {
      setWebviewAudioMuted(id, next);
    });
  },
  setSplit: (id) =>
    set((s) => ({
      splitId: id,
      // Uykudaki sekme panele alınırsa uyandır — yoksa boş görünür
      tabs: id
        ? s.tabs.map((t) => (t.id === id ? { ...t, discarded: false, lastActiveAt: Date.now() } : t))
        : s.tabs,
    })),
  swapSplit: () => {
    const { activeId, splitId } = get();
    if (!activeId || !splitId || activeId === splitId) return;
    set((s) => ({
      activeId: splitId,
      splitId: activeId,
      tabs: s.tabs.map((t) =>
        t.id === splitId ? { ...t, lastActiveAt: Date.now(), discarded: false } : t,
      ),
    }));
  },
  toggleSplit: () => {
    const { tabs, activeId, splitId } = get();
    if (splitId) {
      set({ splitId: null });
      return;
    }
    if (!activeId) return;
    // En uygun eş: aktif olmayan, en son kullanılmış sekme
    const others = tabs.filter((t) => t.id !== activeId);
    const neighbor = [...others].sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
    if (neighbor) {
      get().setSplit(neighbor.id);
      return;
    }
    // Tek sekme varsa yeni boş sekme sağda açılır
    const tab = makeTab();
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeId,
      splitId: tab.id,
    }));
  },
  createGroup: (name, color) => {
    const id = newId();
    const group: TabGroup = {
      id,
      name: name.trim() || 'Grup',
      color,
      collapsed: false,
      createdAt: Date.now(),
    };
    set((s) => ({ groups: [...s.groups, group] }));
    return id;
  },
  assignToGroup: (tabId, groupId) =>
    set((s) => {
      const tabs = regroupTabs(
        s.tabs.map((t) => (t.id === tabId ? { ...t, groupId: groupId ?? undefined } : t)),
      );
      const groups = s.groups.filter((g) => tabs.some((t) => t.groupId === g.id));
      return { tabs, groups };
    }),
  toggleGroupCollapse: (groupId) =>
    set((s) => ({
      groups: s.groups.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g)),
    })),
  closeGroup: (groupId) => {
    const memberIds = get()
      .tabs.filter((t) => t.groupId === groupId)
      .map((t) => t.id);
    for (const id of memberIds) get().close(id);
  },
  removeGroup: (groupId) =>
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== groupId),
      tabs: s.tabs.map((t) => (t.groupId === groupId ? { ...t, groupId: undefined } : t)),
    })),
  renameGroup: (groupId, name) =>
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === groupId ? { ...g, name: name.trim() || g.name } : g,
      ),
    })),
}));
