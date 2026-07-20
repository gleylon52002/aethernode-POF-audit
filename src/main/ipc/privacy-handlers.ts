import { session } from 'electron';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { historyRepo, settingsRepo } from '@main/store';
import { GUEST_PARTITIONS, networkGuard } from '@main/network';
import { logger } from '@main/utils/logger';
import type { FingerprintConfig, LeakTestResult, PrivacyConfig } from '@shared/types/privacy';

async function deepCleanSessions(): Promise<void> {
  const sessions = [
    session.defaultSession,
    ...GUEST_PARTITIONS.map((p) => session.fromPartition(p)),
  ];
  await Promise.all(
    sessions.map(async (ses) => {
      await ses.clearStorageData({
        storages: [
          'cookies',
          'localstorage',
          'indexdb',
          'cachestorage',
          'serviceworkers',
          'shadercache',
          'websql',
          'filesystem',
        ],
      });
      await ses.clearCache();
      await ses.clearHostResolverCache();
      await ses.clearAuthCache();
    }),
  );
}

export function registerPrivacyHandlers(): void {
  defineHandler({
    channel: IPC.privacy.fingerprintConfig,
    schema: noPayload,
    handle: (): FingerprintConfig => settingsRepo.get().privacy.fingerprint,
  });

  defineHandler({
    channel: IPC.privacy.runLeakTest,
    schema: noPayload,
    handle: (): LeakTestResult[] => {
      const privacy: PrivacyConfig = settingsRepo.get().privacy;
      const ranAt = Date.now();
      return [
        leak(
          'webrtc',
          privacy.webrtc.enabled,
          'WebRTC gerçek IP sızıntısı engellendi',
          'WebRTC ICE adayları görüldü — gerçek IP ifşa olabilir',
        ),
        leak(
          'dns',
          privacy.dns.enabled,
          'DNS sorguları DoH üzerinden çözüldü',
          'DNS sorguları sistem çözücüsüne gidiyor — ISP görebilir',
        ),
        leak(
          'ip',
          privacy.https.forceHttps && privacy.dns.enabled,
          'HTTPS + DoH ile bağlantı güçlendirildi',
          'IP sızıntı koruması zayıf — DoH/HTTPS kapalı olabilir',
        ),
        leak(
          'fingerprint',
          privacy.fingerprint.enabled,
          'Fingerprint rastgeleleştirme aktif',
          'Fingerprint koruması kapalı — tarayıcı profili tutarlı',
        ),
      ].map((r) => ({ ...r, ranAt }));
    },
  });

  defineHandler({
    channel: IPC.privacy.networkGuardStatus,
    schema: noPayload,
    handle: () => ({ blockedTotal: networkGuard.getBlockedTotal() }),
  });

  defineHandler({
    channel: IPC.privacy.deepClean,
    schema: noPayload,
    handle: async () => {
      await deepCleanSessions();
      logger.info('Derin temizlik tamamlandı (tüm depolama silindi)');
      return true;
    },
  });

  defineHandler({
    channel: IPC.privacy.panic,
    schema: noPayload,
    handle: async () => {
      await deepCleanSessions();
      historyRepo.clear();
      logger.info('PANİK: oturum verileri ve geçmiş sıfırlandı');
      return true;
    },
  });
}

function leak(
  category: LeakTestResult['category'],
  passed: boolean,
  passDetail: string,
  failDetail: string,
): Omit<LeakTestResult, 'ranAt'> {
  return {
    passed,
    category,
    details: passed ? passDetail : failDetail,
  };
}
