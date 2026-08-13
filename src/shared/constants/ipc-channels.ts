// AetherNode Secure Browser — IPC kanal sabitleri.
//
// Tüm main<->preload<->renderer iletişimi bu sabitler üzerinden yapılır.
// Kanal isimleri 'aethernode/<alan>/<aksiyon>' şemasındadır; main tarafında
// güvenlik denetimi (allowlist, payload doğrulama) buradaki isimlere göre
// çalışır. Yeni bir kanal eklerken buraya ekleyin — kanal isimlerini
// string literal olarak kullanmayın.
export const IPC = {
  // Uygulama yaşam döngüsü
  app: {
    ready: 'aethernode/app/ready',
    version: 'aethernode/app/version',
    platform: 'aethernode/app/platform',
    quit: 'aethernode/app/quit',
  },
  // Pencere yönetimi
  window: {
    minimize: 'aethernode/window/minimize',
    maximize: 'aethernode/window/maximize',
    close: 'aethernode/window/close',
    isMaximized: 'aethernode/window/isMaximized',
    toggleFullscreen: 'aethernode/window/fullscreen/toggle',
    openLittle: 'aethernode/window/openLittle',
  },
  // Sekmeler
  tabs: {
    create: 'aethernode/tabs/create',
    close: 'aethernode/tabs/close',
    forceClose: 'aethernode/tabs/forceClose',
    activate: 'aethernode/tabs/activate',
    list: 'aethernode/tabs/list',
    updated: 'aethernode/tabs/updated',
  },
  // Gezinme
  nav: {
    go: 'aethernode/nav/go',
    back: 'aethernode/nav/back',
    forward: 'aethernode/nav/forward',
    reload: 'aethernode/nav/reload',
    stop: 'aethernode/nav/stop',
  },
  // Yer imleri
  bookmarks: {
    list: 'aethernode/bookmarks/list',
    add: 'aethernode/bookmarks/add',
    remove: 'aethernode/bookmarks/remove',
    import: 'aethernode/bookmarks/import',
    export: 'aethernode/bookmarks/export',
  },
  // İndirmeler
  downloads: {
    list: 'aethernode/downloads/list',
    pause: 'aethernode/downloads/pause',
    resume: 'aethernode/downloads/resume',
    cancel: 'aethernode/downloads/cancel',
    open: 'aethernode/downloads/open',
    openFolder: 'aethernode/downloads/openFolder',
    remove: 'aethernode/downloads/remove',
    clearCompleted: 'aethernode/downloads/clearCompleted',
    updated: 'aethernode/downloads/updated',
  },
  // Gizlilik & güvenlik
  privacy: {
    fingerprintConfig: 'aethernode/privacy/fingerprint/config',
    networkGuardStatus: 'aethernode/privacy/guard/status',
    runLeakTest: 'aethernode/privacy/leak/run',
    panic: 'aethernode/privacy/panic',
    deepClean: 'aethernode/privacy/deepClean',
    pauseSite: 'aethernode/privacy/pauseSite',
    resumeSite: 'aethernode/privacy/resumeSite',
    isSitePaused: 'aethernode/privacy/isSitePaused',
    listPausedSites: 'aethernode/privacy/listPausedSites',
    webrtcAllowSite: 'aethernode/privacy/webrtcAllowSite',
    webrtcDisallowSite: 'aethernode/privacy/webrtcDisallowSite',
    webrtcAllowedSites: 'aethernode/privacy/webrtcAllowedSites',
  },
  // Gezinme geçmişi
  history: {
    list: 'aethernode/history/list',
    add: 'aethernode/history/add',
    remove: 'aethernode/history/remove',
    clear: 'aethernode/history/clear',
  },
  // Ayar deposu
  settings: {
    get: 'aethernode/settings/get',
    set: 'aethernode/settings/set',
    all: 'aethernode/settings/all',
    reset: 'aethernode/settings/reset',
  },
  // Şifre yöneticisi
  passwords: {
    list: 'aethernode/passwords/list',
    unlock: 'aethernode/passwords/unlock',
    lock: 'aethernode/passwords/lock',
    isUnlocked: 'aethernode/passwords/isUnlocked',
    status: 'aethernode/passwords/status',
    add: 'aethernode/passwords/add',
    update: 'aethernode/passwords/update',
    remove: 'aethernode/passwords/remove',
    updated: 'aethernode/passwords/updated',
    touchIdle: 'aethernode/passwords/touchIdle',
  },
  // Güvenli notlar
  notes: {
    list: 'aethernode/notes/list',
    add: 'aethernode/notes/add',
    update: 'aethernode/notes/update',
    remove: 'aethernode/notes/remove',
  },
  // Ağ paneli
  network: {
    enableInspector: 'aethernode/network/inspector/enable',
    disableInspector: 'aethernode/network/inspector/disable',
    captured: 'aethernode/network/captured',
    blocked: 'aethernode/network/blocked',
  },
  // Klavye kısayolları (main → renderer push)
  shortcuts: {
    event: 'aethernode/shortcuts/event',
  },
  // Evrensel medya kontrolü (hız + ses boost, tüm frame'ler)
  media: {
    apply: 'aethernode/media/apply',
    state: 'aethernode/media/state',
  },
  // Guest webview preload köprüsü
  guest: {
    config: 'aethernode/guest/config',
    preloadPath: 'aethernode/guest/preloadPath',
    attachPartition: 'aethernode/guest/attachPartition',
  },
  // Şifreli yedekleme / geri yükleme
  backup: {
    export: 'aethernode/backup/export',
    import: 'aethernode/backup/import',
  },
  // Form otomatik doldurma (profiller + master parola mühürlü kartlar)
  autofill: {
    profiles: 'aethernode/autofill/profiles',
    saveProfile: 'aethernode/autofill/saveProfile',
    removeProfile: 'aethernode/autofill/removeProfile',
    cards: 'aethernode/autofill/cards',
    saveCard: 'aethernode/autofill/saveCard',
    removeCard: 'aethernode/autofill/removeCard',
    cardFill: 'aethernode/autofill/cardFill',
  },
  // Geçici / tek kullanımlık oturum linkleri (sunucusuz, imzalı token)
  relay: {
    create: 'aethernode/relay/create',
    resolve: 'aethernode/relay/resolve',
  },
  // PWA — uygulamamsı pencerede aç
  pwa: {
    open: 'aethernode/pwa/open',
  },
  // Güvenlik merkezi
  security: {
    scan: 'aethernode/security/scan',
    permissions: 'aethernode/security/permissions',
    permissionsRequest: 'aethernode/security/permissionsRequest',
    permissionsRespond: 'aethernode/security/permissionsRespond',
    breaches: 'aethernode/security/breaches',
    beforeUnloadAsk: 'aethernode/security/beforeUnloadAsk',
    beforeUnloadRespond: 'aethernode/security/beforeUnloadRespond',
  },
  // Performans / Kaynak Kontrolü
  performance: {
    getNetworkLimit: 'aethernode/performance/network/get',
    setNetworkLimit: 'aethernode/performance/network/set',
    clearNetworkLimit: 'aethernode/performance/network/clear',
    getNetworkStats: 'aethernode/performance/network/stats',
    getCpuLimit: 'aethernode/performance/cpu/get',
    setCpuLimit: 'aethernode/performance/cpu/set',
    clearCpuLimit: 'aethernode/performance/cpu/clear',
    getCpuStats: 'aethernode/performance/cpu/stats',
    getMemoryLimit: 'aethernode/performance/memory/get',
    setMemoryLimit: 'aethernode/performance/memory/set',
    clearMemoryLimit: 'aethernode/performance/memory/clear',
    getMemoryStats: 'aethernode/performance/memory/stats',
    // Main → renderer push: bellek limiti aşıldığında gönderilir
    memoryPressure: 'aethernode/performance/memory/pressure',
  },
  // Otomatik güncelleme (main → renderer)
  updater: {
    available: 'aethernode/updater/available',
  },
} as const;

export type IpcChannelMap = typeof IPC;
export type IpcDomain = keyof IpcChannelMap;
export type IpcChannel<D extends IpcDomain> = IpcChannelMap[D];