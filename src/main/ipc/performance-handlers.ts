import { app } from 'electron';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { performanceController } from '@main/services/performance-controller';
import { settingsRepo } from '@main/store';
import { z } from 'zod';

export function registerPerformanceHandlers(): void {
  // ── Ağ ────────────────────────────────────────────

  defineHandler({
    channel: IPC.performance.getNetworkLimit,
    schema: noPayload,
    handle: () => {
      const s = settingsRepo.get().performance;
      return {
        enabled: s.networkLimitEnabled && (s.networkDownloadMbps > 0 || s.networkUploadMbps > 0),
        downloadMbps: s.networkDownloadMbps,
        uploadMbps: s.networkUploadMbps,
        latencyMs: s.networkLatencyMs,
      };
    },
  });

  defineHandler({
    channel: IPC.performance.setNetworkLimit,
    schema: z.object({
      downloadMbps: z.number().min(0).max(10000),
      uploadMbps: z.number().min(0).max(10000),
      latencyMs: z.number().min(0).max(5000),
    }),
    handle: async ({ downloadMbps, uploadMbps, latencyMs }) => {
      const settings = settingsRepo.get();
      settings.performance.networkLimitEnabled = downloadMbps > 0 || uploadMbps > 0;
      settings.performance.networkDownloadMbps = downloadMbps;
      settings.performance.networkUploadMbps = uploadMbps;
      settings.performance.networkLatencyMs = latencyMs;
      settingsRepo.set(settings);

      const result = await performanceController.applyNetworkLimit(downloadMbps, uploadMbps, latencyMs);
      return { ok: result.ok, fail: result.fail, total: result.total };
    },
  });

  defineHandler({
    channel: IPC.performance.clearNetworkLimit,
    schema: noPayload,
    handle: async () => {
      const settings = settingsRepo.get();
      settings.performance.networkLimitEnabled = false;
      settings.performance.networkDownloadMbps = 0;
      settings.performance.networkUploadMbps = 0;
      settingsRepo.set(settings);
      await performanceController.clearNetworkLimit();
      return true;
    },
  });

  defineHandler({
    channel: IPC.performance.getNetworkStats,
    schema: noPayload,
    handle: () => {
      const s = settingsRepo.get().performance;
      return {
        currentDownloadKbps: 0,
        currentUploadKbps: 0,
        limitDownloadMbps: s.networkDownloadMbps,
        limitUploadMbps: s.networkUploadMbps,
      };
    },
  });

  // ── CPU ────────────────────────────────────────────

  defineHandler({
    channel: IPC.performance.getCpuLimit,
    schema: noPayload,
    handle: () => {
      const s = settingsRepo.get().performance;
      return { enabled: s.cpuLimitEnabled, percent: s.cpuLimitPercent };
    },
  });

  defineHandler({
    channel: IPC.performance.setCpuLimit,
    schema: z.object({ percent: z.number().min(10).max(100) }),
    handle: ({ percent }) => {
      const settings = settingsRepo.get();
      settings.performance.cpuLimitEnabled = true;
      settings.performance.cpuLimitPercent = percent;
      settingsRepo.set(settings);
      performanceController.applyCpuLimit(percent);
      return true;
    },
  });

  defineHandler({
    channel: IPC.performance.clearCpuLimit,
    schema: noPayload,
    handle: () => {
      const settings = settingsRepo.get();
      settings.performance.cpuLimitEnabled = false;
      settingsRepo.set(settings);
      performanceController.clearCpuLimit();
      return true;
    },
  });

  /** Gerçek zamanlı CPU kullanımı — app.getAppMetrics() üzerinden */
  defineHandler({
    channel: IPC.performance.getCpuStats,
    schema: noPayload,
    handle: () => {
      const metrics = app.getAppMetrics();
      const totalCpu = metrics.reduce((sum, m) => sum + (m.cpu?.percentCPUUsage ?? 0), 0);
      const totalMemory = metrics.reduce((sum, m) => sum + m.memory.workingSetSize / 1024, 0);
      return {
        cpuPercent: Math.round(totalCpu * 100) / 100,
        processCount: metrics.length,
        totalMemoryMb: Math.round(totalMemory),
      };
    },
  });

  // ── Bellek ─────────────────────────────────────────

  defineHandler({
    channel: IPC.performance.getMemoryLimit,
    schema: noPayload,
    handle: () => {
      const s = settingsRepo.get().performance;
      return {
        enabled: s.memoryLimitEnabled,
        mode: s.memoryLimitMode,
        limitMb: s.memoryLimitMb,
      };
    },
  });

  defineHandler({
    channel: IPC.performance.setMemoryLimit,
    schema: z.object({
      mode: z.enum(['soft', 'hard']),
      limitMb: z.number().min(256).max(32768),
    }),
    handle: ({ mode, limitMb }) => {
      const settings = settingsRepo.get();
      settings.performance.memoryLimitEnabled = true;
      settings.performance.memoryLimitMode = mode;
      settings.performance.memoryLimitMb = limitMb;
      settingsRepo.set(settings);
      performanceController.applyFromSettings(settings);
      return true;
    },
  });

  defineHandler({
    channel: IPC.performance.clearMemoryLimit,
    schema: noPayload,
    handle: () => {
      const settings = settingsRepo.get();
      settings.performance.memoryLimitEnabled = false;
      settingsRepo.set(settings);
      performanceController.stopMemoryMonitoring();
      return true;
    },
  });

  defineHandler({
    channel: IPC.performance.getMemoryStats,
    schema: noPayload,
    handle: () => {
      const stats = performanceController.getMemoryStats();
      return { total: stats.total, used: stats.used };
    },
  });
}
