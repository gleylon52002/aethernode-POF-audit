import { useEffect } from 'react';
import { Badge, Button } from '@renderer/components/ui';
import { Security as SecurityIcon, Shield } from '@renderer/components/ui/icons';
import { useSecurity } from '@renderer/store/security';
import type { Severity } from '@shared/types/security';
import type { LeakTestResult } from '@shared/types/privacy';

// Güvenlik Merkezi — Aşama 6.
//
// Koruma skoru + findings (settings/vault'a bağlı), sızıntı testi
// (WebRTC/DNS/IP/Fingerprint kategorileri), permission audit tablosu ve bilinen
// ihlal bilgilendirmesi. Gerçek değerler yereldir (HIBP/scan ağ çağrısı yok).

const SEVERITY_TONE: Record<Severity, 'success' | 'warning' | 'danger' | 'muted'> = {
  info: 'muted',
  low: 'muted',
  medium: 'warning',
  high: 'danger',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  info: 'Bilgi',
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

const LEAK_TONE: Record<string, 'success' | 'danger'> = {
  passed: 'success',
  failed: 'danger',
};

const LEAK_LABEL: Record<LeakTestResult['category'], string> = {
  webrtc: 'WebRTC',
  dns: 'DNS',
  ip: 'IP',
  fingerprint: 'Fingerprint',
};

export default function SecurityPage() {
  const scan = useSecurity((s) => s.scan);
  const leakResults = useSecurity((s) => s.leakResults);
  const permissions = useSecurity((s) => s.permissions);
  const breaches = useSecurity((s) => s.breaches);
  const runningLeak = useSecurity((s) => s.runningLeak);
  const load = useSecurity((s) => s.load);
  const runScan = useSecurity((s) => s.runScan);
  const runLeakTest = useSecurity((s) => s.runLeakTest);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SecurityIcon className="text-brand" />
          <h1 className="text-xl font-semibold">Güvenlik Merkezi</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => void runScan()}>
          Yeniden Tara
        </Button>
      </header>

      <ScoreCard
        score={scan?.score ?? 0}
        grade={scan?.grade ?? 'F'}
        ranAt={scan?.ranAt}
      />

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-fg-muted">
          Bulgular
        </h2>
        <div className="glass divide-y divide-white/5 rounded-2xl">
          {scan?.findings.length === 0 ? (
            <p className="px-4 py-4 text-sm text-fg-muted">Tüm korumalar aktif.</p>
          ) : (
            scan?.findings.map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{f.title}</div>
                  <div className="mt-0.5 text-xs text-fg-muted">{f.detail}</div>
                </div>
                <Badge tone={SEVERITY_TONE[f.severity]} className="shrink-0">
                  {SEVERITY_LABEL[f.severity]}
                </Badge>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-fg-muted">
            Sızıntı Testi
          </h2>
          <Button
            variant="brand"
            size="sm"
            disabled={runningLeak}
            onClick={() => void runLeakTest()}
          >
            {runningLeak ? 'Çalışıyor…' : 'Testi Çalıştır'}
          </Button>
        </div>
        <div className="glass divide-y divide-white/5 rounded-2xl">
          {leakResults.length === 0 ? (
            <p className="px-4 py-4 text-sm text-fg-muted">
              WebRTC, DNS, IP ve Fingerprint sızıntılarını test edin.
            </p>
          ) : (
            leakResults.map((r) => (
              <div key={r.category} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{LEAK_LABEL[r.category]}</span>
                    <Badge tone={LEAK_TONE[r.passed ? 'passed' : 'failed']}>
                      {r.passed ? 'Geçti' : 'Sızıntı'}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-fg-muted">{r.details}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-fg-muted">
          İzin Denetimi
        </h2>
        <div className="glass overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[1fr_1fr] gap-2 border-b border-white/10 px-4 py-2 text-[11px] uppercase tracking-wider text-fg-subtle">
            <span>Kaynak</span>
            <span>Politika</span>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {permissions.map((p) => (
              <div
                key={p.origin}
                className="grid grid-cols-[1fr_1fr] gap-2 border-b border-white/5 px-4 py-2 text-xs"
              >
                <span className="truncate font-mono text-fg-muted">{p.origin}</span>
                <span className="text-success">Tüm izinler reddedilir</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-fg-muted">
          Bilinen İhlaller
        </h2>
        <div className="glass divide-y divide-white/5 rounded-2xl">
          {breaches.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="text-fg-muted" />
                  <span className="text-sm font-medium">{b.title}</span>
                </div>
                <div className="mt-0.5 text-xs text-fg-muted">{b.summary}</div>
              </div>
              <Badge tone={SEVERITY_TONE[b.severity]} className="shrink-0">
                {SEVERITY_LABEL[b.severity]}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[11px] text-fg-subtle">
        Aşama 6+: skor ve sızıntı testi yerel ayarlardan hesaplanır (telemetri yok).
        HIBP gibi dış API çağrısı yapılmaz.
      </p>
    </div>
  );
}

function ScoreCard({
  score,
  grade,
  ranAt,
}: {
  score: number;
  grade: string;
  ranAt?: number;
}) {
  const tone = score >= 85 ? 'success' : score >= 55 ? 'warning' : 'danger';
  return (
    <div className="glass-strong relative mb-6 overflow-hidden rounded-3xl p-6">
      <div
        className="absolute inset-0 bg-gradient-to-br from-brand/15 via-accent/5 to-transparent"
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-fg-muted">Koruma Skoru</div>
          <div className="mt-1 flex items-end gap-3">
            <span className={`text-5xl font-semibold ${tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-danger'}`}>
              {grade}
            </span>
            <span className="mb-1 text-lg text-fg-muted">{score}/100</span>
          </div>
          {ranAt && (
            <div className="mt-1 text-[11px] text-fg-subtle">
              Son tarama: {new Date(ranAt).toLocaleString('tr-TR')}
            </div>
          )}
        </div>
        <div className="text-right text-xs text-fg-muted">
          {tone === 'success' ? 'İyi koruma' : tone === 'warning' ? 'Geliştirilebilir' : 'Riskli'}
        </div>
      </div>
    </div>
  );
}