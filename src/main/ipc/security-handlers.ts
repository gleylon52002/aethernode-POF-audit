import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { settingsRepo } from '@main/store';
import { isUnlocked } from '@main/services/vault';
import type {
  PermissionAuditEntry,
  SecurityFinding,
  SecurityScanResult,
  Severity,
} from '@shared/types/security';
import { KNOWN_BREACHES, type BreachInfo } from '@shared/types/security';

export function registerSecurityHandlers(): void {
  defineHandler({
    channel: IPC.security.scan,
    schema: noPayload,
    handle: (): SecurityScanResult => buildScan(),
  });

  defineHandler({
    channel: IPC.security.permissions,
    schema: noPayload,
    handle: (): PermissionAuditEntry[] => staticPermissionAudit(),
  });

  defineHandler({
    channel: IPC.security.breaches,
    schema: noPayload,
    handle: (): BreachInfo[] => KNOWN_BREACHES,
  });
}

function buildScan(): SecurityScanResult {
  const settings = settingsRepo.get();
  const findings: SecurityFinding[] = [];
  let score = 100;

  const p = settings.privacy;
  if (!p.fingerprint.enabled) {
    findings.push(
      find(
        'fp-off',
        'high',
        'Fingerprint koruması kapalı',
        'Canvas/WebGL/Audio fingerprint birleştirilerek izlenebilir.',
      ),
    );
    score -= 20;
  }
  if (!p.webrtc.enabled) {
    findings.push(
      find(
        'webrtc-off',
        'medium',
        'WebRTC koruması kapalı',
        'ICE adayları gerçek IP adresini ifşa edebilir.',
      ),
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
      find(
        'trackers-off',
        'low',
        'Tracker engelleme kapalı',
        'EasyList/EasyPrivacy listeleri uygulanmıyor.',
      ),
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
        'İndirme güvenlik taraması kapalı',
        'SHA-256 doğrulama etkin değil.',
      ),
    );
    score -= 5;
  }
  if (p.scriptBlocker?.enabled) {
    findings.push(
      find(
        'script-block',
        'info',
        'JavaScript engelleyici açık',
        'Saf HTML+CSS görünümü — bazı siteler çalışmayabilir.',
      ),
    );
  }
  if (p.bankMode?.enabled !== false) {
    findings.push(
      find(
        'bank-mode',
        'info',
        'Banka Modu hazır',
        'Finans sitelerinde otomatik izole güvenli alan etkin.',
      ),
    );
  }

  if (!isUnlocked()) {
    findings.push(
      find(
        'vault-locked',
        'info',
        'Şifre kasa kilitli',
        'Kasadaki parolalar erişilemez; gerektiğinde açın.',
      ),
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

function staticPermissionAudit(): PermissionAuditEntry[] {
  const origins = [
    'aethernode://dashboard',
    'aethernode://settings',
    'aethernode://privacy',
    'aethernode://security',
    'aethernode://network',
    'aethernode://passwords',
    'aethernode://notes',
    'aethernode://bookmarks',
    'aethernode://downloads',
  ];
  const perms = ['geolocation', 'notifications', 'camera', 'microphone', 'midi', 'usb'];
  return origins.map((origin) => ({
    origin,
    permissions: perms,
    denied: perms,
  }));
}
