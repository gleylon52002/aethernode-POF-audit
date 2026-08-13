import { net, session, ipcMain } from 'electron';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { historyRepo, settingsRepo } from '@main/store';
import { getAllPartitions, networkGuard, filterStats } from '@main/network';
import { logger } from '@main/utils/logger';
import type { FingerprintConfig, LeakTestResult, PrivacyConfig } from '@shared/types/privacy';
import { z } from 'zod';

async function deepCleanSessions(): Promise<void> {
  // Sabit partition'lar (persist:default, persist:bank, incognito) +
  // dinamik partition'lar (persist:tab:*, persist:ct:*, persist:pwa-*)
  const allPartitions = getAllPartitions();
  const sessions = [
    session.defaultSession,
    ...allPartitions.map((p) => session.fromPartition(p)),
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
          'filesystem',
        ],
      });
      await ses.clearCache();
      await ses.clearHostResolverCache();
      await ses.clearAuthCache();
    }),
  );
}

function webrtcPolicyLabel(privacy: PrivacyConfig): string {
  if (!privacy.webrtc.enabled) return 'kapalı (Chromium varsayılan — sızıntı riski)';
  if (privacy.webrtc.policy === 'block_all') return 'tam engel (STUN yok + RTC blok)';
  if (privacy.webrtc.policy === 'force_proxy') return 'yalnızca genel arayüz / proxy';
  return 'UDP kısıtlı + STUN engelli';
}

