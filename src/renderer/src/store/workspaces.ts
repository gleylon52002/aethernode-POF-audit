import { create } from 'zustand';
import type { Workspace, TabGroupColor } from '@shared/types/tabs';

const WS_KEY = 'aethernode.workspaces';
const ACTIVE_KEY = 'aethernode.workspace.active';

function loadWs(): Workspace[] {
  try {
    const raw = localStorage.getItem(WS_KEY);
    return raw ? (JSON.parse(raw) as Workspace[]) : [];
  } catch {
    return [];
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
  create: (name: string, color?: TabGroupColor) => string;
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
  create: (name, color = 'blue') => {
    const id = nid();
    const ws: Workspace = {
      id,
      name: name.trim() || 'Workspace',
      color,
      createdAt: Date.now(),
    };
    const workspaces = [...get().workspaces, ws];
    localStorage.setItem(WS_KEY, JSON.stringify(workspaces));
    localStorage.setItem(ACTIVE_KEY, id);
    set({ workspaces, activeId: id });
    return id;
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
