import { createCipheriv, createDecipheriv, randomBytes, pbkdf2, pbkdf2Sync } from 'node:crypto';
import { CRYPTO } from '@shared/constants/app';

// Şifreleme servisi — AES-256-GCM + KDF (PBKDF2 legacy, Argon2id yeni).
//
// v1: PBKDF2-SHA512 (310k iter) — geriye dönük uyumluluk için okunur, yeni yazılmaz.
// v2: Argon2id (19MiB, t=3, p=1) — yeni mühürler için kullanılır, async.
// Her iki format da openWithPassword* ile açılabilir (versiyon alanına göre dallanma).

export interface SealedPayload {
  v: 1 | 2;
  alg: 'aes-256-gcm';
  kdf: 'pbkdf2-sha512' | 'argon2id';
  iter?: number; // v1
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64 + auth tag
  /** Argon2id parametreleri (v2) */
  mCost?: number;
  tCost?: number;
  p?: number;
}

function b64(buf: Buffer): string {
  return buf.toString('base64');
}
function ub64(str: string): Buffer {
  return Buffer.from(str, 'base64');
}

function pbkdf2Async(password: string, salt: Buffer, iter: number, keyLen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, iter, keyLen, 'sha512', (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

let argon2Cache: typeof import('argon2') | null | undefined;
async function getArgon2Async(): Promise<typeof import('argon2') | null> {
  if (argon2Cache !== undefined) return argon2Cache;
  try {
    const mod = await import('argon2');
    argon2Cache = (mod.default ?? mod) as unknown as typeof import('argon2');
    return argon2Cache;
  } catch {
    argon2Cache = null;
    return null;
  }
}

/** Sync legacy mühür — yalnızca geriye dönük uyumluluk testleri için. Yeni kod sealWithPasswordAsync kullanmalı. */
export function sealWithPassword(plaintext: string, password: string): SealedPayload {
  const salt = randomBytes(CRYPTO.pbkdf2.saltBytes);
  const iv = randomBytes(CRYPTO.ivBytes);
  const key = pbkdf2Sync(
    password,
    salt,
    CRYPTO.pbkdf2.iterations,
    CRYPTO.keyBits / 8,
    'sha512',
  );
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    alg: 'aes-256-gcm',
    kdf: 'pbkdf2-sha512',
    iter: CRYPTO.pbkdf2.iterations,
    salt: b64(salt),
    iv: b64(iv),
    ct: b64(Buffer.concat([ct, tag])),
  };
}

export function openWithPassword(payload: SealedPayload, password: string): string {
  if (payload.alg !== 'aes-256-gcm') throw new Error('Desteklenmeyen şifreleme biçimi');
  if (payload.kdf === 'argon2id' || payload.v === 2) {
    throw new Error('Argon2id payload sync açılamaz — openWithPasswordAsync kullanın');
  }
  if (payload.kdf !== 'pbkdf2-sha512') throw new Error('Desteklenmeyen şifreleme biçimi');
  const salt = ub64(payload.salt);
  const iv = ub64(payload.iv);
  const blob = ub64(payload.ct);
  const tag = blob.subarray(blob.length - 16);
  const ct = blob.subarray(0, blob.length - 16);
  const key = pbkdf2Sync(password, salt, payload.iter!, CRYPTO.keyBits / 8, 'sha512');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

export async function sealWithPasswordAsync(plaintext: string, password: string): Promise<SealedPayload> {
  const salt = randomBytes(CRYPTO.pbkdf2.saltBytes);
  const iv = randomBytes(CRYPTO.ivBytes);
  const argon2 = await getArgon2Async();
  let key: Buffer;
  if (argon2) {
    try {
      key = (await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: CRYPTO.argon2.memoryCost,
        timeCost: CRYPTO.argon2.timeCost,
        parallelism: CRYPTO.argon2.parallelism,
        hashLength: CRYPTO.keyBits / 8,
        raw: true,
        salt,
      })) as Buffer;
    } catch {
      key = await pbkdf2Async(password, salt, CRYPTO.pbkdf2.iterations, CRYPTO.keyBits / 8);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return {
        v: 1,
        alg: 'aes-256-gcm',
        kdf: 'pbkdf2-sha512',
        iter: CRYPTO.pbkdf2.iterations,
        salt: b64(salt),
        iv: b64(iv),
        ct: b64(Buffer.concat([ct, tag])),
      };
    }
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      v: 2,
      alg: 'aes-256-gcm',
      kdf: 'argon2id',
      salt: b64(salt),
      iv: b64(iv),
      ct: b64(Buffer.concat([ct, tag])),
      mCost: CRYPTO.argon2.memoryCost,
      tCost: CRYPTO.argon2.timeCost,
      p: CRYPTO.argon2.parallelism,
    };
  }
  key = await pbkdf2Async(password, salt, CRYPTO.pbkdf2.iterations, CRYPTO.keyBits / 8);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    alg: 'aes-256-gcm',
    kdf: 'pbkdf2-sha512',
    iter: CRYPTO.pbkdf2.iterations,
    salt: b64(salt),
    iv: b64(iv),
    ct: b64(Buffer.concat([ct, tag])),
  };
}

export async function openWithPasswordAsync(payload: SealedPayload, password: string): Promise<string> {
  if (payload.alg !== 'aes-256-gcm') throw new Error('Desteklenmeyen şifreleme biçimi');
  const salt = ub64(payload.salt);
  const iv = ub64(payload.iv);
  const blob = ub64(payload.ct);
  const tag = blob.subarray(blob.length - 16);
  const ct = blob.subarray(0, blob.length - 16);
  let key: Buffer;
  if (payload.kdf === 'argon2id' || payload.v === 2) {
    const argon2 = await getArgon2Async();
    if (!argon2) throw new Error('Argon2id payload açılamaz — argon2 modülü yok');
    key = (await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: payload.mCost ?? CRYPTO.argon2.memoryCost,
      timeCost: payload.tCost ?? CRYPTO.argon2.timeCost,
      parallelism: payload.p ?? CRYPTO.argon2.parallelism,
      hashLength: CRYPTO.keyBits / 8,
      raw: true,
      salt,
    })) as Buffer;
  } else if (payload.kdf === 'pbkdf2-sha512') {
    key = await pbkdf2Async(password, salt, payload.iter ?? CRYPTO.pbkdf2.iterations, CRYPTO.keyBits / 8);
  } else {
    throw new Error('Desteklenmeyen şifreleme biçimi');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

export function randomId(byteLen = 16): string {
  return randomBytes(byteLen).toString('hex');
}