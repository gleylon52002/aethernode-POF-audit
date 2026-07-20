import { create } from 'zustand';

// Yer imleri — klasör desteği. Basit persisted tree.
// Kalıcılık: localStorage (Aşama 6: IndexedDB'ye taşınacak).
export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  folder?: boolean;
  parentId?: string;
}

interface BookmarksState {
  nodes: BookmarkNode[];
  add: (node: Omit<BookmarkNode, 'id'>) => void;
  remove: (id: string) => void;
  removeByUrl: (url: string) => void;
  findByUrl: (url: string) => BookmarkNode | undefined;
  toggle: (title: string, url: string) => boolean; // true = eklendi
  importJson: (nodes: BookmarkNode[]) => void;
  exportJson: () => BookmarkNode[];
}

const STORAGE_KEY = 'aethernode.bookmarks';

function load(): BookmarkNode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookmarkNode[]) : [];
  } catch {
    return [];
  }
}

export const useBookmarks = create<BookmarksState>((set, get) => ({
  nodes: load(),
  add: (node) => {
    const next = [...get().nodes, { ...node, id: `${Date.now().toString(36)}` }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ nodes: next });
  },
  remove: (id) => {
    const next = get().nodes.filter((n) => n.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ nodes: next });
  },
  removeByUrl: (url) => {
    const next = get().nodes.filter((n) => n.url !== url);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ nodes: next });
  },
  findByUrl: (url) => get().nodes.find((n) => n.url === url),
  toggle: (title, url) => {
    const existing = get().nodes.find((n) => n.url === url);
    if (existing) {
      get().remove(existing.id);
      return false;
    }
    get().add({ title, url });
    return true;
  },
  importJson: (nodes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    set({ nodes });
  },
  exportJson: () => get().nodes,
}));