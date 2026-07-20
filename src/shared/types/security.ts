// Güvenlik merkezi tipleri — Aşama 6.
//
// scan ve permission audit için sözleşme. LeakTestResult privacy.ts'de zaten
// tanımlı; burada security scan/audit tiplerini topluyoruz.

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

// Yerel "bilinen ihlal" kayıtları — AetherNode HIBP API'si olmadığı için
// statik bilgilendirme amaçlı. Aşama 6 sonrası dinamik bir feed eklenebilir.
export const KNOWN_BREACHES: BreachInfo[] = [
  {
    id: 'collection-1',
    title: 'Yaygın parola listeleri',
    summary:
      'AetherNode, kayıtlı parolalarınızı yerel olarak "Have I Been Pwned" benzeri popüler liste (top1k/top10k) ile karşılaştırır. Ağ çağrısı yapmaz.',
    severity: 'low',
  },
  {
    id: 'reused',
    title: 'Yeniden kullanım tespiti',
    summary:
      'Aynı parolanın birden fazla sitede kullanılıp kullanılmadığı yerel olarak işaretlenir.',
    severity: 'medium',
  },
];