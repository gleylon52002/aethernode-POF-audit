import { create } from 'zustand';

/** Site başına özel CSS/JS (Arc Boosts tarzı) — yalnızca yerel. */
export interface SiteBoost {
  host: string;
  css: string;
  js: string;
  enabled: boolean;
  updatedAt: number;
}

const KEY = 'aethernode.boosts';

function load(): SiteBoost[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SiteBoost[]) : [];
  } catch {
    return [];
  }
}

interface BoostsState {
  boosts: SiteBoost[];
  upsert: (boost: Omit<SiteBoost, 'updatedAt'>) => void;
  remove: (host: string) => void;
  getForHost: (host: string) => SiteBoost | undefined;
}

function normHost(h: string): string {
  return h.toLowerCase().replace(/^www\./, '').trim();
}

export const useBoosts = create<BoostsState>((set, get) => ({
  boosts: load(),
  upsert: (boost) => {
    const host = normHost(boost.host);
    const next: SiteBoost = { ...boost, host, updatedAt: Date.now() };
    const boosts = [...get().boosts.filter((b) => b.host !== host), next];
    localStorage.setItem(KEY, JSON.stringify(boosts));
    set({ boosts });
  },
  remove: (host) => {
    const h = normHost(host);
    const boosts = get().boosts.filter((b) => b.host !== h);
    localStorage.setItem(KEY, JSON.stringify(boosts));
    set({ boosts });
  },
  getForHost: (host) => {
    const h = normHost(host);
    return get().boosts.find((b) => b.host === h && b.enabled);
  },
}));
