import { z } from 'zod';
import type { AppSettings } from '@shared/types/settings';
import { SEARCH_ENGINES, USER_AGENTS } from '@shared/constants/app';

const fingerprintSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['compatibility', 'uniformity']),
  spoofCanvas: z.boolean(),
  canvasFarbling: z.boolean().optional(),
  letterboxing: z.boolean().optional(),
  spoofWebGL: z.boolean(),
  spoofAudio: z.boolean(),
  spoofFonts: z.boolean(),
  spoofNavigator: z.boolean(),
  spoofTimezone: z.boolean(),
  spoofLanguage: z.boolean(),
  spoofPlugins: z.boolean(),
  spoofHardware: z.boolean(),
  spoofScreen: z.boolean(),
  spoofUserAgent: z.boolean(),
  randomProfilePerSession: z.boolean(),
});

const privacySchema = z.object({
  fingerprint: fingerprintSchema,
  webrtc: z.object({
    enabled: z.boolean(),
    policy: z.enum(['disable_non_proxied_udp', 'force_proxy', 'block_all']),
    allowedHosts: z.array(z.string()).optional(),
  }),
  dns: z.object({
    enabled: z.boolean(),
    mode: z.enum(['off', 'doh', 'dot']),
    dohUrl: z.string().optional(),
    dotServer: z.string().optional(),
    blockThirdParty: z.boolean(),
  }),
  https: z.object({
    enabled: z.boolean(),
    forceHttps: z.boolean(),
    blockMixedContent: z.boolean(),
    hstsPreload: z.boolean(),
    warnOnInvalidCert: z.boolean(),
  }),
  trackers: z.object({
    enabled: z.boolean(),
    lists: z.array(z.string()),
    customRules: z.array(z.string()),
  }),
  cookies: z.object({
    blockThirdParty: z.boolean(),
    isolateFirstParty: z.boolean(),
    autoDeleteOnExit: z.boolean(),
    perTabIsolation: z.boolean(),
  }),
  urlCleaner: z.object({ enabled: z.boolean() }),
  cookieBanner: z.object({ autoReject: z.boolean() }),
  scriptBlocker: z.object({ enabled: z.boolean() }),
  bankMode: z.object({ enabled: z.boolean() }),
});

const searchEngineEnum = z.enum(
  SEARCH_ENGINES as unknown as [SearchEngineTuple, ...SearchEngineTuple[]],
);
type SearchEngineTuple = (typeof SEARCH_ENGINES)[number];

const userAgentEnum = z.enum(
  Object.keys(USER_AGENTS) as [keyof typeof USER_AGENTS, ...(keyof typeof USER_AGENTS)[]],
);

export const appSettingsSchema: z.ZodType<AppSettings> = z.object({
  schemaRevision: z.number().optional(),
  general: z.object({
    defaultSearchEngine: searchEngineEnum,
    tabLayout: z.enum(['vertical', 'horizontal']),
    tabBarWidth: z.number().min(160).max(480),
    startupPage: z.enum(['dashboard', 'blank', 'lastSession']),
    memorySaver: z.boolean(),
    doNotTrack: z.boolean(),
    userAgent: userAgentEnum,
    forceDarkMode: z.boolean(),
    mouseGestures: z.boolean(),
    autoArchiveTabs: z.boolean(),
    autoArchiveMinutes: z.number().min(5).max(24 * 60),
    resourceLimiter: z.boolean(),
    resourceLimitPercent: z.number().min(50).max(100),
    translateTarget: z.string().min(2).max(8),
    selectionTranslate: z.boolean(),
    treeTabs: z.boolean(),
    bookmarksBarVisible: z.boolean(),
    pinnedWallpaper: z.number().nullable(),
    accentTheme: z.enum(['purple', 'green', 'amber', 'red']),
    ambientWebflow: z.boolean().optional().default(true),
    soundEffectsEnabled: z.boolean(),
    soundEffectsVolume: z.number().min(0).max(1),
    hasSeenWelcomeTour: z.boolean().optional().default(false),
    hasSeenWelcomeScreen: z.boolean().optional().default(false),
    hasSeenUpdate: z.boolean().optional().default(true),
    bookmarkSuggestionDismissedAt: z.string().optional(),
    dailySummaryDismissedDate: z.string().optional(),
    dashboardStatsOrder: z.array(z.string()).optional().default(['blocked', 'protection', 'tabs', 'bookmarks']),
    dashboardStatsHidden: z.array(z.string()).optional().default([]),
    syncFolder: z.string().optional(),
  }),
  performance: z.object({
    networkLimitEnabled: z.boolean(),
    networkDownloadMbps: z.number().min(0).max(10000),
    networkUploadMbps: z.number().min(0).max(10000),
    networkLatencyMs: z.number().min(0).max(5000),
    cpuLimitEnabled: z.boolean(),
    cpuLimitPercent: z.number().min(10).max(100),
    memoryLimitEnabled: z.boolean(),
    memoryLimitMode: z.enum(['soft', 'hard']),
    memoryLimitMb: z.number().min(256).max(32768),
  }),
  privacy: privacySchema,
  cleanup: z.object({
    onExit: z.object({
      history: z.boolean(),
      cache: z.boolean(),
      cookies: z.boolean(),
      clipboard: z.boolean(),
      storage: z.boolean(),
      session: z.boolean(),
      tempFiles: z.boolean(),
    }),
  }),
  security: z.object({
    blockMaliciousDownloads: z.boolean(),
    verifySha256: z.boolean(),
    virusTotalApiKey: z.string().optional(),
    virusTotalPrompt: z.boolean(),
    vaultAutoLockMinutes: z.number().min(0).max(120),
  }),
}) as z.ZodType<AppSettings>;
