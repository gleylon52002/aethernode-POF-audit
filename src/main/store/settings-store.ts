import { SecureStore } from './secure-store';
import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_REVISION,
  type AppSettings,
} from '@shared/types/settings';
import { getDeviceEncryptionKey } from '@main/services/device-key';

// Uygulama ayarları deposu — genel tür ayarlar burada tutulur.
// Lazy init: cihaz anahtarı app ready sonrası üretilir.

let settingsStore: SecureStore<AppSettings> | null = null;

function store(): SecureStore<AppSettings> {
  if (!settingsStore) {
    settingsStore = new SecureStore<AppSettings>({
      name: 'settings',
      encryptionKey: getDeviceEncryptionKey(),
      defaults: DEFAULT_SETTINGS,
      schema: {
        general: { type: 'object' },
        performance: { type: 'object' },
        privacy: { type: 'object' },
        cleanup: { type: 'object' },
        security: { type: 'object' },
        schemaRevision: { type: 'number' },
      },
    });
  }
  return settingsStore;
}

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
  // Eski anahtarları temizle (artık şemada olmayanlar)
  for (const k of Object.keys(out)) {
    if (!(k in (defaults as Record<string, unknown>))) delete out[k];
  }
  return out as T;
}

/**
 * Tek seferlik migrasyonlar.
 * v2–3: WebRTC + uniformity fingerprint
 * v5: vaultAutoLockMinutes + webrtc.allowedHosts
 * v8: eski veri temizliği + dashboardStats
 * v9: hasSeenWelcomeScreen
 */
function migrateSettings(merged: AppSettings): { settings: AppSettings; dirty: boolean } {
  const rev = merged.schemaRevision ?? 0;
  if (rev >= SETTINGS_SCHEMA_REVISION) {
    return { settings: merged, dirty: false };
  }

  const next: AppSettings = {
    ...merged,
    schemaRevision: SETTINGS_SCHEMA_REVISION,
    general: {
      ...merged.general,
      accentTheme: (merged.general as { accentTheme?: unknown })?.accentTheme as AppSettings['general']['accentTheme'] ?? DEFAULT_SETTINGS.general.accentTheme,
      hasSeenWelcomeTour: (merged.general as { hasSeenWelcomeTour?: unknown })?.hasSeenWelcomeTour as boolean ?? false,
      hasSeenWelcomeScreen: (merged.general as { hasSeenWelcomeScreen?: unknown })?.hasSeenWelcomeScreen as boolean ?? false,
      hasSeenUpdate: (merged.general as { hasSeenUpdate?: unknown })?.hasSeenUpdate as boolean ?? true,
      bookmarkSuggestionDismissedAt: (merged.general as { bookmarkSuggestionDismissedAt?: unknown })?.bookmarkSuggestionDismissedAt as string | undefined ?? undefined,
      dailySummaryDismissedDate: (merged.general as { dailySummaryDismissedDate?: unknown })?.dailySummaryDismissedDate as string | undefined ?? undefined,
      dashboardStatsOrder: (merged.general as { dashboardStatsOrder?: unknown })?.dashboardStatsOrder as string[] ?? DEFAULT_SETTINGS.general.dashboardStatsOrder,
      dashboardStatsHidden: (merged.general as { dashboardStatsHidden?: unknown })?.dashboardStatsHidden as string[] ?? [],
    },
    privacy: {
      ...merged.privacy,
      webrtc: {
        ...merged.privacy.webrtc,
        allowedHosts: (merged.privacy.webrtc as { allowedHosts?: string[] })?.allowedHosts ?? [],
      },
      fingerprint: {
        ...merged.privacy.fingerprint,
        enabled: true,
        mode: merged.privacy.fingerprint.mode ?? 'uniformity',
        randomProfilePerSession:
          rev < 4 ? true : merged.privacy.fingerprint.randomProfilePerSession,
      },
    },
    security: {
      ...merged.security,
      vaultAutoLockMinutes:
        typeof (merged.security as { vaultAutoLockMinutes?: unknown })?.vaultAutoLockMinutes === 'number'
          ? (merged.security as { vaultAutoLockMinutes: number }).vaultAutoLockMinutes
          : DEFAULT_SETTINGS.security.vaultAutoLockMinutes,
    },
  };
  return { settings: next, dirty: true };
}

export const settingsRepo = {
  get: (): AppSettings => {
    const merged = deepMergeDefaults(DEFAULT_SETTINGS, store().all());
    const { settings, dirty } = migrateSettings(merged);
    if (dirty) {
      for (const [k, v] of Object.entries(settings)) {
        store().set(k as keyof AppSettings, v as AppSettings[keyof AppSettings]);
      }
    }
    return settings;
  },
  set: (next: AppSettings) => {
    const withRev: AppSettings = {
      ...next,
      schemaRevision: next.schemaRevision ?? SETTINGS_SCHEMA_REVISION,
    };
    for (const [k, v] of Object.entries(withRev)) {
      store().set(k as keyof AppSettings, v as AppSettings[keyof AppSettings]);
    }
  },
  reset: () => store().reset(),
};
