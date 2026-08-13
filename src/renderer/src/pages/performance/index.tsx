import { useState, useEffect, useCallback } from 'react';
import { CircularGauge } from '@renderer/components/ui/gauge';
import { RotaryKnob } from '@renderer/components/ui/rotary-knob';
import { showToast } from '@renderer/components/layouts/toast-bus';
import type { Result } from '@shared/types/result';

// ── Tipler ─────────────────────────────────────────────

interface NetworkLimit {
  enabled: boolean;
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
}

interface CpuLimit {
  enabled: boolean;
  percent: number;
}

interface MemoryLimit {
  enabled: boolean;
  mode: 'soft' | 'hard';
  limitMb: number;
}

interface SystemStats {
  cpuPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  downloadKbps: number;
  uploadKbps: number;
}

// ── Yardımcı: Result'tan veri çekme ─────────────────────

function unwrap<T>(res: Result<unknown>): T | null {
  if (res.ok && res.data !== undefined) return res.data as T;
  return null;
}

// ── Ana Sayfa ──────────────────────────────────────────

export default function PerformancePage() {
  const [network, setNetwork] = useState<NetworkLimit>({
    enabled: false,
    downloadMbps: 0,
    uploadMbps: 0,
    latencyMs: 0,
  });
  const [cpu, setCpu] = useState<CpuLimit>({ enabled: false, percent: 80 });
  const [memory, setMemory] = useState<MemoryLimit>({
    enabled: false,
    mode: 'soft',
    limitMb: 2048,
  });
  const [stats, setStats] = useState<SystemStats>({
    cpuPercent: 0,
    memoryUsedMb: 0,
    memoryTotalMb: 0,
    downloadKbps: 0,
    uploadKbps: 0,
  });
  const [masterOn, setMasterOn] = useState(false);
  const [applying, setApplying] = useState(''); // hangi modül uygulanıyor

  // ── Başlangıç yükleme ──────────────────────────────

  useEffect(() => {
    void loadAll();
    const statsTimer = setInterval(() => void loadStats(), 2000);
    return () => clearInterval(statsTimer);
  }, []);

  const loadAll = async () => {
    const [netR, cpuR, memR] = await Promise.all([
      window.aether.performance.getNetworkLimit(),
      window.aether.performance.getCpuLimit(),
      window.aether.performance.getMemoryLimit(),
    ]);

    const n = unwrap<NetworkLimit>(netR);
    const c = unwrap<CpuLimit>(cpuR);
    const m = unwrap<MemoryLimit>(memR);

    if (n) setNetwork(n);
    if (c) setCpu(c);
    if (m) setMemory(m);

    setMasterOn(
      (n?.enabled && (n.downloadMbps > 0 || n.uploadMbps > 0)) ||
        c?.enabled ||
        m?.enabled ||
        false,
    );
  };

  const loadStats = async () => {
    try {
      const [memR, cpuR, netR] = await Promise.all([
        window.aether.performance.getMemoryStats(),
        window.aether.performance.getCpuStats(),
        window.aether.performance.getNetworkStats(),
      ]);

      if (memR.ok && memR.data) {
        const d = memR.data as { used: number; total: number };
        setStats((s) => ({ ...s, memoryUsedMb: d.used, memoryTotalMb: d.total }));
      }
      if (cpuR.ok && cpuR.data) {
        const d = cpuR.data as { cpuPercent: number };
        setStats((s) => ({ ...s, cpuPercent: d.cpuPercent }));
      }
      if (netR.ok && netR.data) {
        const d = netR.data as { currentDownloadKbps: number; currentUploadKbps: number };
        setStats((s) => ({ ...s, downloadKbps: d.currentDownloadKbps, uploadKbps: d.currentUploadKbps }));
      }
    } catch {
      /* stats yükleme hatası sessiz */
    }
  };

  // ── Master toggle ───────────────────────────────────

  const toggleMaster = useCallback(
    async (on: boolean) => {
      setMasterOn(on);
      if (!on) {
        setApplying('all-off');
        await Promise.all([
          window.aether.performance.clearNetworkLimit(),
          window.aether.performance.clearCpuLimit(),
          window.aether.performance.clearMemoryLimit(),
        ]);
        setApplying('');
        await loadAll();
        showToast('Kaynak kontrolü devre dışı', 'info');
      }
    },
    [],
  );

  // ── Ağ ──────────────────────────────────────────────

  const applyNetwork = useCallback(async () => {
    // 0 değerle açılıyorsa varsayılan ata
    let dl = network.downloadMbps;
    let ul = network.uploadMbps;
    if (dl === 0 && ul === 0) {
      dl = 10;
      ul = 5;
      setNetwork((p) => ({ ...p, downloadMbps: dl, uploadMbps: ul }));
    }

    // Optimistik güncelleme — buton hemen ON olsun
    setNetwork((p) => ({ ...p, enabled: true }));
    setApplying('net');

    const res = await window.aether.performance.setNetworkLimit(dl, ul, network.latencyMs);
    setApplying('');
    if (res.ok) {
      showToast('Ağ limiti uygulandı', 'success');
    } else {
      // Başarısız olursa geri al
      setNetwork((p) => ({ ...p, enabled: false }));
      showToast(`Ağ limiti hatası: ${res.error}`, 'error');
    }
  }, [network]);

  const clearNetwork = useCallback(async () => {
    setNetwork((p) => ({ ...p, enabled: false }));
    setApplying('net');
    await window.aether.performance.clearNetworkLimit();
    setApplying('');
    showToast('Ağ limiti kaldırıldı', 'success');
  }, []);

  // ── CPU ─────────────────────────────────────────────

  const applyCpu = useCallback(async () => {
    setCpu((p) => ({ ...p, enabled: true }));
    setApplying('cpu');
    const res = await window.aether.performance.setCpuLimit(cpu.percent);
    setApplying('');
    if (res.ok) {
      showToast('CPU limiti uygulandı (deneysel)', 'success');
    } else {
      setCpu((p) => ({ ...p, enabled: false }));
      showToast(`CPU limiti hatası: ${res.error}`, 'error');
    }
  }, [cpu]);

  const clearCpu = useCallback(async () => {
    setCpu((p) => ({ ...p, enabled: false }));
    setApplying('cpu');
    await window.aether.performance.clearCpuLimit();
    setApplying('');
    showToast('CPU limiti kaldırıldı', 'success');
  }, []);

  // ── RAM ─────────────────────────────────────────────

  const applyMemory = useCallback(async () => {
    setMemory((p) => ({ ...p, enabled: true }));
    setApplying('mem');
    const res = await window.aether.performance.setMemoryLimit(memory.mode, memory.limitMb);
    setApplying('');
    if (res.ok) {
      showToast(
        memory.mode === 'soft'
          ? 'Bellek yumuşak limiti aktif — eşik aşılırsa sekmeler uyutulur'
          : 'Bellek sert limiti uygulandı (deneysel)',
        'success',
      );
    } else {
      setMemory((p) => ({ ...p, enabled: false }));
      showToast(`Bellek limiti hatası: ${res.error}`, 'error');
    }
  }, [memory]);

  const clearMemory = useCallback(async () => {
    setMemory((p) => ({ ...p, enabled: false }));
    setApplying('mem');
    await window.aether.performance.clearMemoryLimit();
    setApplying('');
    showToast('Bellek limiti kaldırıldı', 'success');
  }, []);

  // ── Render ──────────────────────────────────────────

  return (
    <div
      className="relative min-h-full overflow-y-auto px-6 py-6"
      style={{
        background: `
          radial-gradient(ellipse at 50% 35%, rgba(30,30,40,0.7) 0%, rgba(10,10,15,0.95) 70%),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.008) 2px,
            rgba(255,255,255,0.008) 4px
          )
        `,
        backgroundColor: '#0a0a0f',
      }}
    >
      {/* Arka plan noise dokusu */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* ── Üst bar ──────────────────────────────── */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold uppercase tracking-[0.15em] text-fg"
              style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" }}
            >
              Kaynak Kontrolü
            </h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-muted">
              CPU &bull; RAM &bull; Network &mdash; Limiter
            </p>
          </div>

          {/* Rocker switch tarzı master toggle */}
          <button
            type="button"
            onClick={() => toggleMaster(!masterOn)}
            className={`
              group relative flex h-11 w-28 items-center rounded-full border-2 px-1.5
              transition-all duration-300
              ${masterOn
                ? 'border-amber-500/40 bg-amber-500/10 shadow-[0_0_18px_rgba(245,158,11,0.25)]'
                : 'border-white/10 bg-white/5'
              }
            `}
            aria-label="Kaynak kontrolü ana anahtar"
            role="switch"
            aria-checked={masterOn}
          >
            {/* Arka plan glow efekti */}
            {masterOn && (
              <div className="absolute inset-0 rounded-full bg-amber-500/5 blur-md" />
            )}

            {/* Sol/Sağ etiket */}
            <span
              className={`absolute text-[8px] font-bold uppercase tracking-[0.15em] transition-opacity duration-300 ${
                masterOn ? 'left-3 text-amber-300/70' : 'right-3 text-white/20'
              }`}
              style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" }}
            >
              {masterOn ? 'ON' : 'OFF'}
            </span>

            {/* Düğme */}
            <span
              className={`
                relative z-10 ml-auto h-8 w-8 rounded-full transition-all duration-300
                ${masterOn
                  ? 'translate-x-0 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                  : '-translate-x-[calc(100%+4px)] bg-white/15'
                }
              `}
            >
              {/* İç parlaklık */}
              <span className="absolute inset-1.5 rounded-full bg-white/10" />
            </span>
          </button>
        </header>

        {/* ── Gösterge paneli ──────────────────────── */}
        <div className="mb-6 grid grid-cols-3 gap-5">
          {/* CPU Gauge */}
          <GaugeCard
            title="CPU"
            active={cpu.enabled}
            applying={applying === 'cpu'}
            onToggle={cpu.enabled ? clearCpu : applyCpu}
            disabled={!masterOn}
          >
            <CircularGauge
              value={cpu.percent}
              min={0}
              max={100}
              redlineAt={85}
              limitValue={cpu.enabled ? cpu.percent : undefined}
              realValue={stats.cpuPercent > 0 ? stats.cpuPercent : undefined}
              label="İşlemci"
              unit="%"
              size={170}
            />
            <RotaryKnob
              value={cpu.percent}
              min={10}
              max={100}
              step={5}
              onChange={(v) => setCpu((p) => ({ ...p, percent: v }))}
              label="CPU Limit"
              unit="%"
              size={72}
              disabled={!masterOn}
            />
          </GaugeCard>

          {/* RAM Gauge */}
          <GaugeCard
            title="RAM"
            active={memory.enabled}
            applying={applying === 'mem'}
            onToggle={memory.enabled ? clearMemory : applyMemory}
            disabled={!masterOn}
            experimental={memory.mode === 'hard'}
          >
            <CircularGauge
              value={memory.limitMb > 0 ? (stats.memoryUsedMb / memory.limitMb) * 100 : 0}
              min={0}
              max={100}
              redlineAt={90}
              limitValue={memory.enabled ? 100 : undefined}
              realValue={
                memory.limitMb > 0
                  ? Math.round((stats.memoryUsedMb / memory.limitMb) * 100)
                  : Math.round((stats.memoryUsedMb / Math.max(stats.memoryTotalMb, 1)) * 100)
              }
              label="Bellek"
              unit="%"
              size={170}
            />

            <div className="flex flex-col items-center gap-1">
              <RotaryKnob
                value={memory.limitMb}
                min={256}
                max={8192}
                step={256}
                onChange={(v) => setMemory((p) => ({ ...p, limitMb: v }))}
                label="RAM Limit"
                unit="MB"
                size={72}
                disabled={!masterOn}
              />

              {/* Yumuşak/Sert mod seçimi */}
              <div className="mt-1 flex gap-0.5 rounded-md border border-white/10 bg-white/5 p-0.5">
                <button
                  type="button"
                  disabled={!masterOn}
                  onClick={() => setMemory((p) => ({ ...p, mode: 'soft' }))}
                  className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition disabled:opacity-30 ${
                    memory.mode === 'soft'
                      ? 'bg-brand/30 text-brand'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" }}
                >
                  Soft
                </button>
                <button
                  type="button"
                  disabled={!masterOn}
                  onClick={() => setMemory((p) => ({ ...p, mode: 'hard' }))}
                  className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition disabled:opacity-30 ${
                    memory.mode === 'hard'
                      ? 'bg-amber-500/30 text-amber-300'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" }}
                >
                  Hard
                </button>
              </div>
            </div>

            {/* Kullanım detayı */}
            <div className="mt-2 text-center font-mono text-[10px] text-fg-muted">
              {stats.memoryUsedMb.toFixed(0)} MB / {memory.limitMb} MB limit
            </div>
          </GaugeCard>

          {/* Ağ Gauge */}
          <GaugeCard
            title="AĞ"
            active={network.enabled}
            applying={applying === 'net'}
            onToggle={network.enabled ? clearNetwork : applyNetwork}
            disabled={!masterOn}
          >
            <CircularGauge
              value={network.downloadMbps}
              min={0}
              max={Math.max(network.downloadMbps * 1.5, 20)}
              redlineAt={network.downloadMbps > 0 ? network.downloadMbps * 1.1 : undefined}
              limitValue={network.enabled ? network.downloadMbps : undefined}
              realValue={stats.downloadKbps > 0 ? stats.downloadKbps / 1000 : undefined}
              label="İndirme"
              unit="Mbps"
              size={170}
            />

            <div className="flex gap-3">
              <RotaryKnob
                value={network.downloadMbps}
                min={0}
                max={100}
                step={0.5}
                onChange={(v) => setNetwork((p) => ({ ...p, downloadMbps: v }))}
                label="DL Mbps"
                unit=""
                size={64}
                disabled={!masterOn}
              />
              <RotaryKnob
                value={network.uploadMbps}
                min={0}
                max={100}
                step={0.5}
                onChange={(v) => setNetwork((p) => ({ ...p, uploadMbps: v }))}
                label="UL Mbps"
                unit=""
                size={64}
                disabled={!masterOn}
              />
            </div>

            <RotaryKnob
              value={network.latencyMs}
              min={0}
              max={500}
              step={10}
              onChange={(v) => setNetwork((p) => ({ ...p, latencyMs: v }))}
              label="Gecikme"
              unit="ms"
              size={56}
              disabled={!masterOn}
            />
          </GaugeCard>
        </div>

        {/* ── Platform uyarısı ─────────────────────── */}
        <div className="mx-auto max-w-2xl rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-amber-200/60">
          CPU limiti deneyseldir &bull; macOS/Linux&apos;ta yaklaşık değer &bull; Sert RAM limiti yalnızca Windows
        </div>
      </div>
    </div>
  );
}

// ── Gösterge kartı sarmalayıcı ──────────────────────────

interface GaugeCardProps {
  title: string;
  active: boolean;
  applying: boolean;
  onToggle: () => void;
  disabled: boolean;
  experimental?: boolean;
  children: React.ReactNode;
}

function GaugeCard({
  title,
  active,
  applying,
  onToggle,
  disabled,
  experimental,
  children,
}: GaugeCardProps) {
  return (
    <div
      className={`
        relative flex flex-col items-center gap-3 rounded-2xl border px-4 pb-4 pt-3
        transition-all duration-500
        ${active
          ? 'border-brand/25 bg-brand/3 shadow-[0_0_30px_rgba(168,85,247,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]'
          : 'border-white/6 bg-white/[0.02]'
        }
        ${disabled ? 'opacity-40' : ''}
      `}
    >
      {/* Başlık + toggle */}
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-muted"
            style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" }}
          >
            {title}
          </span>
          {experimental && (
            <span className="rounded bg-amber-500/20 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-amber-300">
              BETA
            </span>
          )}
        </div>

        {/* Mini toggle */}
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className={`
            relative h-5 w-9 rounded-full border transition-all duration-300
            disabled:cursor-not-allowed
            ${active
              ? 'border-brand/40 bg-brand/20'
              : 'border-white/10 bg-white/5'
            }
          `}
          aria-label={`${title} limitini ${active ? 'kapat' : 'aç'}`}
        >
          <span
            className={`
              absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all duration-300
              ${active
                ? 'left-[calc(100%-16px)] bg-brand shadow-[0_0_6px_rgba(168,85,247,0.6)]'
                : 'left-0.5 bg-white/20'
              }
            `}
          />
          {applying && (
            <span className="absolute inset-0 animate-pulse rounded-full bg-brand/20" />
          )}
        </button>
      </div>

      {/* İçerik */}
      <div className="flex flex-col items-center gap-3">{children}</div>

      {/* Aktif gösterge çizgisi */}
      <div
        className={`
          absolute bottom-0 left-4 right-4 h-px transition-all duration-500
          ${active ? 'bg-gradient-to-r from-transparent via-brand/40 to-transparent' : 'bg-transparent'}
        `}
      />
    </div>
  );
}
