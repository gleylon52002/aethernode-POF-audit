import { app, safeStorage } from 'electron';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@main/utils/logger';

/** Eski sabit anahtar — yalnızca migrasyon için. */
export const LEGACY_DEVICE_KEY = 'aethernode-device-key';

const STORE_NAMES = ['settings', 'history', 'password-vault', 'secure-notes'] as const;

let cachedKey: string | null = null;

function secureDir(): string {
  const dir = join(app.getPath('userData'), 'secure-store');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function keyFilePath(): string {
  return join(secureDir(), '.device-key');
}

function migrateMarkerPath(): string {
  return join(secureDir(), '.key-v2');
}

function generateKey(): string {
  return randomBytes(32).toString('hex');
}

function persistKey(key: string): void {
  const path = keyFilePath();
  if (safeStorage.isEncryptionAvailable()) {
    const enc = safeStorage.encryptString(key);
    writeFileSync(path, enc);
  } else {
    // OS keychain yoksa rastgele anahtar yine dosyada tutulur (eski sabitten iyi).
    writeFileSync(path, Buffer.from(key, 'utf8'));
    logger.warn('safeStorage yok — cihaz anahtarı düz dosyada saklandı');
  }
}

function loadPersistedKey(): string | null {
  const path = keyFilePath();
  if (!existsSync(path)) return null;
  try {
    const buf = readFileSync(path);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(buf);
    }
    return buf.toString('utf8');
  } catch (err) {
    logger.warn('Cihaz anahtarı okunamadı, yenisi üretilecek', { err: String(err) });
    return null;
  }
}

/**
 * electron-store JSON dosyalarını eski anahtardan yeni anahtara taşır.
 * Şifre çözülemezse yedek alınıp taze store ile devam edilir.
 */
function migrateStoreFiles(newKey: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Store = require('electron-store') as typeof import('electron-store');
  const cwd = secureDir();

  for (const name of STORE_NAMES) {
    const file = join(cwd, `${name}.json`);
    if (!existsSync(file)) continue;
    const backup = join(cwd, `${name}.legacy.bak`);
    try {
      copyFileSync(file, backup);
    } catch {
      /* yoksay */
    }
    try {
      const legacy = new Store({
        name,
        cwd,
        encryptionKey: LEGACY_DEVICE_KEY,
        clearInvalidConfig: true,
      });
      const data = { ...legacy.store } as Record<string, unknown>;
      const next = new Store({
        name,
        cwd,
        encryptionKey: newKey,
        clearInvalidConfig: true,
      });
      next.clear();
      for (const [k, v] of Object.entries(data)) {
        next.set(k, v);
      }
      logger.info('Secure store taşındı', { name });
    } catch (err) {
      logger.warn('Secure store migrasyonu atlandı', { name, err: String(err) });
    }
  }
}

/**
 * Kurulum başına cihaz şifreleme anahtarı.
 * Electron safeStorage (DPAPI/Keychain) ile korunur; sabit fallback kaldırıldı.
 */
export function getDeviceEncryptionKey(): string {
  if (cachedKey) return cachedKey;
  if (process.env.AETHER_KEY) {
    cachedKey = process.env.AETHER_KEY;
    return cachedKey;
  }

  const existing = loadPersistedKey();
  if (existing) {
    cachedKey = existing;
    return cachedKey;
  }

  const key = generateKey();
  const cwd = secureDir();
  const hadLegacy =
    !existsSync(migrateMarkerPath()) &&
    STORE_NAMES.some((n) => existsSync(join(cwd, `${n}.json`)));

  if (hadLegacy) {
    migrateStoreFiles(key);
  }

  persistKey(key);
  try {
    writeFileSync(migrateMarkerPath(), String(Date.now()), 'utf8');
  } catch {
    /* yoksay */
  }
  cachedKey = key;
  logger.info('Yeni cihaz şifreleme anahtarı oluşturuldu', {
    safeStorage: safeStorage.isEncryptionAvailable(),
    migrated: hadLegacy,
  });
  return cachedKey;
}
