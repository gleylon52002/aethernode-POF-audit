import { useEffect } from 'react';
import { Switch } from '@renderer/components/ui';
import { Shield } from '@renderer/components/ui/icons';
import { useSettings } from '@renderer/store/settings';
import type { AppSettings } from '@shared/types/settings';
import type { DnsConfig, PrivacyConfig, WebRtcConfig } from '@shared/types/privacy';

// Gizlilik ayarları — toggle'lar settings'e yazılır ve anında uygulanır:
// networkGuard, DoH, guest fingerprint, cookie guard, bank mode, çıkış temizliği.

const WEBRTC_POLICIES: Array<{ value: WebRtcConfig['policy']; label: string }> = [
  {
    value: 'block_all',
    label: 'Tam engel (önerilen) — STUN yok, IP sızmaz',
  },
  {
    value: 'disable_non_proxied_udp',
    label: 'UDP kısıtla + STUN engelle (uyumluluk)',
  },
  {
    value: 'force_proxy',
    label: 'Yalnızca genel arayüz (proxy ile kullan)',
  },
];

const DNS_MODES: Array<{ value: DnsConfig['mode']; label: string }> = [
  { value: 'off', label: 'Kapalı (sistem çözücüsü)' },
  { value: 'doh', label: 'DNS over HTTPS (DoH)' },
  { value: 'dot', label: 'DNS over TLS (DoT)' },
];

