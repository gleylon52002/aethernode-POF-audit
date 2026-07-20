import { useState } from 'react';
import { Settings as SettingsIcon, Warning } from '@renderer/components/ui/icons';
import { Switch } from '@renderer/components/ui';
import { useSettings } from '@renderer/store/settings';
import { useTabs } from '@renderer/store/tabs';
import {
  SEARCH_ENGINES,
  USER_AGENTS,
  type SearchEngine,
  type UserAgentId,
} from '@shared/constants/app';

const UA_LABELS: Record<UserAgentId, string> = {
  default: 'Varsayılan (AetherNode)',
  'chrome-windows': 'Chrome — Windows',
  'firefox-windows': 'Firefox — Windows',
  'edge-windows': 'Edge — Windows',
  'safari-mac': 'Safari — macOS',
  android: 'Chrome — Android (mobil)',
  iphone: 'Safari — iPhone (mobil)',
};

export default function SettingsPage() {
  const settings = useSettings((s) => s.settings);
  const apply = useSettings((s) => s.apply);
  const resetTabs = useTabs((s) => s.resetAll);
  const [cleaning, setCleaning] = useState(false);

  const deepClean = async () => {
    setCleaning(true);
    await window.aether.privacy.deepClean();
    setCleaning(false);
  };

  const panic = async () => {
    await window.aether.privacy.panic();
    try {
      localStorage.removeItem('aethernode.downloads');
      localStorage.removeItem('aethernode.session.tabs');
    } catch {
      /* yoksay */
    }
    resetTabs();
  };

  const updateGeneral = <K extends keyof typeof settings.general>(
    key: K,
    value: (typeof settings.general)[K],
  ) => apply({ ...settings, general: { ...settings.general, [key]: value } });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <SettingsIcon className="text-brand" />
        <h1 className="text-xl font-semibold">Ayarlar</h1>
      </header>

      <Section title="Genel">
        <Row label="Varsayılan arama motoru">
          <select
            value={settings.general.defaultSearchEngine}
            onChange={(e) => updateGeneral('defaultSearchEngine', e.target.value as SearchEngine)}
            className="h-9 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-sm focus:outline-none focus:border-brand/50"
          >
            {SEARCH_ENGINES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Bellek tasarrufu">
          <Switch
            checked={settings.general.memorySaver}
            onCheckedChange={(v) => updateGeneral('memorySaver', v)}
          />
        </Row>
        <Row label="Başlangıç sayfası">
          <select
            value={settings.general.startupPage}
            onChange={(e) =>
              updateGeneral(
                'startupPage',
                e.target.value as 'dashboard' | 'blank' | 'lastSession',
              )
            }
            className="h-9 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-sm focus:outline-none focus:border-brand/50"
          >
            <option value="dashboard">Gösterge paneli</option>
            <option value="blank">Boş sekme</option>
            <option value="lastSession">Son oturumu geri yükle</option>
          </select>
        </Row>
        <Row label="Do Not Track">
          <Switch
            checked={settings.general.doNotTrack}
            onCheckedChange={(v) => updateGeneral('doNotTrack', v)}
          />
        </Row>
        <Row label="User-Agent kimliği">
          <select
            value={settings.general.userAgent}
            onChange={(e) => updateGeneral('userAgent', e.target.value as UserAgentId)}
            className="h-9 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-sm focus:outline-none focus:border-brand/50"
          >
            {(Object.keys(USER_AGENTS) as UserAgentId[]).map((id) => (
              <option key={id} value={id}>
                {UA_LABELS[id]}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title="Veri Temizleme">
        <Row label="Derin temizlik">
          <div className="flex items-center gap-3">
            <span className="text-xs text-fg-muted">
              Çerez, localStorage, IndexedDB, cache ve ServiceWorker kayıtlarını siler.
            </span>
            <button
              onClick={() => void deepClean()}
              disabled={cleaning}
              className="rounded-lg border border-white/10 bg-bg-elevated/60 px-3 py-1.5 text-xs transition hover:border-brand/40 hover:text-brand disabled:opacity-50"
            >
              {cleaning ? 'Temizleniyor…' : 'Şimdi temizle'}
            </button>
          </div>
        </Row>
        <Row label="Panik Tuşu (Ctrl+Shift+X)">
          <div className="flex items-center gap-3">
            <span className="text-xs text-fg-muted">
              Tüm sekmeleri kapatır, depolamayı ve geçmişi anında sıfırlar.
            </span>
            <button
              onClick={() => void panic()}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20"
            >
              <Warning className="h-3.5 w-3.5" />
              Panik
            </button>
          </div>
        </Row>
      </Section>

      <Section title="Gizlilik & Güvenlik">
        <Row label="Varsayılan korumalar">
          <span className="text-xs text-fg-muted">
            Fingerprint, DNS over HTTPS, HTTPS zorlama ve tracker engelleme varsayılan olarak açıktır.
          </span>
        </Row>
        <Row label="Telemetri">
          <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-bg-elevated/60 px-2 py-1 text-xs text-fg-muted">
            🔒 Devre dışı — hiçbir analitik veri toplanmaz
          </span>
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-fg-muted">{title}</h2>
      <div className="glass divide-y divide-white/5 rounded-2xl">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm">{label}</span>
      <div>{children}</div>
    </div>
  );
}