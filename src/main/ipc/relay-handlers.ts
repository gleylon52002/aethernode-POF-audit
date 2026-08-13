import { clipboard } from 'electron';
import { createHmac, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { defineHandler } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { SecureStore } from '@main/store/secure-store';
import { getDeviceEncryptionKey } from '@main/services/device-key';

// Zaman sınırlı / tek kullanımlık oturum linkleri — SUNUCUSUZ (B modeli).
//
// Süre ve kullanım sayısı linkin kendisine imzalı token olarak gömülür;
// açan taraftaki AetherNode süreyi/kullanımı YEREL olarak denetler.
// Hiçbir sunucuya hiçbir veri gitmez (sıfır telemetri ilkesiyle tam uyum).
//
// Dürüstlük notu: değiştirilmiş bir istemci bu kontrolü atlayabilir —
// garantili tek-kullanım için merkezi state gerekir (bilinçli olarak yok).
// İmza cihaz anahtarıyla atılır; farklı cihazda imza doğrulanamayacağı için
// yalnızca payload'daki süre/kullanım kuralları uygulanır.

interface RelayTokenPayload {
  id: string;
  url: string;
  createdAt: number;
  expiresAt: number;
  maxUses: number; // 0 = sınırsız (yalnızca süreyle sınırlı)
}

interface RelayUsageRecord {
  usage: Record<string, number>;
}

let usageStoreRef: SecureStore<RelayUsageRecord> | null = null;

function usageStore(): SecureStore<RelayUsageRecord> {
  if (!usageStoreRef) {
    usageStoreRef = new SecureStore<RelayUsageRecord>({
      name: 'relay-usage',
      encryptionKey: getDeviceEncryptionKey(),
      defaults: { usage: {} },
    });
  }
  return usageStoreRef;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function sign(data: string): string {
  return b64url(createHmac('sha256', getDeviceEncryptionKey()).update(data).digest());
}

export function createRelayToken(url: string, ttlMs: number, maxUses: number): string {
  const payload: RelayTokenPayload = {
    id: randomBytes(8).toString('hex'),
    url,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    maxUses,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `aethernode://relay/${body}.${sign(body)}`;
}

export interface RelayResolveResult {
  valid: boolean;
  url?: string;
  reason?: 'expired' | 'used' | 'malformed';
  expiresAt?: number;
  usesLeft?: number;
}

export function resolveRelayToken(token: string): RelayResolveResult {
  const raw = token.replace(/^aethernode:\/\/relay\/?/i, '');
  const dotIdx = raw.lastIndexOf('.');
  if (dotIdx < 1) return { valid: false, reason: 'malformed' };

  const body = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  if (!body || !sig) return { valid: false, reason: 'malformed' };

  // HMAC imza doğrulaması — token'ın değiştirilmediğini garanti eder
  const expectedSig = sign(body);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { timingSafeEqual } = require('node:crypto') as typeof import('node:crypto');
    const sigBuf = Buffer.from(sig, 'base64url');
    const expectedBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, reason: 'malformed' };
    }
  } catch {
    // timingSafeEqual fallback: sabit zaman karşılaştırma başarısızsa string karşılaştır
    if (sig !== expectedSig) return { valid: false, reason: 'malformed' };
  }

  let payload: RelayTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as RelayTokenPayload;
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  if (!payload?.url || !/^https?:\/\//i.test(payload.url) || !payload.expiresAt) {
    return { valid: false, reason: 'malformed' };
  }
  if (Date.now() > payload.expiresAt) {
    return { valid: false, reason: 'expired', expiresAt: payload.expiresAt };
  }

  if (payload.maxUses > 0) {
    const usage = usageStore().get('usage') ?? {};
    const used = usage[payload.id] ?? 0;
    if (used >= payload.maxUses) return { valid: false, reason: 'used' };
    usage[payload.id] = used + 1;
    // Süresi dolan eski kayıtları temizle (store şişmesin)
    usageStore().set('usage', usage);
    return {
      valid: true,
      url: payload.url,
      expiresAt: payload.expiresAt,
      usesLeft: payload.maxUses - used - 1,
    };
  }

  return { valid: true, url: payload.url, expiresAt: payload.expiresAt };
}

export function registerRelayHandlers(): void {
  defineHandler({
    channel: IPC.relay.create,
    schema: z.object({
      url: z.string().url().max(4096),
      ttlMs: z
        .number()
        .int()
        .min(60_000)
        .max(7 * 24 * 3600_000),
      maxUses: z.number().int().min(0).max(100),
      copyToClipboard: z.boolean().optional(),
    }),
    handle: ({ url, ttlMs, maxUses, copyToClipboard }) => {
      if (!/^https?:\/\//i.test(url)) throw new Error('Yalnızca http(s) sayfaları paylaşılabilir');
      const token = createRelayToken(url, ttlMs, maxUses);
      if (copyToClipboard !== false) clipboard.writeText(token);
      return { token };
    },
  });

  defineHandler({
    channel: IPC.relay.resolve,
    schema: z.object({ token: z.string().min(8).max(8192) }),
    handle: ({ token }) => resolveRelayToken(token),
  });
}
