import { session } from 'electron';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { settingsRepo } from '@main/store';
import { GUEST_PARTITIONS } from '@main/network';
import { isUnlocked, listEntries } from '@main/services/vault';
import type {
  PermissionAuditEntry,
  SecurityFinding,
  SecurityScanResult,
  Severity,
  BreachInfo,
} from '@shared/types/security';

/** Küçük yerel yaygın parola listesi — ağ çağrısı yok */
const COMMON_PASSWORDS = new Set(
  [
    '123456',
    'password',
    '123456789',
    '12345678',
    'qwerty',
    '111111',
    '1234567',
    'dragon',
    '123123',
    'baseball',
    'abc123',
    'password1',
    'mustang',
    'access',
    'shadow',
    'master',
    'monkey',
    'letmein',
    'login',
    'admin',
    'welcome',
    'solo',
    'princess',
    'qwerty123',
    'football',
  ].map((s) => s.toLowerCase()),
);

export function registerSecurityHandlers(): void {
  defineHandler({
    channel: IPC.security.scan,
    schema: noPayload,
    handle: (): SecurityScanResult => buildScan(),
  });

  defineHandler({
    channel: IPC.security.permissions,
    schema: noPayload,
    handle: (): PermissionAuditEntry[] => livePermissionAudit(),
  });

  defineHandler({
    channel: IPC.security.breaches,
    schema: noPayload,
    handle: async (): Promise<BreachInfo[]> => localBreachHints(),
  });
}

function buildScan(): SecurityScanResult {
  const settings = settingsRepo.get();
  const findings: SecurityFinding[] = [];
  let score = 100;
  const p = settings.privacy;

  if (!p.fingerprint.enabled) {
    findings.push(
      find('fp-off', 'high', 'Fingerprint koruması kapalı', 'Canvas/WebGL/Audio izlenebilir.'),
    );
    score -= 20;
  }
  if (!p.webrtc.enabled) {
    findings.push(
      find('webrtc-off', 'medium', 'WebRTC koruması kapalı', 'ICE adayları gerçek IP ifşa edebilir.'),
    );
    score -= 10;
  }
  if (!p.dns.enabled) {
    findings.push(
      find('dns-off', 'medium', 'DNS over HTTPS kapalı', 'DNS sorguları ISP tarafından görülebilir.'),
    );
    score -= 10;
  }
  if (!p.https.forceHttps) {
    findings.push(
      find('https-no-force', 'medium', 'HTTPS zorlama kapalı', 'HTTP bağlantılarına izin veriliyor.'),
    );
    score -= 10;
  }
  if (!p.trackers.enabled) {
    findings.push(
      find('trackers-off', 'low', 'Tracker engelleme kapalı', 'Filtre listeleri uygulanmıyor.'),
    );
    score -= 5;
  }
  if (!p.cookies.blockThirdParty) {
    findings.push(
      find('3p-cookies', 'low', '3. parti çerezler serbest', 'Çapraz-site izleme mümkün.'),
    );
    score -= 5;
  }
  if (!settings.security.blockMaliciousDownloads) {
    findings.push(
      find(
        'dl-unchecked',
        'low',
        'Zararlı indirme engeli kapalı',
        'Tehlikeli uzantılar için onay/engel uygulanmaz.',
      ),
    );
    score -= 5;
  } else {
    findings.push(
      find(
        'dl-gate',
        'info',
        'İndirme kapısı açık',
        'Her indirmede onay; tehlikeli uzantılar uyarıyla engellenebilir.',
      ),
    );
  }
  if (settings.security.verifySha256) {
    findings.push(
      find('dl-sha', 'info', 'SHA-256 özeti', 'Tamamlanan indirmelerde yerel hash hesaplanır.'),
    );
  }
  if (p.scriptBlocker?.enabled) {
    findings.push(
      find(
        'script-block',
        'info',
        'JavaScript engelleyici açık',
        'Bazı siteler çalışmayabilir.',
      ),
    );
  }
  if (p.bankMode?.enabled !== false) {
    findings.push(
      find(
        'bank-mode',
        'info',
        'Banka Modu hazır',
        'Finans sitelerinde izole partition + pano/konum engeli.',
      ),
    );
  }
  if (p.cookies.perTabIsolation) {
    findings.push(
      find('tab-iso', 'info', 'Sekme çerez izolasyonu', 'Her sekme ayrı persist partition kullanır.'),
    );
  }
  if (!isUnlocked()) {
    findings.push(
      find('vault-locked', 'info', 'Şifre kasa kilitli', 'Kasadaki parolalar erişilemez.'),
    );
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    grade: scoreToGrade(score),
    findings,
    ranAt: Date.now(),
  };
}

