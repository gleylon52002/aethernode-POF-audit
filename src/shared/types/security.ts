// Güvenlik merkezi tipleri.

export type Severity = 'info' | 'low' | 'medium' | 'high';

export interface SecurityFinding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

export interface SecurityScanResult {
  /** 0-100 koruma skoru (yüksek = daha iyi). */
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  findings: SecurityFinding[];
  ranAt: number; // epoch ms
}

export interface PermissionAuditEntry {
  origin: string;
  permissions: string[];
  denied: string[];
}

export interface BreachInfo {
  id: string;
  title: string;
  summary: string;
  severity: Severity;
  reference?: string;
}

/** Geriye dönük sabit; runtime tarama security-handlers.localBreachHints kullanır. */
export const KNOWN_BREACHES: BreachInfo[] = [
  {
    id: 'local-check',
    title: 'Yerel parola kontrolü',
    summary:
      'Parolalar dışarıya gönderilmez. Kasa açıkken yaygın parola ve yeniden kullanım yerelde taranır.',
    severity: 'info',
  },
];
