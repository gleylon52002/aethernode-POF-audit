import { app, BrowserWindow, webContents as webContentsModule, type WebContents } from 'electron';
import type { AppSettings } from '@shared/types/settings';
import { IPC } from '@shared/constants';
import { logger } from '@main/utils/logger';

/**
 * Performans Kontrolcüsü — Ağ, CPU ve Bellek limitleyicisi
 *
 * Modül 1: Ağ Limitleyici (CDP Network.emulateNetworkConditions)
 * Modül 2: CPU Limitleyici (Windows Job Objects, Linux cgroups — gelecek)
 * Modül 3: Bellek Limitleyici (yumuşak mod: otomatik tab discard)
 */

interface NetworkLimit {
  downloadThroughput: number; // byte/sn (-1 = sınırsız)
  uploadThroughput: number; // byte/sn (-1 = sınırsız)
  latency: number; // ms
}

interface MemoryStats {
  total: number;
  used: number;
}

interface MemoryPressurePayload {
  excessMb: number;
  totalUsageMb: number;
  limitMb: number;
  discardedUrls: string[];
}

/** Ağ limiti uygulanan webContents sayısı (renderer'a rapor için) */
interface NetworkApplyResult {
  ok: number;
  fail: number;
  total: number;
}

class PerformanceController {
  private networkLimitActive = false;
  private currentNetworkLimit: NetworkLimit | null = null;
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private lastApplyResult: NetworkApplyResult = { ok: 0, fail: 0, total: 0 };

