import { create } from 'zustand';
import type {
  PermissionAuditEntry,
  SecurityScanResult,
  BreachInfo,
} from '@shared/types/security';
import type { LeakTestResult } from '@shared/types/privacy';

// Güvenlik merkezi mirror — Aşama 6.

interface SecurityState {
  scan: SecurityScanResult | null;
  leakResults: LeakTestResult[];
  permissions: PermissionAuditEntry[];
  breaches: BreachInfo[];
  runningLeak: boolean;
  load: () => Promise<void>;
  runScan: () => Promise<void>;
  runLeakTest: () => Promise<void>;
}

export const useSecurity = create<SecurityState>((set) => ({
  scan: null,
  leakResults: [],
  permissions: [],
  breaches: [],
  runningLeak: false,

  load: async () => {
    const [scanRes, permsRes, breachesRes] = await Promise.all([
      window.aether.security.scan(),
      window.aether.security.permissions(),
      window.aether.security.breaches(),
    ]);
    set({
      scan: scanRes.ok && scanRes.data ? (scanRes.data as SecurityScanResult) : null,
      permissions: permsRes.ok && permsRes.data ? (permsRes.data as PermissionAuditEntry[]) : [],
      breaches: breachesRes.ok && breachesRes.data ? (breachesRes.data as BreachInfo[]) : [],
    });
  },

  runScan: async () => {
    const res = await window.aether.security.scan();
    if (res.ok && res.data) set({ scan: res.data as SecurityScanResult });
  },

  runLeakTest: async () => {
    set({ runningLeak: true });
    const res = await window.aether.privacy.runLeakTest();
    set({
      leakResults: res.ok && res.data ? (res.data as LeakTestResult[]) : [],
      runningLeak: false,
    });
  },
}));