export default function PrivacyPage() {
  const settings = useSettings((s) => s.settings);
  const loaded = useSettings((s) => s.loaded);
  const apply = useSettings((s) => s.apply);

  useEffect(() => {
    if (!loaded) void useSettings.getState().load();
  }, [loaded]);

  if (!loaded) {
    return (
      <div className="grid h-full place-items-center text-sm text-fg-muted">
        Gizlilik ayarları yükleniyor…
      </div>
    );
  }

  const update = (next: PrivacyConfig) =>
    apply({ ...settings, privacy: next });

  const p = settings.privacy;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <Shield className="text-brand" />
        <h1 className="text-xl font-semibold">Gizlilik</h1>
      </header>

      <Section title="Fingerprint" description="Tarayıcı parmak izini maskeleme / kalabalıkta kaybolma.">
        <Row
          label="Bukalemun (Chameleon) Parmak İzi Koruması"
          description="Master anahtar — tüm alt spoofing alanlarını (Canvas, WebGL, Audio vb.) etkiler."
        >
          <Switch
            checked={p.fingerprint.enabled}
            onCheckedChange={(v) =>
              update({ ...p, fingerprint: { ...p.fingerprint, enabled: v } })
            }
          />
        </Row>
        <Row
          label="Koruma modu"
          description="Uniformity: tüm kullanıcılar aynı profil (maks. anonimlik). Uyumluluk: rastgele profil (siteler daha az kırılır). Değişiklik sonrası sekmeleri yenile."
        >
          <select
            disabled={!p.fingerprint.enabled}
            value={p.fingerprint.mode ?? 'compatibility'}
            onChange={(e) =>
              update({
                ...p,
                fingerprint: {
                  ...p.fingerprint,
                  mode: e.target.value as 'compatibility' | 'uniformity',
                },
              })
            }
            className="h-9 max-w-[280px] rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-sm focus:outline-none focus:border-brand/50 disabled:opacity-50"
          >
            <option value="compatibility">Uyumluluk (R)</option>
            <option value="uniformity">Uniformity — kalabalıkta kaybol (U)</option>
          </select>
        </Row>
        <SpoofGroup
          disabled={!p.fingerprint.enabled}
          label="Aktif spoofing"
          flags={[
            ['spoofCanvas', 'Canvas'],
            ['spoofWebGL', 'WebGL'],
            ['spoofAudio', 'AudioContext'],
            ['spoofFonts', 'Font'],
            ['spoofNavigator', 'Navigator'],
            ['spoofTimezone', 'Timezone'],
            ['spoofLanguage', 'Language'],
            ['spoofPlugins', 'Plugins'],
            ['spoofHardware', 'Hardware'],
            ['spoofScreen', 'Screen'],
            ['spoofUserAgent', 'User-Agent'],
          ]}
          values={p.fingerprint}
          onToggle={(k, v) =>
            update({ ...p, fingerprint: { ...p.fingerprint, [k]: v } })
          }
        />
        <Row
          label="Her oturumda rastgele profil"
          description="Siteler donanım/saat dilimi/font sorduğunda rastgele ama tutarlı profil döner. Uniformity modunda yok sayılır."
        >
          <Switch
            checked={p.fingerprint.randomProfilePerSession}
            onCheckedChange={(v) =>
              update({ ...p, fingerprint: { ...p.fingerprint, randomProfilePerSession: v } })
            }
          />
        </Row>
      </Section>

      <Section title="WebRTC">
        <Row
          label="WebRTC koruması"
          description="STUN/TURN engeli + ICE adayı süzgeci + Chromium politikası. Kapalıyken gerçek IP sızabilir."
        >
          <Switch
            checked={p.webrtc.enabled}
            onCheckedChange={(v) =>
              update({ ...p, webrtc: { ...p.webrtc, enabled: v } })
            }
          />
        </Row>
        <Row label="WebRTC politikası">
          <select
            disabled={!p.webrtc.enabled}
            value={p.webrtc.policy}
            onChange={(e) =>
              update({ ...p, webrtc: { ...p.webrtc, policy: e.target.value as WebRtcConfig['policy'] } })
            }
            className="h-9 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-sm focus:outline-none focus:border-brand/50 disabled:opacity-50"
          >
            {WEBRTC_POLICIES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title="DNS">
        <Row
          label="DNS koruması"
          description="Sorguları güvenli çözücüye yönlendirir."
        >
          <Switch
            checked={p.dns.enabled}
            onCheckedChange={(v) => update({ ...p, dns: { ...p.dns, enabled: v } })}
          />
        </Row>
        <Row label="Mod">
          <select
            disabled={!p.dns.enabled}
            value={p.dns.mode}
            onChange={(e) => update({ ...p, dns: { ...p.dns, mode: e.target.value as DnsConfig['mode'] } })}
            className="h-9 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-sm focus:outline-none focus:border-brand/50 disabled:opacity-50"
          >
            {DNS_MODES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Row>
        {p.dns.mode === 'doh' && (
          <Row label="DoH URL">
            <Input
              className="w-80 font-mono text-xs"
              value={p.dns.dohUrl ?? ''}
              onChange={(e) => update({ ...p, dns: { ...p.dns, dohUrl: e.target.value } })}
              disabled={!p.dns.enabled}
            />
          </Row>
        )}
        <Row label="3. parti DNS engelle">
          <Switch
            checked={p.dns.blockThirdParty}
            onCheckedChange={(v) => update({ ...p, dns: { ...p.dns, blockThirdParty: v } })}
            disabled={!p.dns.enabled}
          />
        </Row>
      </Section>

      <Section title="HTTPS" description="Güvenli olmayan bağlantıları zorla/engelle.">
        <Row label="HTTPS zorlama">
          <Switch
            checked={p.https.forceHttps}
            onCheckedChange={(v) =>
              update({ ...p, https: { ...p.https, forceHttps: v } })
            }
          />
        </Row>
        <Row label="Karışık içerik engelle">
          <Switch
            checked={p.https.blockMixedContent}
            onCheckedChange={(v) =>
              update({ ...p, https: { ...p.https, blockMixedContent: v } })
            }
          />
        </Row>
        <Row label="HSTS preload">
          <Switch
            checked={p.https.hstsPreload}
            onCheckedChange={(v) =>
              update({ ...p, https: { ...p.https, hstsPreload: v } })
            }
          />
        </Row>
        <Row label="Geçersiz sertifika uyarısı">
          <Switch
            checked={p.https.warnOnInvalidCert}
            onCheckedChange={(v) =>
              update({ ...p, https: { ...p.https, warnOnInvalidCert: v } })
            }
          />
        </Row>
      </Section>

      <Section
        title="Tracker Engelleme"
        description="Yerleşik seed + HaGeZi Light, EasyList, EasyPrivacy, StevenBlack otomatik 12 saatte bir güncellenir. YouTube oynatma CDN'leri allowlist (mevcut YT korumasına dokunulmaz)."
      >
        <Row
          label="Aktif"
          description="Domain set O(1) eşleşme — ağ isteği yapılmadan önce iptal."
        >
          <Switch
            checked={p.trackers.enabled}
            onCheckedChange={(v) => update({ ...p, trackers: { ...p.trackers, enabled: v } })}
          />
        </Row>
        <Row label="Aktif listeler">
          <div className="flex flex-wrap gap-1">
            {p.trackers.lists.map((l) => (
              <span
                key={l}
                className="inline-flex items-center rounded-full border border-white/10 bg-bg-elevated/60 px-2 py-0.5 text-xs text-fg-muted"
              >
                {l}
              </span>
            ))}
          </div>
        </Row>
      </Section>

      <Section
        title="URL Temizleyici"
        description="Adres çubuğu ve gezinme sırasında utm_source, fbclid, gclid gibi izleme parametreleri otomatik kaldırılır."
      >
        <Row label="Tracking parametrelerini temizle">
          <Switch
            checked={p.urlCleaner.enabled}
            onCheckedChange={(v) => update({ ...p, urlCleaner: { enabled: v } })}
          />
        </Row>
      </Section>

      <Section
        title="Cookie Banner"
        description="Bilinen çerez rıza popup'ları gizlenir; 'Reddet' düğmesi otomatik tıklanır. Yeni sekmelerde geçerli olur."
      >
        <Row label="Otomatik reddet">
          <Switch
            checked={p.cookieBanner.autoReject}
            onCheckedChange={(v) => update({ ...p, cookieBanner: { autoReject: v } })}
          />
        </Row>
      </Section>

      <Section
        title="Banka Modu"
        description="Finans sitelerinde otomatik izole alan: fingerprint enjeksiyonu kapanır, yeşil nabız çerçevesi görünür, pano/konum engellenir."
      >
        <Row label="Otomatik Banka Modu">
          <Switch
            checked={p.bankMode?.enabled !== false}
            onCheckedChange={(v) => update({ ...p, bankMode: { enabled: v } })}
          />
        </Row>
      </Section>

      <Section
        title="Script Blocker"
        description="JavaScript'i tamamen kapatır — saf HTML+CSS. Maksimum güvenlik; çoğu site bozulur."
      >
        <Row label="JavaScript engelle">
          <Switch
            checked={!!p.scriptBlocker?.enabled}
            onCheckedChange={(v) => update({ ...p, scriptBlocker: { enabled: v } })}
          />
        </Row>
      </Section>

      <Section
        title="Çerezler"
        description="Çerez hırsızlığı koruması: 3. parti Set-Cookie ağda düşürülür; sayfa içi aşırı document.cookie okuması sınırlanır (XSS)."
      >
        <Row label="3. parti çerez engelle">
          <Switch
            checked={p.cookies.blockThirdParty}
            onCheckedChange={(v) =>
              update({ ...p, cookies: { ...p.cookies, blockThirdParty: v } })
            }
          />
        </Row>
        <Row label="First-party izolasyonu">
          <Switch
            checked={p.cookies.isolateFirstParty}
            onCheckedChange={(v) =>
              update({ ...p, cookies: { ...p.cookies, isolateFirstParty: v } })
            }
          />
        </Row>
        <Row label="Sekme başına izolasyon">
          <Switch
            checked={p.cookies.perTabIsolation}
            onCheckedChange={(v) =>
              update({ ...p, cookies: { ...p.cookies, perTabIsolation: v } })
            }
          />
        </Row>
        <Row label="Çıkışta otomatik sil">
          <Switch
            checked={p.cookies.autoDeleteOnExit}
            onCheckedChange={(v) =>
              update({ ...p, cookies: { ...p.cookies, autoDeleteOnExit: v } })
            }
          />
        </Row>
      </Section>

      <p className="mt-6 text-[11px] text-fg-subtle">
        Tracker engelleme, HTTPS zorlama, karışık içerik engelleme, URL temizleme ve DNT başlığı{' '}
        <code>networkGuard</code> ile gerçek ağ katmanında uygulanır. DoH, Chromium&apos;un yerleşik
        güvenli DNS çözücüsüyle (secure mode) çalışır; DoT desteklenmediği için DoT seçimi de DoH
        şablonuna düşer. Fingerprint spoofing ve cookie banner reddi sekmelere guest preload ile
        enjekte edilir — değişiklikler yeni açılan sekmelerde geçerli olur.
      </p>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-fg-muted">
        {title}
      </h2>
      {description && <p className="mb-2 text-xs text-fg-subtle">{description}</p>}
      <div className="glass divide-y divide-white/5 rounded-2xl">{children}</div>
    </section>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div>
        <div className="text-sm">{label}</div>
        {description && <div className="mt-0.5 text-xs text-fg-muted">{description}</div>}
      </div>
      <div className="pt-0.5">{children}</div>
    </div>
  );
}

function SpoofGroup({
  disabled,
  label,
  flags,
  values,
  onToggle,
}: {
  disabled: boolean;
  label: string;
  flags: Array<[keyof AppSettings['privacy']['fingerprint'], string]>;
  values: AppSettings['privacy']['fingerprint'];
  onToggle: (k: keyof AppSettings['privacy']['fingerprint'], v: boolean) => void;
}) {
  return (
    <div className={`px-4 py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="mb-2 text-xs uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {flags.map(([key, name]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-brand"
              checked={values[key] as boolean}
              disabled={disabled}
              onChange={(e) => onToggle(key, e.target.checked)}
            />
            {name}
          </label>
        ))}
      </div>
    </div>
  );
}

function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-bg-elevated/60 px-3 h-10 text-sm placeholder:text-fg-subtle focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/25 transition ${className ?? ''}`}
    />
  );
}