  private notifyRenderer(payload: MemoryPressurePayload): void {
    const wins = BrowserWindow.getAllWindows();
    for (const win of wins) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.performance.memoryPressure, payload);
      }
    }
  }

  async applyNetworkLimit(
    downloadMbps: number,
    uploadMbps: number,
    latencyMs: number,
  ): Promise<NetworkApplyResult> {
    const downloadBps = downloadMbps > 0 ? downloadMbps * 125_000 : -1;
    const uploadBps = uploadMbps > 0 ? uploadMbps * 125_000 : -1;

    this.currentNetworkLimit = {
      downloadThroughput: downloadBps,
      uploadThroughput: uploadBps,
      latency: latencyMs,
    };
    this.networkLimitActive = true;

    const allContents = webContentsModule.getAllWebContents();
    const webviews = allContents.filter((wc) => wc.getType() === 'webview' && !wc.isDestroyed());

    let ok = 0;
    let fail = 0;

    for (const wc of webviews) {
      const success = await this.applyNetworkLimitToWebContents(wc);
      if (success) ok++;
      else fail++;
    }

    this.lastApplyResult = { ok, fail, total: webviews.length };

    if (fail > 0) {
      logger.warn('Ağ limiti kısmen uygulandı', {
        ok,
        fail,
        total: webviews.length,
        downloadMbps,
        uploadMbps,
      });
    } else if (ok > 0) {
      logger.info('Ağ limiti uygulandı', { ok, downloadMbps, uploadMbps });
    }

    return this.lastApplyResult;
  }

  private async applyNetworkLimitToWebContents(wc: WebContents): Promise<boolean> {
    if (!this.currentNetworkLimit || wc.isDestroyed()) return false;
    if (wc.getType() !== 'webview') return false;

    try {
      if (!wc.debugger.isAttached()) {
        await wc.debugger.attach('1.3');
      }
      await wc.debugger.sendCommand('Network.enable');
      await wc.debugger.sendCommand('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: this.currentNetworkLimit.downloadThroughput,
        uploadThroughput: this.currentNetworkLimit.uploadThroughput,
        latency: this.currentNetworkLimit.latency,
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('CDP ağ limiti uygulanamadı', {
        url: wc.getURL().slice(0, 80),
        error: msg,
      });
      return false;
    }
  }

  async clearNetworkLimit(): Promise<void> {
    this.networkLimitActive = false;
    this.currentNetworkLimit = null;

    const allContents = webContentsModule.getAllWebContents();
    let cleared = 0;

    for (const wc of allContents) {
      if (wc.isDestroyed() || wc.getType() !== 'webview') continue;
      try {
        if (wc.debugger.isAttached()) {
          await wc.debugger.sendCommand('Network.emulateNetworkConditions', {
            offline: false,
            downloadThroughput: -1,
            uploadThroughput: -1,
            latency: 0,
          });
          wc.debugger.detach();
          cleared++;
        }
      } catch {
        /* yoksay */
      }
    }

    logger.info('Ağ limiti kaldırıldı', { clearedWebviews: cleared });
  }

  onWebContentsCreated(wc: WebContents): void {
    if (this.networkLimitActive && this.currentNetworkLimit) {
      wc.once('did-finish-load', () => {
        void this.applyNetworkLimitToWebContents(wc);
      });
    }
  }

  /** Son ağ limiti uygulama sonucunu döndür */
  getLastNetworkResult(): NetworkApplyResult {
    return { ...this.lastApplyResult };
  }

  // ── Bellek ────────────────────────────────────────────

  startMemoryMonitoring(limitMb: number): void {
    this.stopMemoryMonitoring();

    logger.info('Bellek izleme başlatıldı', { limitMb });

    this.memoryCheckInterval = setInterval(() => {
      const stats = this.collectMemoryStats();
      const excessMb = stats.used - limitMb;

      if (excessMb > 0) {
        const heavyUrls = this.identifyHeavyTabUrls(excessMb);
        logger.warn('Bellek limiti aşıldı', {
          usedMb: Math.round(stats.used),
          limitMb,
          excessMb: Math.round(excessMb),
          discardedCount: heavyUrls.length,
        });
        this.notifyRenderer({
          excessMb: Math.round(excessMb),
          totalUsageMb: Math.round(stats.used),
          limitMb,
          discardedUrls: heavyUrls,
        });
      }
    }, 10_000);
  }

  stopMemoryMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
      logger.info('Bellek izleme durduruldu');
    }
  }

  private collectMemoryStats(): MemoryStats {
    const metrics = app.getAppMetrics();
    const totalMb = metrics.reduce((sum, m) => sum + m.memory.workingSetSize / 1024, 0);
    return { used: totalMb, total: 0 };
  }

  private identifyHeavyTabUrls(excessMb: number): string[] {
    const metrics = app.getAppMetrics();
    const pidMemory = new Map<number, number>();
    for (const m of metrics) {
      pidMemory.set(m.pid, m.memory.workingSetSize / 1024);
    }

    const allContents = webContentsModule
      .getAllWebContents()
      .filter((wc) => wc.getType() === 'webview' && !wc.isDestroyed());

    const sorted = allContents
      .map((wc) => {
        const pid = wc.getOSProcessId();
        return { url: wc.getURL(), memoryMb: pidMemory.get(pid) ?? 0 };
      })
      .filter((item) => item.memoryMb > 0)
      .sort((a, b) => b.memoryMb - a.memoryMb);

    const urls: string[] = [];
    let freed = 0;

    for (const { url, memoryMb } of sorted) {
      if (freed >= excessMb) break;
      if (this.isProtectedUrl(url)) continue;
      if (url.startsWith('aethernode://') || !url) continue;
      urls.push(url);
      freed += memoryMb;
    }

    return urls;
  }

  private isProtectedUrl(url: string): boolean {
    if (!url) return true;

    const bankPatterns = [
      /bank/i,
      /hsbc|chase|wellsfargo|boa|citibank|paypal|stripe/i,
      /papara|qnb|garanti|akbank|ziraat|vakif|is\.bank|deniz|halkbank/i,
    ];
    const mediaPatterns = [
      /youtube\.com|youtu\.be|music\.youtube/i,
      /spotify\.com|soundcloud\.com/i,
      /twitch\.tv|netflix\.com|vimeo\.com/i,
    ];

    return bankPatterns.some((p) => p.test(url)) || mediaPatterns.some((p) => p.test(url));
  }

  getMemoryStats(): MemoryStats {
    const stats = this.collectMemoryStats();
    const systemMemory = process.getSystemMemoryInfo();
    return { total: systemMemory.total / 1024, used: stats.used };
  }

  // ── CPU ───────────────────────────────────────────────

  applyCpuLimit(_percent: number): void {
    logger.info('CPU limiti isteği alındı (stub)', { percent: _percent });
    // TODO: Windows Job Objects / Linux cgroups
  }

  clearCpuLimit(): void {
    logger.info('CPU limiti kaldırıldı (stub)');
  }

  // ── Yaşam döngüsü ────────────────────────────────────

  applyFromSettings(settings: AppSettings): void {
    const perf = settings.performance;

    if (perf.networkLimitEnabled && (perf.networkDownloadMbps > 0 || perf.networkUploadMbps > 0)) {
      void this.applyNetworkLimit(perf.networkDownloadMbps, perf.networkUploadMbps, perf.networkLatencyMs);
    }

    if (perf.memoryLimitEnabled && perf.memoryLimitMode === 'soft') {
      this.startMemoryMonitoring(perf.memoryLimitMb);
    }

    if (perf.cpuLimitEnabled) {
      this.applyCpuLimit(perf.cpuLimitPercent);
    }
  }

  cleanup(): void {
    void this.clearNetworkLimit();
    this.stopMemoryMonitoring();
  }
}

export const performanceController = new PerformanceController();