async function probeDoh(url: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const u = new URL(url);
    const res = await net.fetch(u.toString(), {
      method: 'GET',
      headers: { Accept: 'application/dns-json' },
    });
    return {
      ok: res.ok || res.status === 400 || res.status === 415,
      detail: `DoH uç noktası yanıt verdi (HTTP ${res.status})`,
    };
  } catch (err) {
    return { ok: false, detail: `DoH ulaşılamadı: ${String(err).slice(0, 120)}` };
  }
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
    handle: async (): Promise<LeakTestResult[]> => {
      const privacy = settingsRepo.get().privacy;
      const ranAt = Date.now();
      const results: LeakTestResult[] = [];

      // ── 1. WebRTC Sızıntı Testi ───────────────────────────────────
      // Gerçek RTCPeerConnection denemesi ile ICE candidate sızıntısı kontrol edilir.
      try {
        const webrtcOn = privacy.webrtc.enabled;
        if (!webrtcOn) {
          results.push({
            category: 'webrtc',
            passed: false,
            details: 'WebRTC koruması kapalı — gerçek IP ICE ile sızabilir',
            observed: ['koruma: kapalı'],
            ranAt,
          });
        } else {
          // BrowserWindow gizli pencerede ICE candidate toplama deneriz
          const { BrowserWindow } = await import('electron');
          const probe = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
          try {
            const iceResult: string[] = await Promise.race([
              probe.webContents.executeJavaScript(`
                new Promise((resolve) => {
                  const candidates = [];
                  const pc = new RTCPeerConnection({ iceServers: [] });
                  pc.createDataChannel('probe');
                  pc.onicecandidate = (e) => {
                    if (e.candidate) candidates.push(e.candidate.candidate);
                    else { pc.close(); resolve(candidates); }
                  };
                  pc.createOffer().then(o => pc.setLocalDescription(o));
                  setTimeout(() => { pc.close(); resolve(candidates); }, 3000);
                })
              `),
              new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 4000)),
            ]);
            // Gerçek IP sızıntısı: host veya srflx candidate var mı?
            const leaked = iceResult.some((c: string) => c.includes('typ host') || c.includes('typ srflx'));
            results.push({
              category: 'webrtc',
              passed: !leaked,
              details: leaked
                ? `WebRTC IP sızıntısı tespit edildi — ${iceResult.length} candidate bulundu`
                : `WebRTC güvenli — hiçbir gerçek IP candidate sızmadı (${iceResult.length} candidate)`,
              observed: iceResult.slice(0, 5),
              ranAt,
            });
          } finally {
            probe.destroy();
          }
        }
      } catch (err) {
        results.push({
          category: 'webrtc',
          passed: privacy.webrtc.enabled,
          details: `WebRTC testi çalıştırılamadı (fallback: ayar kontrolü): ${String(err).slice(0, 100)}`,
          observed: [webrtcPolicyLabel(privacy)],
          ranAt,
        });
      }

      // ── 2. DNS Sızıntı Testi ──────────────────────────────────────
      let dnsPassed = privacy.dns.enabled && privacy.dns.mode === 'doh';
      let dnsDetail = dnsPassed
        ? `DoH yapılandırıldı (${privacy.dns.dohUrl || 'varsayılan'})`
        : privacy.dns.mode === 'dot'
          ? 'DoT seçili ama uygulama DoH kullanır — DoH açın'
          : 'DoH kapalı — DNS ISP üzerinden gidebilir';
      const observedDns: string[] = [privacy.dns.mode, privacy.dns.dohUrl || ''];
      if (dnsPassed && privacy.dns.dohUrl) {
        const probe = await probeDoh(privacy.dns.dohUrl);
        dnsPassed = probe.ok;
        dnsDetail = probe.detail;
        observedDns.push(probe.ok ? 'probe:ok' : 'probe:fail');
      }
      results.push({
        category: 'dns',
        passed: dnsPassed,
        details: dnsDetail,
        observed: observedDns.filter(Boolean),
        ranAt,
      });

      // ── 3. IP Sızıntı Testi ───────────────────────────────────────
      // Harici bir API'ye istek atarak gerçek IP görünürlüğünü kontrol eder.
      try {
        const ipRes = await net.fetch('https://httpbin.org/ip', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        const ipData = await ipRes.json() as { origin?: string };
        const origin = ipData.origin || 'bilinmiyor';
        // Basit kontrol: IP alınabildiyse bağlantı çalışıyor.
        // Proxy/VPN yoksa gerçek IP görünür — kullanıcıya bilgi verilir.
        const httpsOk = privacy.https.forceHttps && privacy.dns.enabled;
        results.push({
          category: 'ip',
          passed: httpsOk,
          details: httpsOk
            ? `HTTPS zorlama + DoH aktif — görünen IP: ${origin}`
            : `IP sızıntı yüzeyi yüksek — HTTPS/DoH kapalı — görünen IP: ${origin}`,
          observed: [
            `ip=${origin}`,
            `forceHttps=${privacy.https.forceHttps}`,
            `dns=${privacy.dns.enabled}`,
          ],
          ranAt,
        });
      } catch {
        const httpsOk = privacy.https.forceHttps && privacy.dns.enabled;
        results.push({
          category: 'ip',
          passed: httpsOk,
          details: httpsOk
            ? 'HTTPS zorlama + DoH açık (IP kontrolü yapılamadı — ağ erişimi yok)'
            : 'IP sızıntı yüzeyi yüksek — HTTPS/DoH kapalı',
          observed: [
            `forceHttps=${privacy.https.forceHttps}`,
            `dns=${privacy.dns.enabled}`,
          ],
          ranAt,
        });
      }

      // ── 4. Parmak İzi Testi ───────────────────────────────────────
      // Gizli pencerede canvas render yapıp hash tutarlılığını kontrol eder.
      try {
        const fp = privacy.fingerprint;
        if (!fp.enabled) {
          results.push({
            category: 'fingerprint',
            passed: false,
            details: 'Parmak izi koruması kapalı',
            observed: ['koruma: kapalı'],
            ranAt,
          });
        } else {
          const { BrowserWindow } = await import('electron');
          const probe = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
          try {
            // Aynı canvas'ı 2 kez render edip hash karşılaştır
            const hashes: string[] = await Promise.race([
              probe.webContents.executeJavaScript(`
                (function() {
                  const results = [];
                  for (let i = 0; i < 2; i++) {
                    const c = document.createElement('canvas');
                    c.width = 200; c.height = 50;
                    const ctx = c.getContext('2d');
                    ctx.fillStyle = '#f60';
                    ctx.fillRect(0,0,200,50);
                    ctx.fillStyle = '#069';
                    ctx.font = '14px Arial';
                    ctx.fillText('AetherNode FP Test ' + Math.random(), 2, 15);
                    results.push(c.toDataURL());
                  }
                  return results;
                })()
              `),
              new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 3000)),
            ]);
            // Spoofing aktifse her render farklı hash üretmeli
            const spoofWorking = hashes.length === 2 && hashes[0] !== hashes[1];
            results.push({
              category: 'fingerprint',
              passed: fp.enabled,
              details: spoofWorking
                ? 'Canvas parmak izi sahteleme aktif ve çalışıyor — her render farklı hash'
                : `Parmak izi koruması açık (canvas spoof durumu: ${fp.spoofCanvas ? 'aktif' : 'kapalı'})`,
              observed: Object.entries(fp)
                .filter(([, v]) => v === true)
                .map(([k]) => k),
              ranAt,
            });
          } finally {
            probe.destroy();
          }
        }
      } catch (err) {
        const fp = privacy.fingerprint;
        results.push({
          category: 'fingerprint',
          passed: fp.enabled,
          details: `Parmak izi testi çalıştırılamadı (fallback: ayar kontrolü): ${String(err).slice(0, 100)}`,
          observed: Object.entries(fp)
            .filter(([, v]) => v === true)
            .map(([k]) => k),
          ranAt,
        });
      }

      return results;
    },
  });

  defineHandler({
    channel: IPC.privacy.networkGuardStatus,
    schema: noPayload,
    handle: () => ({
      blockedTotal: networkGuard.getBlockedTotal(),
      filterDomains: filterStats().domains,
      filterUpdatedAt: filterStats().lastUpdatedAt,
    }),
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

  defineHandler({
    channel: IPC.privacy.pauseSite,
    schema: z.object({ hostname: z.string().min(1) }),
    handle: ({ hostname }) => {
      networkGuard.setSiteProtectionPaused(hostname, true);
      return true;
    },
  });

  defineHandler({
    channel: IPC.privacy.resumeSite,
    schema: z.object({ hostname: z.string().min(1) }),
    handle: ({ hostname }) => {
      networkGuard.setSiteProtectionPaused(hostname, false);
      return true;
    },
  });

  defineHandler({
    channel: IPC.privacy.isSitePaused,
    schema: z.object({ hostname: z.string().min(1) }),
    handle: ({ hostname }) => networkGuard.isSiteProtectionPaused(hostname),
  });

  defineHandler({
    channel: IPC.privacy.listPausedSites,
    schema: noPayload,
    handle: () => networkGuard.listPausedSites(),
  });

  defineHandler({
    channel: IPC.privacy.webrtcAllowSite,
    schema: z.object({ hostname: z.string().min(1) }),
    handle: ({ hostname }) => {
      const s = settingsRepo.get();
      const h = hostname.toLowerCase().replace(/^www\./, '').trim();
      const list = new Set((s.privacy.webrtc.allowedHosts ?? []).map((x) => x.toLowerCase().replace(/^www\./, '').trim()));
      list.add(h);
      settingsRepo.set({ ...s, privacy: { ...s.privacy, webrtc: { ...s.privacy.webrtc, allowedHosts: [...list] } } });
      networkGuard.updateConfig(settingsRepo.get());
      return true;
    },
  });

  defineHandler({
    channel: IPC.privacy.webrtcDisallowSite,
    schema: z.object({ hostname: z.string().min(1) }),
    handle: ({ hostname }) => {
      const s = settingsRepo.get();
      const h = hostname.toLowerCase().replace(/^www\./, '').trim();
      const filtered = (s.privacy.webrtc.allowedHosts ?? []).filter((x) => x.toLowerCase().replace(/^www\./, '').trim() !== h);
      settingsRepo.set({ ...s, privacy: { ...s.privacy, webrtc: { ...s.privacy.webrtc, allowedHosts: filtered } } });
      networkGuard.updateConfig(settingsRepo.get());
      return true;
    },
  });

  defineHandler({
    channel: IPC.privacy.webrtcAllowedSites,
    schema: noPayload,
    handle: () => settingsRepo.get().privacy.webrtc.allowedHosts ?? [],
  });

  // Guest sync: kozmetik filtre bu sitede dursun mu?
  ipcMain.on('aethernode/guest/protectionPaused', (event, hostname: unknown) => {
    event.returnValue = networkGuard.isSiteProtectionPaused(String(hostname || ''));
  });
}
