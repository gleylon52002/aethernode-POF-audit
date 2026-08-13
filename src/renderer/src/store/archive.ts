import { create } from 'zustand';

export interface ArchivedTab {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string;
  archivedAt: number;
  workspaceId?: string;
}

const KEY = 'aethernode.tab-archive';
const MAX = 200;

function load(): ArchivedTab[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ArchivedTab[]) : [];
  } catch {
    return [];
  }
}

interface ArchiveState {
  items: ArchivedTab[];
  add: (item: Omit<ArchivedTab, 'id' | 'archivedAt'>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useArchive = create<ArchiveState>((set, get) => ({
  items: load(),
  add: (item) => {
    const next: ArchivedTab = {
      ...item,
      id: `ar-${Date.now().toString(36)}`,
      archivedAt: Date.now(),
    };
    let items = [next, ...get().items];
    if (items.length > MAX) items = items.slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(items));
    set({ items });
  },
  remove: (id) => {
    const items = get().items.filter((i) => i.id !== id);
    localStorage.setItem(KEY, JSON.stringify(items));
    set({ items });
  },
  clear: () => {
    localStorage.removeItem(KEY);
    set({ items: [] });
  },
}));
