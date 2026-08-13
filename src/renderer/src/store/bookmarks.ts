import { create } from 'zustand';

// Yer imleri — klasör desteği. Basit persisted tree.
// Kalıcılık: localStorage (Aşama 6: IndexedDB'ye taşınacak).
export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  folder?: boolean;
  parentId?: string;
  folderId?: string;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  createdAt: number;
}

interface BookmarksState {
  nodes: BookmarkNode[];
  folders: BookmarkFolder[];
  add: (node: Omit<BookmarkNode, 'id'>) => void;
  update: (id: string, patch: Partial<Pick<BookmarkNode, 'title' | 'url' | 'folderId'>>) => void;
  remove: (id: string) => void;
  removeByUrl: (url: string) => void;
  findByUrl: (url: string) => BookmarkNode | undefined;
  toggle: (title: string, url: string) => boolean; // true = eklendi
  importJson: (nodes: BookmarkNode[]) => void;
  exportJson: () => BookmarkNode[];
  createFolder: (name: string) => string;
  renameFolder: (id: string, name: string) => void;
  removeFolder: (id: string) => void;
  moveToFolder: (id: string, folderId: string | null) => void;
}

const STORAGE_KEY = 'aethernode.bookmarks';
const FOLDER_KEY = 'aethernode.bookmark-folders';

function load(): BookmarkNode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookmarkNode[]) : [];
  } catch {
    return [];
  }
}

function loadFolders(): BookmarkFolder[] {
  try {
    const raw = localStorage.getItem(FOLDER_KEY);
    return raw ? (JSON.parse(raw) as BookmarkFolder[]) : [];
  } catch {
    return [];
  }
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export const useBookmarks = create<BookmarksState>((set, get) => ({
  nodes: load(),
  folders: loadFolders(),
  add: (node) => {
    const next = [...get().nodes, { ...node, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}` }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ nodes: next });
  },
  update: (id, patch) => {
    // Doğrulama: boş başlık veya geçersiz URL ise kaydetme engeli — caller sorumlu, burada da guard
    if (patch.title !== undefined && !patch.title.trim()) return;
    if (patch.url !== undefined && patch.url.trim() && !isValidUrl(patch.url.trim())) return;
    const next = get().nodes.map((n) => (n.id === id ? { ...n, ...patch, title: patch.title?.trim() ?? n.title, url: patch.url?.trim() ?? n.url } : n));
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
  createFolder: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    const id = `fld-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
    const next = [...get().folders, { id, name: trimmed, createdAt: Date.now() }];
    localStorage.setItem(FOLDER_KEY, JSON.stringify(next));
    set({ folders: next });
    return id;
  },
  renameFolder: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = get().folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f));
    localStorage.setItem(FOLDER_KEY, JSON.stringify(next));
    set({ folders: next });
  },
  removeFolder: (id) => {
    const nextFolders = get().folders.filter((f) => f.id !== id);
    localStorage.setItem(FOLDER_KEY, JSON.stringify(nextFolders));
    // İçindeki yer imleri Klasörsüz'e düşer
    const nextNodes = get().nodes.map((n) => (n.folderId === id ? { ...n, folderId: undefined } : n));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNodes));
    set({ folders: nextFolders, nodes: nextNodes });
  },
  moveToFolder: (id, folderId) => {
    const next = get().nodes.map((n) => (n.id === id ? { ...n, folderId: folderId ?? undefined } : n));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ nodes: next });
  },
}));