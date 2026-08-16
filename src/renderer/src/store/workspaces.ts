import { create } from 'zustand';
import type { Workspace, TabGroupColor } from '@shared/types/tabs';

const WS_KEY = 'aethernode.workspaces';
const ACTIVE_KEY = 'aethernode.workspace.active';

const DEFAULT_WORKSPACES: Workspace[] = [
  { id: 'ws-work', name: 'İş & Proje', color: 'purple', icon: 'briefcase', order: 0, createdAt: Date.now() },
  { id: 'ws-personal', name: 'Kişisel', color: 'blue', icon: 'user', order: 1, createdAt: Date.now() },
  { id: 'ws-crypto', name: 'Kripto & Finans', color: 'yellow', icon: 'coins', order: 2, createdAt: Date.now() },
  { id: 'ws-privacy', name: 'Gizli & Araştırma', color: 'green', icon: 'shield', order: 3, createdAt: Date.now() },
];

function loadWs(): Workspace[] {
  try {
    const raw = localStorage.getItem(WS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Workspace[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem(WS_KEY, JSON.stringify(DEFAULT_WORKSPACES));
    return DEFAULT_WORKSPACES;
  } catch {
    return DEFAULT_WORKSPACES;
  }
}

function loadActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeId: string | null;
  create: (name: string, color?: TabGroupColor, icon?: string) => string;
  update: (id: string, data: Partial<Workspace>) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  setActive: (id: string | null) => void;
}

function nid(): string {
  return `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const useWorkspaces = create<WorkspaceState>((set, get) => ({
  workspaces: loadWs(),
  activeId: loadActive(),
  create: (name, color = 'blue', icon = '💼') => {
    const id = nid();
    const ws: Workspace = {
      id,
      name: name.trim() || 'Workspace',
      color,
      icon,
      order: get().workspaces.length,
      createdAt: Date.now(),
    };
    const workspaces = [...get().workspaces, ws];
    localStorage.setItem(WS_KEY, JSON.stringify(workspaces));
    localStorage.setItem(ACTIVE_KEY, id);
    set({ workspaces, activeId: id });
    return id;
  },
  update: (id, data) => {
    const workspaces = get().workspaces.map((w) =>
      w.id === id ? { ...w, ...data } : w,
    );
    localStorage.setItem(WS_KEY, JSON.stringify(workspaces));
    set({ workspaces });
  },
  rename: (id, name) => {
    const workspaces = get().workspaces.map((w) =>
      w.id === id ? { ...w, name: name.trim() || w.name } : w,
    );
    localStorage.setItem(WS_KEY, JSON.stringify(workspaces));
    set({ workspaces });
  },
  remove: (id) => {
    const workspaces = get().workspaces.filter((w) => w.id !== id);
    const activeId = get().activeId === id ? null : get().activeId;
    localStorage.setItem(WS_KEY, JSON.stringify(workspaces));
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    else localStorage.removeItem(ACTIVE_KEY);
    set({ workspaces, activeId });
  },
  setActive: (id) => {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
    set({ activeId: id });
  },
}));
