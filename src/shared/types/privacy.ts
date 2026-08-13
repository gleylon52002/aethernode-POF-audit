// Fingerprint, WebRTC, DNS, HTTPS gibi gizlilik yapılandırma tipleri.
// Her alan tek anahtarla kapatılıp açılabilir; varsayılanlar
// en güvenli ayarı temsil eder (Privacy-by-default).

/**
 * compatibility: randomizasyon temelli (siteler daha az kırılır)
 * uniformity: tüm AetherNode kullanıcıları AYNI profili raporlar —
 *             "kalabalıkta kaybol", maksimum anonimlik.
 */
export type FingerprintMode = 'compatibility' | 'uniformity';

export interface FingerprintConfig {
  enabled: boolean;
  mode: FingerprintMode;
  spoofCanvas: boolean;
  spoofWebGL: boolean;
  spoofAudio: boolean;
  spoofFonts: boolean;
  spoofNavigator: boolean;
  spoofTimezone: boolean;
  spoofLanguage: boolean;
  spoofPlugins: boolean;
  spoofHardware: boolean;
  spoofScreen: boolean;
  spoofUserAgent: boolean;
  randomProfilePerSession: boolean;
}

export interface WebRtcConfig {
  enabled: boolean;
  policy: 'disable_non_proxied_udp' | 'force_proxy' | 'block_all';
  /** STUN/TURN'e izin verilen host'lar (örn. meet.google.com) — boşsa hiçbir istisna yok */
  allowedHosts: string[];
}

export interface DnsConfig {
  enabled: boolean;
  mode: 'off' | 'doh' | 'dot';
  dohUrl?: string;
  dotServer?: string;
  blockThirdParty: boolean;
}

export interface HttpsConfig {
  enabled: boolean;
  forceHttps: boolean;
  blockMixedContent: boolean;
  hstsPreload: boolean;
  warnOnInvalidCert: boolean;
}

export interface TrackerFilterConfig {
  enabled: boolean;
  lists: ReadonlyArray<string>; // EasyList, EasyPrivacy, DuckDuckGo Tracker Radar, ...
  customRules: ReadonlyArray<string>;
}

export interface CookieConfig {
  blockThirdParty: boolean;
  isolateFirstParty: boolean;
  autoDeleteOnExit: boolean;
  perTabIsolation: boolean;
}

// URL'lerden utm_source, fbclid, gclid gibi izleme parametrelerini temizler.
export interface UrlCleanerConfig {
  enabled: boolean;
}

// Bilinen çerez rıza (consent) popup'larını otomatik gizler/reddeder.
export interface CookieBannerConfig {
  autoReject: boolean;
}

export interface ScriptBlockerConfig {
  enabled: boolean;
}

export interface BankModeConfig {
  enabled: boolean;
}

export interface PrivacyConfig {
  fingerprint: FingerprintConfig;
  webrtc: WebRtcConfig;
  dns: DnsConfig;
  https: HttpsConfig;
  trackers: TrackerFilterConfig;
  cookies: CookieConfig;
  urlCleaner: UrlCleanerConfig;
  cookieBanner: CookieBannerConfig;
  scriptBlocker: ScriptBlockerConfig;
  bankMode: BankModeConfig;
}

export interface LeakTestResult {
  passed: boolean;
  category: 'webrtc' | 'dns' | 'ip' | 'fingerprint';
  details: string;
  observed?: string[];
  ranAt: number;
}