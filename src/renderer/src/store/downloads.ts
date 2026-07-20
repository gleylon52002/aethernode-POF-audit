import { create } from 'zustand';

export type DownloadStatus = 'queued' | 'progressing' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  path?: string;
  bytesTotal?: number;
  bytesReceived?: number;
  status: DownloadStatus;
  startedAt: number;
}

interface DownloadsState {
  items: DownloadItem[];
  add: (item: Omit<DownloadItem, 'startedAt' | 'status'>) => void;
  update: (id: string, patch: Partial<DownloadItem>) => void;
  remove: (id: string) => void;
}

const STORAGE_KEY = 'aethernode.downloads';

function load(): DownloadItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DownloadItem[]) : [];
  } catch {
    return [];
  }
}

function persist(items: DownloadItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export const useDownloads = create<DownloadsState>((set, get) => ({
  items: load(),
  add: (item) => {
    const next: DownloadItem = { ...item, startedAt: Date.now(), status: 'progressing' };
    const items = [next, ...get().items];
    persist(items);
    set({ items });
  },
  update: (id, patch) => {
    const items = get().items.map((d) => (d.id === id ? { ...d, ...patch } : d));
    persist(items);
    set({ items });
  },
  remove: (id) => {
    const items = get().items.filter((d) => d.id !== id);
    persist(items);
    set({ items });
  },
}));