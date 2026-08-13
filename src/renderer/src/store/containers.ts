import { create } from 'zustand';
import type { SiteContainer, TabGroupColor } from '@shared/types/tabs';

const KEY = 'aethernode.containers';
const RULE_KEY = 'aethernode.container-rules';

function load(): SiteContainer[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SiteContainer[]) : [];
  } catch {
    return [];
  }
}

export interface ContainerRule {
  id: string;
  domain: string; // normalized, lower, without *.
  rawDomain: string; // as entered, e.g. *.example.com
  containerId: string;
}

function loadRules(): ContainerRule[] {
  try {
    const raw = localStorage.getItem(RULE_KEY);
    return raw ? (JSON.parse(raw) as ContainerRule[]) : [];
  } catch {
    return [];
  }
}

interface ContainerState {
  containers: SiteContainer[];
  rules: ContainerRule[];
  create: (name: string, color?: TabGroupColor) => string;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  addRule: (rawDomain: string, containerId: string) => string | null;
  removeRule: (id: string) => void;
}

function nid(): string {
  return `ct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function domainMatches(host: string, rule: ContainerRule): boolean {
  const h = host.toLowerCase().replace(/^www\./, '');
  const d = rule.domain.toLowerCase();
  if (h === d) return true;
  if (h.endsWith(`.${d}`)) return true;
  return false;
}

export function getContainerForHost(host: string, rules: ContainerRule[]): string | null {
  const h = host.toLowerCase();
  for (const r of rules) {
    if (domainMatches(h, r)) return r.containerId;
  }
  return null;
}

export const useContainers = create<ContainerState>((set, get) => ({
  containers: load(),
  rules: loadRules(),
  create: (name, color = 'purple') => {
    const id = nid();
    const c: SiteContainer = {
      id,
      name: name.trim() || 'Konteyner',
      color,
      createdAt: Date.now(),
    };
    const containers = [...get().containers, c];
    localStorage.setItem(KEY, JSON.stringify(containers));
    set({ containers });
    return id;
  },
  rename: (id, name) => {
    const containers = get().containers.map((c) =>
      c.id === id ? { ...c, name: name.trim() || c.name } : c,
    );
    localStorage.setItem(KEY, JSON.stringify(containers));
    set({ containers });
  },
  remove: (id) => {
    const containers = get().containers.filter((c) => c.id !== id);
    localStorage.setItem(KEY, JSON.stringify(containers));
    // also remove rules pointing to this container
    const rules = get().rules.filter((r) => r.containerId !== id);
    localStorage.setItem(RULE_KEY, JSON.stringify(rules));
    set({ containers, rules });
  },
  addRule: (rawDomain, containerId) => {
    const raw = rawDomain.trim().toLowerCase();
    if (!raw || !containerId) return null;
    let normalized = raw;
    if (normalized.startsWith('*.')) normalized = normalized.slice(2);
    normalized = normalized.replace(/^https?:\/\//, '').split('/')[0]!.replace(/^www\./, '');
    if (!normalized || !normalized.includes('.')) return null;
    if (get().rules.some((r) => r.domain === normalized && r.containerId === containerId)) return null;
    const id = `cr-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
    const rule: ContainerRule = { id, domain: normalized, rawDomain: raw, containerId };
    const rules = [...get().rules, rule];
    localStorage.setItem(RULE_KEY, JSON.stringify(rules));
    set({ rules });
    return id;
  },
  removeRule: (id) => {
    const rules = get().rules.filter((r) => r.id !== id);
    localStorage.setItem(RULE_KEY, JSON.stringify(rules));
    set({ rules });
  },
}));
