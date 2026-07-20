import { create } from 'zustand';

// Ağ paneli mirror — Aşama 6.
//
// Yakalanan istekler canlı akarken UI taşmasını önlemek için son 500 kayıt
// tutulur. enable/disable çağrıları guard'ı açar/kapar.

export interface CapturedRequest {
  id: string;
  url: string;
  method: string;
  resourceType: string;
  at: number;
}

export interface BlockedRequest {
  url: string;
  host: string;
  resourceType: string;
  totalBlocked: number;
  at: number;
}

const CAP = 500;

interface NetworkState {
  requests: CapturedRequest[];
  enabled: boolean;
  blockedTotal: number;
  recentBlocked: BlockedRequest[];
  load: () => Promise<void>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  push: (req: CapturedRequest) => void;
  clear: () => void;
  subscribeCaptured: () => () => void;
  subscribeBlocked: () => () => void;
}

export const useNetwork = create<NetworkState>((set, get) => ({
  requests: [],
  enabled: false,
  blockedTotal: 0,
  recentBlocked: [],

  load: async () => {
    set({ requests: [] });
    // Engellenen istek sayacı main'de yaşar — açılışta senkronize et.
    const res = await window.aether.privacy.guardStatus();
    if (res.ok && res.data) set({ blockedTotal: res.data.blockedTotal });
  },

  enable: async () => {
    await window.aether.network.enableInspector();
    set({ enabled: true });
  },

  disable: async () => {
    await window.aether.network.disableInspector();
    set({ enabled: false, requests: [] });
  },

  push: (req) => {
    set((s) => {
      const next = [req, ...s.requests];
      if (next.length > CAP) next.length = CAP;
      return { requests: next };
    });
  },

  clear: () => set({ requests: [] }),

  subscribeCaptured: () => {
    return window.aether.network.onCaptured((raw) => {
      const req = raw as CapturedRequest;
      if (req && typeof req.url === 'string') get().push(req);
    });
  },

  subscribeBlocked: () => {
    return window.aether.network.onBlocked((raw) => {
      const blocked = raw as BlockedRequest;
      if (!blocked || typeof blocked.url !== 'string') return;
      set((s) => {
        const recent = [blocked, ...s.recentBlocked];
        if (recent.length > 50) recent.length = 50;
        return { blockedTotal: blocked.totalBlocked, recentBlocked: recent };
      });
    });
  },
}));