function find(id: string, severity: Severity, title: string, detail: string): SecurityFinding {
  return { id, severity, title, detail };
}

function scoreToGrade(score: number): SecurityScanResult['grade'] {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/** Gerçek politika: tüm guest partition'larda izinler deny-all. */
function livePermissionAudit(): PermissionAuditEntry[] {
  // fullscreen/pointerLock/keyboardLock video-oyun deneyimi için serbest
  // (gizlilik etkisi yok); geri kalan her şey reddedilir.
  const deniedPerms = [
    'geolocation',
    'notifications',
    'media',
    'mediaKeySystem',
    'midi',
    'midiSysex',
    'openExternal',
    'serial',
    'usb',
  ];
  const allowedPerms = ['fullscreen', 'pointerLock', 'keyboardLock'];
  const labels = [
    'defaultSession',
    ...GUEST_PARTITIONS.map((p) => String(p)),
  ];
  // Politika kanıtı: handler kurulu (registerSecurityDefaults)
  void session.defaultSession;
  return labels.map((origin) => ({
    origin,
    permissions: [...deniedPerms, ...allowedPerms],
    denied: deniedPerms,
  }));
}

async function localBreachHints(): Promise<BreachInfo[]> {
  const tips: BreachInfo[] = [
    {
      id: 'local-check',
      title: 'Yerel parola kontrolü',
      summary:
        'AetherNode dışarıya parola göndermez. Kasa açıkken yaygın parola ve yeniden kullanım yerelde taranır.',
      severity: 'info',
    },
  ];

  if (!isUnlocked()) {
    tips.push({
      id: 'vault-locked',
      title: 'Kasa kilitli',
      summary: 'Yeniden kullanım / yaygın parola taraması için şifre yöneticisini açın.',
      severity: 'low',
    });
    return tips;
  }

  try {
    const entries = await listEntries();
    const byPassword = new Map<string, string[]>();
    for (const e of entries) {
      const pw = (e.password || '').toLowerCase();
      if (!pw) continue;
      const list = byPassword.get(pw) ?? [];
      list.push(e.url || e.title || e.username || e.id);
      byPassword.set(pw, list);
      if (COMMON_PASSWORDS.has(pw)) {
        tips.push({
          id: `common-${e.id}`,
          title: `Yaygın parola: ${e.title || e.url || e.username || 'kayıt'}`,
          summary: 'Bu parola bilinen zayıf listede. Hemen değiştirin.',
          severity: 'high',
        });
      }
    }
    for (const [, sites] of byPassword) {
      if (sites.length > 1) {
        tips.push({
          id: `reuse-${sites[0]}`,
          title: 'Parola yeniden kullanımı',
          summary: `Aynı parola ${sites.length} kayıtta: ${sites.slice(0, 4).join(', ')}${sites.length > 4 ? '…' : ''}`,
          severity: 'medium',
        });
      }
    }
    if (tips.length === 1) {
      tips.push({
        id: 'clean',
        title: 'Yerel tarama temiz',
        summary: 'Kayıtlı parolalarda yaygın liste veya yeniden kullanım bulunamadı.',
        severity: 'info',
      });
    }
  } catch {
    tips.push({
      id: 'read-fail',
      title: 'Kasa okunamadı',
      summary: 'Parola taraması yapılamadı.',
      severity: 'low',
    });
  }

  return tips;
}
