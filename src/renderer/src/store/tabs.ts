import { create } from 'zustand';
import type { TabSnapshot, TabId } from '@shared/types/tabs';
import { NEW_TAB_URL } from '@shared/constants/app';

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
  activeId: TabId | null;
  incognito: boolean;
  closedStack: ClosedTab[];
  open: (url?: string, profileId?: string) => TabId;
  close: (id: TabId) => void;
  reopen: () => void;
  activate: (id: TabId) => void;
  activateByIndex: (index: number) => void;
  activateLast: () => void;
  activateNext: (dir: 1 | -1) => void;
  update: (id: TabId, patch: Partial<TabSnapshot>) => void;
  setIncognito: (on: boolean) => void;
  resetAll: () => void;
  restoreSession: (entries: Array<{ url: string; title?: string }>) => void;
  discardInactive: (maxIdleMs: number) => void;
}

function newId(): TabId {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeTab(url?: string, profileId?: string): TabSnapshot {
  return {
    id: newId(),
    title: profileId === 'incognito' ? 'Gizli Sekme' : 'Yeni Sekme',
    url: url ?? NEW_TAB_URL,
    loading: !!url,
    pinned: false,
    muted: false,
    profileId: profileId ?? 'default',
    wallpaperIndex: Math.floor(Math.random() * 10),
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

export const useTabs = create<TabsState>((set, get) => ({
  tabs: [initialTab],
  activeId: initialTab.id,
  incognito: false,
  closedStack: [],
  open: (url, profileId) => {
    const resolvedProfile = profileId ?? (get().incognito ? 'incognito' : 'default');
    const tab = makeTab(url, resolvedProfile);
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }));
    return tab.id;
  },
  close: (id) =>
    set((s) => {
      const closing = s.tabs.find((t) => t.id === id);
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeId = s.activeId === id ? (tabs[tabs.length - 1]?.id ?? null) : s.activeId;
      let closedStack = s.closedStack;
      if (closing && closing.profileId !== 'incognito' && closing.url !== NEW_TAB_URL) {
        closedStack = [{ url: closing.url, title: closing.title }, ...s.closedStack];
        if (closedStack.length > MAX_CLOSED) closedStack = closedStack.slice(0, MAX_CLOSED);
      }
      return { tabs, activeId, closedStack };
    }),
  reopen: () => {
    const { closedStack, open } = get();
    const last = closedStack[0];
    if (!last) return;
    set({ closedStack: closedStack.slice(1) });
    open(last.url);
  },
  activate: (id) =>
    set((s) => ({
      activeId: id,
      tabs: s.tabs.map((t) =>
        t.id === id
          ? { ...t, lastActiveAt: Date.now(), discarded: false }
          : t,
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
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  setIncognito: (on) => set({ incognito: on }),
  resetAll: () => {
    const tab = { ...makeTab(), title: 'Başlangıç', loading: false };
    set({ tabs: [tab], activeId: tab.id, incognito: false, closedStack: [] });
  },
  restoreSession: (entries) => {
    if (entries.length === 0) return;
    const tabs = entries.map((e) => {
      const t = makeTab(e.url);
      t.title = e.title || e.url;
      t.loading = /^https?:\/\//i.test(e.url);
      return t;
    });
    set({ tabs, activeId: tabs[0]!.id, closedStack: [] });
  },
  // Bellek tasarrufu: aktif olmayan ve maxIdleMs süredir dokunulmayan
  // sekmeleri discarded işaretle — webview unmount edilir.
  discardInactive: (maxIdleMs) => {
    const now = Date.now();
    const { activeId } = get();
    // Medya siteleri discard edilmez — arka planda müzik/video sürer.
    const mediaRe =
      /youtube\.com|youtu\.be|music\.youtube|spotify\.com|soundcloud\.com|twitch\.tv|netflix\.com|vimeo\.com/i;
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id === activeId || t.pinned || t.discarded) return t;
        if (t.url.startsWith('aethernode://')) return t;
        if (mediaRe.test(t.url)) return t;
        if (now - t.lastActiveAt < maxIdleMs) return t;
        return { ...t, discarded: true, loading: false };
      }),
    }));
  },
}));
