// Tüm kullanıcı ayarlarının şeması — main process secure store'da saklanır.
import type { PrivacyConfig } from './privacy';
import type { SearchEngine, UserAgentId } from '../constants/app';

export type TabLayout = 'vertical' | 'horizontal';
export type ThemeMode = 'dark'; // v1 yalnızca dark mode
export type AccentTheme = 'purple' | 'green' | 'amber' | 'red';

/** Ayar şema sürümü — tek seferlik migrasyonlar için artırılır. */
export const SETTINGS_SCHEMA_REVISION = 9;

export interface AppSettings {
  /** Dahili: migrasyon sürümü (kullanıcıya gösterilmez) */
  schemaRevision?: number;
  general: {
    defaultSearchEngine: SearchEngine;
    tabLayout: TabLayout;
    /** Dikey sekme paneli genişliği (px) */
    tabBarWidth: number;
    startupPage: 'dashboard' | 'blank' | 'lastSession';
    memorySaver: boolean;
    doNotTrack: boolean;
    userAgent: UserAgentId;
    /** Siteleri zorla koyu temaya çevir */
    forceDarkMode: boolean;
    /** Sağ tık + sürükle fare hareketleri */
    mouseGestures: boolean;
    /** Boşta kalan sekmeleri arşivle */
    autoArchiveTabs: boolean;
    /** Dakika cinsinden boşta kalma eşiği */
    autoArchiveMinutes: number;
    /** Kaynak sınırlayıcı (arka plan kısıtlama) */
    resourceLimiter: boolean;
    /** Hedef kaynak yüzdesi (50–100) */
    resourceLimitPercent: number;
    /** Çeviri hedef dili (ISO 639-1) */
    translateTarget: string;
    /** Seçim çevirisi balonu */
    selectionTranslate: boolean;
    /** Ağaç stili dikey sekmeler */
    treeTabs: boolean;
    /** Yer imleri çubuğu görünür mü */
    bookmarksBarVisible: boolean;
    /** Sabit duvar kağıdı indeksi (null = rastgele) */
    pinnedWallpaper: number | null;
    accentTheme: AccentTheme;
    /** Ambient Webflow (Ambilight) sinematik çerçeve ışığı */
    ambientWebflow: boolean;
    /** UI ses efektleri açık mı (varsayılan kapalı) */
    soundEffectsEnabled: boolean;
    /** UI ses seviyesi 0-1 */
    soundEffectsVolume: number;
    /** Senkron klasör yolu (şifreli .anb izleme) */
    syncFolder?: string;
    hasSeenWelcomeTour: boolean;
    hasSeenWelcomeScreen: boolean;
    hasSeenUpdate: boolean;
    bookmarkSuggestionDismissedAt?: string;
    dailySummaryDismissedDate?: string;
    dashboardStatsOrder: string[];
    dashboardStatsHidden: string[];
  };
  performance: {
    /** Ağ limiti etkin mi */
    networkLimitEnabled: boolean;
    /** İndirme hızı limiti (Mbps, 0 = sınırsız) */
    networkDownloadMbps: number;
    /** Yükleme hızı limiti (Mbps, 0 = sınırsız) */
    networkUploadMbps: number;
    /** Ek gecikme (ms) */
    networkLatencyMs: number;
    /** CPU limiti etkin mi */
    cpuLimitEnabled: boolean;
    /** CPU kullanım yüzdesi limiti (0-100) */
    cpuLimitPercent: number;
    /** Bellek limiti etkin mi */
    memoryLimitEnabled: boolean;
    /** Bellek limiti stratejisi */
    memoryLimitMode: 'soft' | 'hard';
    /** Bellek limiti (MB) */
    memoryLimitMb: number;
  };
  privacy: PrivacyConfig;
  cleanup: {
    onExit: {
      history: boolean;
      cache: boolean;
      cookies: boolean;
      clipboard: boolean;
      storage: boolean;
      session: boolean;
      tempFiles: boolean;
    };
  };
  security: {
    blockMaliciousDownloads: boolean;
    verifySha256: boolean;
    virusTotalApiKey?: string;
    /** İndirme sonrası VT taramasını öner */
    virusTotalPrompt: boolean;
    /** Kasa idle auto-lock (dk), 0 = kapalı */
    vaultAutoLockMinutes: number;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  schemaRevision: SETTINGS_SCHEMA_REVISION,
  general: {
    defaultSearchEngine: 'duckduckgo',
    tabLayout: 'horizontal',
    tabBarWidth: 240,
    startupPage: 'dashboard',
    memorySaver: false,
    doNotTrack: true,
    userAgent: 'chrome-windows',
    forceDarkMode: false,
    mouseGestures: true,
    autoArchiveTabs: true,
    autoArchiveMinutes: 60,
    resourceLimiter: false,
    resourceLimitPercent: 70,
    translateTarget: 'tr',
    selectionTranslate: true,
    treeTabs: true,
    bookmarksBarVisible: true,
    pinnedWallpaper: null,
    accentTheme: 'purple',
    ambientWebflow: true,
    soundEffectsEnabled: false,
    soundEffectsVolume: 0.3,
    hasSeenWelcomeTour: false,
    hasSeenWelcomeScreen: false,
    hasSeenUpdate: true,
    dashboardStatsOrder: ['blocked', 'protection', 'tabs', 'bookmarks'],
    dashboardStatsHidden: [],
  },
  performance: {
    networkLimitEnabled: false,
    networkDownloadMbps: 0,
    networkUploadMbps: 0,
    networkLatencyMs: 0,
    cpuLimitEnabled: false,
    cpuLimitPercent: 80,
    memoryLimitEnabled: false,
    memoryLimitMode: 'soft',
    memoryLimitMb: 2048,
  },
  privacy: {
    fingerprint: {
      enabled: true,
      mode: 'uniformity',
      spoofCanvas: true,
      canvasFarbling: true,
      letterboxing: true,
      spoofWebGL: true,
      spoofAudio: true,
      spoofFonts: true,
      spoofNavigator: true,
      spoofTimezone: true,
      spoofLanguage: false,
      spoofPlugins: true,
      spoofHardware: true,
      spoofScreen: true,
      spoofUserAgent: true,
      randomProfilePerSession: true,
    },
    webrtc: {
      enabled: true,
      policy: 'block_all',
      allowedHosts: [],
    },
    dns: {
      enabled: true,
      mode: 'doh',
      dohUrl: 'https://mozilla.cloudflare-dns.com/dns-query',
      blockThirdParty: true,
    },
    https: {
      enabled: true,
      forceHttps: true,
      blockMixedContent: true,
      hstsPreload: true,
      warnOnInvalidCert: true,
    },
    trackers: {
      enabled: true,
      lists: ['easylist', 'easyprivacy', 'duckduckgo-tracker-radar'],
      customRules: [],
    },
    cookies: {
      blockThirdParty: true,
      isolateFirstParty: true,
      autoDeleteOnExit: false,
      perTabIsolation: true,
    },
    urlCleaner: {
      enabled: true,
    },
    cookieBanner: {
      autoReject: true,
    },
    scriptBlocker: {
      enabled: false,
    },
    bankMode: {
      enabled: true,
    },
  },
  cleanup: {
    onExit: {
      history: false,
      cache: false,
      cookies: false,
      clipboard: true,
      storage: false,
      session: false,
      tempFiles: true,
    },
  },
  security: {
    blockMaliciousDownloads: true,
    verifySha256: true,
    virusTotalPrompt: true,
    vaultAutoLockMinutes: 5,
  },
};
