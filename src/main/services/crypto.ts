import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'node:crypto';
import { CRYPTO } from '@shared/constants/app';

// Şifreleme servisi — AES-256-GCM + PBKDF2.
//
// Hassas veri (şifre kasası, notlar) için tek oturum başına anahtar türetilir.
// Anahtar master-password + per-account salt'tan PBKDF2 ile çıkarılır.
// Bu servis ana depolama biçimini aşamalarda genişletebilecek şekilde
// serileştirilebilir payload üretir.

export interface SealedPayload {
  v: 1;
  alg: 'aes-256-gcm';
  kdf: 'pbkdf2-sha512';
  iter: number;
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64 + auth tag
}

function b64(buf: Buffer): string {
  return buf.toString('base64');
}
function ub64(str: string): Buffer {
  return Buffer.from(str, 'base64');
}

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
  if (payload.alg !== 'aes-256-gcm' || payload.kdf !== 'pbkdf2-sha512') {
    throw new Error('Desteklenmeyen şifreleme biçimi');
  }
  const salt = ub64(payload.salt);
  const iv = ub64(payload.iv);
  const blob = ub64(payload.ct);
  const tag = blob.subarray(blob.length - 16);
  const ct = blob.subarray(0, blob.length - 16);
  const key = pbkdf2Sync(password, salt, payload.iter, CRYPTO.keyBits / 8, 'sha512');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

export function randomId(byteLen = 16): string {
  return randomBytes(byteLen).toString('hex');
}