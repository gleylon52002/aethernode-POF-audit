import { SecureStore } from './secure-store';
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types/settings';

// Uygulama ayarları deposu — genel tür ayarlar burada tutulur.
// Şifre ve hassas notlar crypto-service üzerinden ayrıca şifrelenir.
const KEY = process.env.AETHER_KEY ?? 'aethernode-device-key';

const settingsStore = new SecureStore<AppSettings>({
  name: 'settings',
  encryptionKey: KEY,
  defaults: DEFAULT_SETTINGS,
  // Şema kasıtlı olarak serbest: yapısal tip güvenliği ts tipinden (AppSettings)
  // korunur. Kalıcılık + şifreleme bu katmanın sorumluluğu; yapısal doğrulama
  // uygulama giriş noktalarında Zod ile yapılır.
  schema: {
    general: { type: 'object' },
    privacy: { type: 'object' },
    cleanup: { type: 'object' },
    security: { type: 'object' },
    telemetry: { type: 'object' },
  },
});

// Sürüm yükseltmelerinde eski kayıtlarda bulunmayan yeni ayar alanları
// (ör. privacy.urlCleaner) DEFAULT_SETTINGS'ten tamamlanır.
function deepMergeDefaults<T>(defaults: T, stored: unknown): T {
  if (stored === undefined || stored === null) return defaults;
  if (
    typeof defaults !== 'object' ||
    defaults === null ||
    Array.isArray(defaults) ||
    typeof stored !== 'object' ||
    Array.isArray(stored)
  ) {
    return stored as T;
  }
  const out: Record<string, unknown> = { ...(stored as Record<string, unknown>) };
  for (const [k, dv] of Object.entries(defaults as Record<string, unknown>)) {
    out[k] = deepMergeDefaults(dv, (stored as Record<string, unknown>)[k]);
  }
  return out as T;
}

export const settingsRepo = {
  get: (): AppSettings => deepMergeDefaults(DEFAULT_SETTINGS, settingsStore.all()),
  set: (next: AppSettings) => {
    for (const [k, v] of Object.entries(next)) {
      settingsStore.set(k as keyof AppSettings, v);
    }
  },
  reset: () => settingsStore.reset(),
};