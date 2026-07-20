// Tüm kullanıcı ayarlarının şeması — main process secure store'da saklanır.
import type { PrivacyConfig } from './privacy';
import type { SearchEngine, UserAgentId } from '../constants/app';

export type TabLayout = 'vertical' | 'horizontal';
export type ThemeMode = 'dark'; // v1 yalnızca dark mode

export interface AppSettings {
  general: {
    defaultSearchEngine: SearchEngine;
    tabLayout: TabLayout;
    startupPage: 'dashboard' | 'blank' | 'lastSession';
    memorySaver: boolean;
    doNotTrack: boolean;
    userAgent: UserAgentId;
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
  };
  telemetry: {
    enabled: false; // Değiştirilemez — sızdırıcı telemetri yoktur.
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    defaultSearchEngine: 'duckduckgo',
    tabLayout: 'vertical',
    startupPage: 'dashboard',
    memorySaver: false,
    doNotTrack: true,
    userAgent: 'default',
  },
  privacy: {
    fingerprint: {
      enabled: true,
      spoofCanvas: true,
      spoofWebGL: true,
      spoofAudio: true,
      spoofFonts: true,
      spoofNavigator: true,
      spoofTimezone: true,
      spoofLanguage: false, // dil uyumu için varsayılan kapalı
      spoofPlugins: true,
      spoofHardware: true,
      spoofScreen: true,
      spoofUserAgent: true,
      randomProfilePerSession: true,
    },
    webrtc: {
      enabled: true,
      policy: 'disable_non_proxied_udp',
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
  },
  telemetry: {
    enabled: false,
  },
};