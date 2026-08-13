import { useEffect, useState } from 'react';
import { Shield, Security as SecurityIcon } from '@renderer/components/ui/icons';
import { Badge, Button } from '@renderer/components/ui';
import { useSettings } from '@renderer/store/settings';
import { useTabs } from '@renderer/store/tabs';
import { useSecurity } from '@renderer/store/security';

interface LabLink {
  title: string;
  url: string;
  category: string;
  note: string;
}

const TESTS: LabLink[] = [
  {
    title: 'Reklam engelleme',
    url: 'https://superadblocktest.com/',
    category: 'Reklam',
    note: 'Kaç reklam birimi engellendiğini Chrome/Edge/Brave ile karşılaştır.',
  },
  {
    title: 'Parmak izi (EFF Cover Your Tracks)',
    url: 'https://coveryourtracks.eff.org/',
    category: 'Fingerprint',
    note: '“Protection against tracking” skorunu not et; AetherNode uniformity/compatibility farkını gör.',
  },
  {
    title: 'BrowserLeaks',
    url: 'https://browserleaks.com/',
    category: 'Sızıntı',
    note: 'Canvas, WebGL, font, IP, WebRTC bölümlerini kontrol et — rastgele profil burada görünür.',
  },
  {
    title: 'WhatIsMyBrowser',
    url: 'https://www.whatismybrowser.com/',
    category: 'Kimlik',
    note: 'UA / OS / ekran raporunu diğer tarayıcılarla kıyasla.',
  },
  {
    title: 'AmIUnique',
    url: 'https://amiunique.org/fingerprint',
    category: 'Fingerprint',
    note: 'Parmak izi benzersizlik oranı; oturum yenileyince compatibility+random değişmeli.',
  },
];

export default function SecurityLabPage() {
  const open = useTabs((s) => s.open);
  const p = useSettings((s) => s.settings.privacy);
  const scan = useSecurity((s) => s.scan);
  const runScan = useSecurity((s) => s.runScan);
  const [guardBlocked, setGuardBlocked] = useState(0);

  useEffect(() => {
    void runScan();
    void window.aether.privacy.guardStatus().then((res) => {
      if (res.ok && res.data) setGuardBlocked((res.data as { blockedTotal: number }).blockedTotal);
    });
  }, [runScan]);

  const checks = [
    { ok: p.fingerprint.enabled, label: 'Fingerprint koruması' },
    { ok: p.fingerprint.randomProfilePerSession || p.fingerprint.mode === 'uniformity', label: 'Oturum profili / uniformity' },
    { ok: p.trackers.enabled, label: 'Tracker engelleme' },
    { ok: p.webrtc.enabled, label: 'WebRTC koruması' },
    { ok: p.dns.enabled && p.dns.mode !== 'off', label: 'Güvenli DNS' },
    { ok: p.https.forceHttps, label: 'HTTPS zorlama' },
    { ok: p.cookies.blockThirdParty, label: '3. parti çerez engeli' },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <SecurityIcon className="text-brand" />
        <div>
          <h1 className="text-xl font-semibold">Güvenlik laboratuvarı</h1>
          <p className="text-sm text-fg-muted">
            Yerel koruma skoru ve harici test siteleri — Chrome / Edge / Brave ile aynı testi
            açıp karşılaştır.
          </p>
        </div>
      </header>

      <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-fg-muted">Yerel koruma skoru</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-brand">{score}</span>
              <span className="text-sm text-fg-muted">/ 100</span>
            </div>
            {scan ? (
              <p className="mt-1 text-xs text-fg-muted">
                Güvenlik Merkezi: {scan.grade} ({scan.score}) · engellenen istek ≈ {guardBlocked}
              </p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={() => void runScan()}>
            Yenile
          </Button>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {checks.map((c) => (
            <li
              key={c.label}
              className="flex items-center gap-2 rounded-lg border border-white/5 px-3 py-2 text-sm"
            >
              <Shield className={c.ok ? 'text-emerald-400' : 'text-fg-muted'} />
              <span className={c.ok ? 'text-fg' : 'text-fg-muted'}>{c.label}</span>
              <Badge tone={c.ok ? 'success' : 'muted'} className="ml-auto">
                {c.ok ? 'açık' : 'kapalı'}
              </Badge>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-fg-muted">
          Siteler donanım, saat dilimi, font veya bellek sorduğunda AetherNode rastgele ama oturum
          boyunca tutarlı bir profil döner (uyumluluk modu + rastgele profil). Uniformity modunda
          tüm kullanıcılar aynı referans profile düşer.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-fg-muted">
          Harici testler (uygulama içi sekme)
        </h2>
        <div className="space-y-3">
          {TESTS.map((t) => (
            <div
              key={t.url}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-bg-elevated/40 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.title}</span>
                  <Badge tone="muted">{t.category}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-fg-muted">{t.note}</p>
              </div>
              <Button size="sm" onClick={() => open(t.url)}>
                Testi aç
              </Button>
            </div>
          ))}
        </div>
        <ol className="mt-6 list-decimal space-y-1 pl-5 text-xs text-fg-muted">
          <li>Bu listeden bir testi AetherNode’da aç ve skoru not et.</li>
          <li>Aynı URL’yi Chrome, Edge veya Brave’de aç.</li>
          <li>Engellenen reklam / fingerprint / WebRTC sonuçlarını yan yana karşılaştır.</li>
        </ol>
      </section>
    </div>
  );
}
