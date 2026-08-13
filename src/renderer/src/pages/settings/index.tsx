import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { Settings as SettingsIcon, Warning, Download, Lock, Search } from '@renderer/components/ui/icons';
import { Switch } from '@renderer/components/ui';
import { useSettings } from '@renderer/store/settings';
import { useTabs } from '@renderer/store/tabs';
import { useBookmarks } from '@renderer/store/bookmarks';
import { showToast } from '@renderer/components/layouts/toast-bus';
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

const SettingsSearchContext = createContext('');

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

  const toastDebounce = useRef<{ count: number; timer: number | null }>({ count: 0, timer: null });
  const scheduleSavedToast = () => {
    toastDebounce.current.count += 1;
    if (toastDebounce.current.timer) window.clearTimeout(toastDebounce.current.timer);
    toastDebounce.current.timer = window.setTimeout(() => {
      const c = toastDebounce.current.count;
      toastDebounce.current.count = 0;
      toastDebounce.current.timer = null;
      showToast(c === 1 ? 'Kaydedildi' : `${c} ayar güncellendi`, 'success', 1800);
    }, 700) as unknown as number;
  };

  const panic = async () => {
    await window.aether.privacy.panic();
    try {
      await window.aether.downloads.clearCompleted();
      localStorage.removeItem('aethernode.session.tabs');
    } catch {
      /* yoksay */
    }
    resetTabs();
  };

  const updateGeneral = <K extends keyof typeof settings.general>(
    key: K,
    value: (typeof settings.general)[K],
  ) => apply({ ...settings, general: { ...settings.general, [key]: value } }).then(() => scheduleSavedToast());

  const [searchRaw, setSearchRaw] = useState('');
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchRaw.trim()), 150);
    return () => window.clearTimeout(id);
  }, [searchRaw]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
        // Only when focus is inside settings page, hijack Ctrl+F to search box
        const inSettings = !!document.activeElement?.closest('[data-settings-page]');
        if (inSettings && !isInput) {
          e.preventDefault();
          searchRef.current?.focus();
        } else if (!isInput) {
          // also allow global Ctrl+F inside settings route
          const onSettings = window.location.hash.includes('settings') || document.querySelector('[data-settings-page]');
          if (onSettings) {
            e.preventDefault();
            searchRef.current?.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const matches = (text: string) => !search || text.toLowerCase().includes(search.toLowerCase());

  return (
    <div className="mx-auto max-w-3xl p-6" data-settings-page>
      <header className="mb-6 flex items-center gap-3">
        <SettingsIcon className="text-brand" />
        <h1 className="text-xl font-semibold">Ayarlar</h1>
      </header>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-bg-elevated/60 px-3">
        <Search className="h-4 w-4 text-fg-subtle" />
        <input
          ref={searchRef}
          value={searchRaw}
          onChange={(e) => setSearchRaw(e.target.value)}
          placeholder="Ayarlarda ara… (Ctrl+F)"
          className="h-10 w-full bg-transparent text-sm placeholder:text-fg-subtle focus:outline-none"
        />
        {searchRaw && (
          <button type="button" onClick={() => { setSearchRaw(''); setSearch(''); }} className="text-xs text-fg-muted hover:text-fg">Temizle</button>
        )}
      </div>
      {search && <p className="mb-3 text-xs text-fg-muted">“{search}” için sonuçlar</p>}

      <SettingsSearchContext.Provider value={search}>
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
        <Row label="Varsayılan tarayıcı">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await window.aether.app.setAsDefault();
                if (res) alert('AetherNode varsayılan tarayıcı olarak ayarlandı!');
                else alert('Ayarlama başarısız oldu veya zaten varsayılan.');
              } catch {
                alert('Bir hata oluştu.');
              }
            }}
            className="h-9 rounded-lg border border-white/10 bg-bg-elevated/60 px-4 text-sm font-medium hover:bg-white/5 active:bg-white/10 transition"
          >
            Varsayılan Yap
          </button>
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
        <Row label="Sekme çubuğu yerleşimi (Ctrl+Shift+V)">
          <select
            value={settings.general.tabLayout}
            onChange={(e) =>
              updateGeneral('tabLayout', e.target.value as 'horizontal' | 'vertical')
            }
            className="h-9 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-sm focus:outline-none focus:border-brand/50"
          >
            <option value="horizontal">Yatay (üstte)</option>
            <option value="vertical">Dikey (solda)</option>
          </select>
        </Row>
        <Row label="Tema Rengi">
          <div className="flex items-center gap-1.5">
            {(['purple', 'green', 'amber', 'red'] as const).map((c) => {
              const bg: Record<string, string> = { purple: '#7C3AED', green: '#10B981', amber: '#F59E0B', red: '#EF4444' };
              const active = (settings.general.accentTheme ?? 'purple') === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateGeneral('accentTheme', c)}
                  className={`h-7 w-7 rounded-full border-2 transition ${active ? 'border-white scale-110 shadow-glow' : 'border-white/20 hover:border-white/40'}`}
                  style={{ background: bg[c] }}
                  aria-label={c}
                  title={c}
                />
              );
            })}
            <select
              value={settings.general.accentTheme ?? 'purple'}
              onChange={(e) => updateGeneral('accentTheme', e.target.value as typeof settings.general.accentTheme)}
              className="ml-2 h-7 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-xs focus:outline-none focus:border-brand/50"
            >
              <option value="purple">Mor</option>
              <option value="green">Yeşil</option>
              <option value="amber">Amber</option>
              <option value="red">Kırmızı</option>
            </select>
          </div>
        </Row>
        <Row label="Zorla koyu tema (siteler)">
          <Switch
            checked={settings.general.forceDarkMode}
            onCheckedChange={(v) => updateGeneral('forceDarkMode', v)}
          />
        </Row>
        <Row label="Fare hareketleri (sağ tık + sürükle)">
          <Switch
            checked={settings.general.mouseGestures}
            onCheckedChange={(v) => updateGeneral('mouseGestures', v)}
          />
        </Row>
        <Row label="Boşta sekmeleri arşivle">
          <Switch
            checked={settings.general.autoArchiveTabs}
            onCheckedChange={(v) => updateGeneral('autoArchiveTabs', v)}
          />
        </Row>
        <Row label="Arşiv eşiği (dakika)">
          <input
            type="number"
            min={5}
            max={1440}
            value={settings.general.autoArchiveMinutes}
            onChange={(e) => updateGeneral('autoArchiveMinutes', Number(e.target.value) || 60)}
            className="h-9 w-24 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-sm"
          />
        </Row>
        <Row label="Kaynak sınırlayıcı (erken uyut)">
          <Switch
            checked={settings.general.resourceLimiter}
            onCheckedChange={(v) => updateGeneral('resourceLimiter', v)}
          />
        </Row>
        <Row label="Ağaç stili dikey sekmeler">
          <Switch
            checked={settings.general.treeTabs}
            onCheckedChange={(v) => updateGeneral('treeTabs', v)}
          />
        </Row>
        <Row label="Seçim çevirisi">
          <Switch
            checked={settings.general.selectionTranslate}
            onCheckedChange={(v) => updateGeneral('selectionTranslate', v)}
          />
        </Row>
        <Row label="UI ses efektleri">
          <Switch
            checked={settings.general.soundEffectsEnabled}
            onCheckedChange={(v) => updateGeneral('soundEffectsEnabled', v)}
          />
        </Row>
        {settings.general.soundEffectsEnabled && (
          <Row label="Ses seviyesi">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.general.soundEffectsVolume}
                onChange={(e) => updateGeneral('soundEffectsVolume', Number(e.target.value))}
                className="w-32 accent-brand"
              />
              <span className="text-xs text-fg-muted">{Math.round(settings.general.soundEffectsVolume * 100)}%</span>
            </div>
          </Row>
        )}
        <Row label="Çeviri hedef dili">
          <input
            value={settings.general.translateTarget}
            onChange={(e) => updateGeneral('translateTarget', e.target.value || 'tr')}
            className="h-9 w-24 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-sm"
            placeholder="tr"
          />
        </Row>
        <Row label="İçe aktar / Workspaces / Boosts">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['import', 'İçe aktar'],
                ['library', 'Kütüphane'],
                ['workspaces', 'Workspaces'],
                ['containers', 'Konteynerler'],
                ['boosts', 'Boosts'],
              ] as const
            ).map(([route, label]) => (
              <button
                key={route}
                type="button"
                className="rounded-lg bg-white/10 px-2 py-1 text-xs text-fg hover:bg-white/15"
                onClick={() => useTabs.getState().open(`aethernode://${route}`)}
              >
                {label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Parmak İzi Koruması">
        <Row label="Koruma modu">
          <select
            value={settings.privacy.fingerprint.mode ?? 'compatibility'}
            onChange={(e) => {
              void apply({
                ...settings,
                privacy: {
                  ...settings.privacy,
                  fingerprint: {
                    ...settings.privacy.fingerprint,
                    mode: e.target.value as 'compatibility' | 'uniformity',
                  },
                },
              });
              showToast(
                'Değişikliğin geçerli olması için açık sekmeleri yenile',
                'info',
                6000,
              );
            }}
            className="h-9 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-sm focus:outline-none focus:border-brand/50"
          >
            <option value="compatibility">Uyumluluk — randomizasyon (siteler daha az kırılır)</option>
            <option value="uniformity">Uniformity — kalabalıkta kaybol (maks. anonimlik)</option>
          </select>
        </Row>
        <div className="px-4 py-3 text-[11.5px] leading-relaxed text-fg-subtle">
          Uniformity modunda tüm AetherNode kullanıcıları aynı sabit profili raporlar (1920×1080
          ekran, sabit donanım, UTC saat dilimi, sabit Client Hints) — ne kadar çok kullanıcı, o
          kadar güçlü anonimlik. Bazı sitelerde bot doğrulaması/captcha tetiklenebilir; banka ve
          arama motorlarında koruma otomatik devre dışı kalmaya devam eder.
        </div>
      </Section>

      <AutofillSection />

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

      <BackupSection />

      <Section title="Gizlilik & Güvenlik">
        <Row label="Kasa otomatik kilitleme">
          <div className="flex items-center gap-2">
            <select
              value={String(settings.security.vaultAutoLockMinutes ?? 5)}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                void useSettings.getState().apply({ ...settings, security: { ...settings.security, vaultAutoLockMinutes: v } });
              }}
              className="h-8 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-xs"
            >
              <option value="0">Kapalı</option>
              <option value="2">2 dk</option>
              <option value="5">5 dk</option>
              <option value="10">10 dk</option>
              <option value="30">30 dk</option>
            </select>
            <span className="text-[11px] text-fg-subtle">Hareketsizlik sonrası kasa kilitlenir.</span>
          </div>
        </Row>
        <Row label="Varsayılan korumalar">
          <span className="text-xs text-fg-muted">
            Fingerprint, DNS over HTTPS, HTTPS zorlama ve tracker engelleme varsayılan olarak açıktır.
          </span>
        </Row>
        <Row label="Güvenlik laboratuvarı">
          <button
            type="button"
            onClick={() => useTabs.getState().open('aethernode://security-lab')}
            className="rounded-lg border border-white/10 bg-bg-elevated/60 px-3 py-1.5 text-xs transition hover:border-brand/40 hover:text-brand"
          >
            Karşılaştırmalı test sayfasını aç
          </button>
        </Row>
      </Section>

      <Section title="Hakkımızda">
        <Row label="AetherNode Secure Browser">
          <span className="text-xs text-fg-muted">Privacy-first · v1.0</span>
        </Row>
        <Row label="Resmi site">
          <button
            type="button"
            onClick={() => useTabs.getState().open('https://aethernodevpn.com/')}
            className="text-xs text-brand underline hover:text-brand-600"
          >
            https://aethernodevpn.com/
          </button>
        </Row>
        <div className="px-4 py-3 text-xs leading-relaxed text-fg-subtle">
          AetherNode, gizliliğinizi koruyan hızlı ve güvenli bir tarayıcıdır. Geri bildirim ve destek için resmi sitemizi ziyaret edin.
        </div>
      </Section>
      </SettingsSearchContext.Provider>
      {search && (() => {
        // Basit global eşleşme kontrolü: hiçbir Row label'ı eşleşmiyorsa mesaj göster
        const allLabels = [
          'Varsayılan arama motoru','Bellek tasarrufu','Başlangıç sayfası','Do Not Track','User-Agent kimliği','Sekme çubuğu yerleşimi','Tema Rengi','Hoş geldin turu','Zorla koyu tema','Fare hareketleri','Boşta sekmeleri arşivle','Arşiv eşiği','Kaynak sınırlayıcı','Ağaç stili dikey sekmeler','Seçim çevirisi','UI ses efektleri','Çeviri hedef dili','İçe aktar / Workspaces / Boosts','Koruma modu','Otomatik Doldurma','Derin temizlik','Panik Tuşu','Yedekleme ve Geri Yükleme','Kasa otomatik kilitleme','Varsayılan korumalar','Güvenlik laboratuvarı','Hakkımızda','AetherNode','Versiyon',
        ];
        const hasMatch = allLabels.some((l) => l.toLowerCase().includes(search.toLowerCase()));
        return hasMatch ? null : <p className="py-6 text-center text-sm text-fg-muted">Sonuç bulunamadı</p>;
      })()}
    </div>
  );
}

interface AfProfile {
  id: string;
  name: string;
  fields: Record<string, string | undefined>;
}

interface AfCard {
  id: string;
  label: string;
  cardholderName: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
}

const PROFILE_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'firstName', label: 'Ad' },
  { key: 'lastName', label: 'Soyad' },
  { key: 'email', label: 'E-posta' },
  { key: 'phone', label: 'Telefon' },
  { key: 'addressLine1', label: 'Adres' },
  { key: 'addressLine2', label: 'Adres 2' },
  { key: 'city', label: 'Şehir' },
  { key: 'postalCode', label: 'Posta kodu' },
  { key: 'country', label: 'Ülke' },
];

function AutofillSection() {
  const [profiles, setProfiles] = useState<AfProfile[]>([]);
  const [cards, setCards] = useState<AfCard[]>([]);
  const [vaultLocked, setVaultLocked] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [profileName, setProfileName] = useState('');
  const [cardForm, setCardForm] = useState({
    label: '',
    cardholderName: '',
    pan: '',
    cvv: '',
    expiryMonth: '',
    expiryYear: '',
  });
  const [showCardForm, setShowCardForm] = useState(false);

  const refresh = async () => {
    const p = await window.aether.autofill.profiles();
    if (p.ok) setProfiles((p.data as AfProfile[]) ?? []);
    const c = await window.aether.autofill.cards();
    if (c.ok) {
      setCards((c.data as AfCard[]) ?? []);
      setVaultLocked(false);
    } else {
      setCards([]);
      setVaultLocked(true);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = async () => {
    if (!profileName.trim()) {
      showToast('Profil adı gerekli (örn. "Ev adresim")', 'error');
      return;
    }
    const res = await window.aether.autofill.saveProfile({
      name: profileName.trim(),
      fields: editing,
    });
    if (res.ok) {
      showToast('Profil kaydedildi', 'success');
      setProfileName('');
      setEditing({});
      void refresh();
    } else {
      showToast(`Kaydedilemedi: ${res.error}`, 'error');
    }
  };

  const saveCard = async () => {
    const { label, pan, expiryMonth, expiryYear } = cardForm;
    if (!label.trim() || pan.replace(/\D/g, '').length < 8 || !expiryMonth || !expiryYear) {
      showToast('Kart etiketi, numarası ve son kullanma tarihi gerekli', 'error');
      return;
    }
    const res = await window.aether.autofill.saveCard({
      label: label.trim(),
      cardholderName: cardForm.cardholderName,
      pan: pan.replace(/\s/g, ''),
      cvv: cardForm.cvv || undefined,
      expiryMonth,
      expiryYear,
    });
    if (res.ok) {
      showToast('Kart şifreli kasaya kaydedildi', 'success');
      setCardForm({ label: '', cardholderName: '', pan: '', cvv: '', expiryMonth: '', expiryYear: '' });
      setShowCardForm(false);
      void refresh();
    } else {
      showToast(`Kaydedilemedi: ${res.error}`, 'error');
    }
  };

  const input =
    'h-8 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-xs focus:border-brand/50 focus:outline-none';

  return (
    <Section title="Otomatik Doldurma">
      <div className="px-4 py-3">
        <p className="mb-3 text-[11.5px] leading-relaxed text-fg-subtle">
          Form alanları tamamen yerel olarak sınıflandırılır — hiçbir servise veri gitmez.
          Profiller cihaz anahtarıyla, kartlar ayrıca şifre kasası master parolasıyla (AES-256-GCM
          + PBKDF2) şifrelenir. Kart doldurma yalnızca HTTPS sayfalarda ve kasa açıkken çalışır;
          üçüncü parti ödeme iframe&apos;lerinde devre dışıdır. Kısayol: Ctrl+Shift+F.
        </p>

        {/* Profiller */}
        <h3 className="mb-1.5 text-xs font-semibold text-fg">Profiller</h3>
        {profiles.length === 0 && (
          <p className="mb-2 text-[11px] text-fg-subtle">Henüz profil yok.</p>
        )}
        {profiles.map((p) => (
          <div
            key={p.id}
            className="mb-1.5 flex items-center justify-between rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5"
          >
            <div className="min-w-0">
              <span className="text-xs font-medium text-fg">{p.name}</span>
              <span className="ml-2 text-[10.5px] text-fg-subtle">
                {[p.fields.email, p.fields.city].filter(Boolean).join(' — ')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                void window.aether.autofill.removeProfile(p.id).then(() => refresh());
              }}
              className="rounded px-2 py-1 text-[10.5px] text-fg-subtle hover:bg-white/10 hover:text-red-300"
            >
              Sil
            </button>
          </div>
        ))}

        <div className="mb-4 mt-2 rounded-lg border border-white/8 bg-black/20 p-2.5">
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder='Profil adı (örn. "Ev adresim")'
            className={`${input} mb-2 w-56`}
          />
          <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {PROFILE_FIELDS.map((f) => (
              <input
                key={f.key}
                type="text"
                value={editing[f.key] ?? ''}
                onChange={(e) => setEditing((s) => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.label}
                className={input}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => void saveProfile()}
            className="rounded-lg bg-brand/20 px-3 py-1.5 text-[11px] font-medium text-brand hover:bg-brand/30"
          >
            Profili kaydet
          </button>
        </div>

        {/* Kartlar */}
        <h3 className="mb-1.5 text-xs font-semibold text-fg">Kartlar</h3>
        {vaultLocked ? (
          <p className="mb-2 text-[11px] text-amber-300">
            Kart yönetimi için şifre kasasını aç (Kasa sayfası) — kartlar master parolanla
            mühürlüdür.
          </p>
        ) : (
          <>
            {cards.length === 0 && (
              <p className="mb-2 text-[11px] text-fg-subtle">Kayıtlı kart yok.</p>
            )}
            {cards.map((c) => (
              <div
                key={c.id}
                className="mb-1.5 flex items-center justify-between rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5"
              >
                <span className="text-xs text-fg">
                  {c.label} •••• {c.last4}
                  <span className="ml-2 text-[10.5px] text-fg-subtle">
                    {c.expiryMonth}/{c.expiryYear}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void window.aether.autofill.removeCard(c.id).then(() => refresh());
                  }}
                  className="rounded px-2 py-1 text-[10.5px] text-fg-subtle hover:bg-white/10 hover:text-red-300"
                >
                  Sil
                </button>
              </div>
            ))}
            {!showCardForm ? (
              <button
                type="button"
                onClick={() => setShowCardForm(true)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-fg-muted hover:bg-white/10 hover:text-fg"
              >
                Kart ekle
              </button>
            ) : (
              <div className="rounded-lg border border-white/8 bg-black/20 p-2.5">
                <div className="mb-2 grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={cardForm.label}
                    onChange={(e) => setCardForm((s) => ({ ...s, label: e.target.value }))}
                    placeholder='Etiket (örn. "İş kartım")'
                    className={input}
                  />
                  <input
                    type="text"
                    value={cardForm.cardholderName}
                    onChange={(e) =>
                      setCardForm((s) => ({ ...s, cardholderName: e.target.value }))
                    }
                    placeholder="Kart üzerindeki isim"
                    className={input}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardForm.pan}
                    onChange={(e) => setCardForm((s) => ({ ...s, pan: e.target.value }))}
                    placeholder="Kart numarası"
                    className={`${input} col-span-2`}
                    autoComplete="off"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardForm.expiryMonth}
                      onChange={(e) =>
                        setCardForm((s) => ({ ...s, expiryMonth: e.target.value.slice(0, 2) }))
                      }
                      placeholder="AA"
                      className={`${input} w-14`}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardForm.expiryYear}
                      onChange={(e) =>
                        setCardForm((s) => ({ ...s, expiryYear: e.target.value.slice(0, 4) }))
                      }
                      placeholder="YYYY"
                      className={`${input} w-20`}
                    />
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={cardForm.cvv}
                    onChange={(e) =>
                      setCardForm((s) => ({ ...s, cvv: e.target.value.slice(0, 4) }))
                    }
                    placeholder="CVV (isteğe bağlı)"
                    className={`${input} w-32`}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void saveCard()}
                  className="rounded-lg bg-brand/20 px-3 py-1.5 text-[11px] font-medium text-brand hover:bg-brand/30"
                >
                  Kartı şifreli kaydet
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Section>
  );
}

function BackupSection() {
  const [exportPw, setExportPw] = useState('');
  const [exportPw2, setExportPw2] = useState('');
  const [importPw, setImportPw] = useState('');
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const bookmarks = useBookmarks((s) => s.nodes);
  const importBookmarks = useBookmarks((s) => s.importJson);

  const doExport = async () => {
    if (exportPw.length < 6) {
      showToast('Yedek parolası en az 6 karakter olmalı', 'error');
      return;
    }
    if (exportPw !== exportPw2) {
      showToast('Parolalar eşleşmiyor', 'error');
      return;
    }
    setBusy('export');
    try {
      const res = await window.aether.backup.export(exportPw, bookmarks);
      if (!res.ok) {
        showToast(`Yedekleme başarısız: ${res.error ?? 'bilinmeyen hata'}`, 'error');
      } else if (res.data) {
        showToast(`Şifreli yedek kaydedildi: ${res.data.items.join(', ')}`, 'success', 7000);
        setExportPw('');
        setExportPw2('');
      }
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    if (!importPw) {
      showToast('Yedeğin parolasını gir', 'error');
      return;
    }
    setBusy('import');
    try {
      const res = await window.aether.backup.import(importPw);
      if (!res.ok) {
        showToast(`Geri yükleme başarısız: ${res.error ?? 'bilinmeyen hata'}`, 'error');
      } else if (res.data) {
        if (res.data.bookmarks) {
          importBookmarks(res.data.bookmarks as never);
        }
        showToast(`Geri yüklendi: ${res.data.items.join(', ')}`, 'success', 8000);
        setImportPw('');
      }
    } finally {
      setBusy(null);
    }
  };

  const pwInput =
    'h-9 w-44 rounded-lg border border-white/10 bg-bg-elevated/60 px-2 text-sm focus:border-brand/50 focus:outline-none';

  return (
    <Section title="Yedekleme ve Geri Yükleme">
      <div className="px-4 py-3">
        <div className="mb-3 flex items-start gap-2 text-xs text-fg-muted">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
          <span>
            Yedek dosyası AES-256-GCM + PBKDF2 ile senin seçtiğin parolayla şifrelenir — parolasız
            içerik okunamaz. Kapsam: ayarlar, geçmiş, yer imleri, şifre kasası ve güvenli notlar
            (kasa içeriği ayrıca master parolanla mühürlü kalır, çifte katman).
          </span>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={exportPw}
            onChange={(e) => setExportPw(e.target.value)}
            placeholder="Yedek parolası (min 6)"
            className={pwInput}
            autoComplete="new-password"
          />
          <input
            type="password"
            value={exportPw2}
            onChange={(e) => setExportPw2(e.target.value)}
            placeholder="Parola (tekrar)"
            className={pwInput}
            autoComplete="new-password"
          />
          <button
            onClick={() => void doExport()}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-bg-elevated/60 px-3 py-1.5 text-xs transition hover:border-brand/40 hover:text-brand disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {busy === 'export' ? 'Yedekleniyor…' : 'Şifreli yedek al'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={importPw}
            onChange={(e) => setImportPw(e.target.value)}
            placeholder="Yedeğin parolası"
            className={pwInput}
            autoComplete="off"
          />
          <button
            onClick={() => void doImport()}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
          >
            {busy === 'import' ? 'Geri yükleniyor…' : 'Yedekten geri yükle'}
          </button>
          <span className="text-[11px] text-fg-subtle">
            Geri yükleme mevcut verilerin üzerine yazar.
          </span>
        </div>
      </div>
    </Section>
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
  const search = useContext(SettingsSearchContext);
  // Otomatik filtre: eşleşmeyen satırı gizle
  if (search) {
    const hay = `${label}`.toLowerCase();
    if (!hay.includes(search.toLowerCase())) {
      // Çocuk açıklamada eşleşme olabilir — yine de gizlemeyi esnek tut, sadece label bazlı filtre
      // Eğer label eşleşmiyorsa gizle (başlık/açıklama eşleşmesi için Section seviyesinde zaten kontrol var)
      return null;
    }
  }
  const highlight = (text: string) => {
    if (!search) return text;
    const idx = text.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-amber-400/30 px-0.5 text-amber-100">{text.slice(idx, idx + search.length)}</mark>
        {text.slice(idx + search.length)}
      </>
    );
  };
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm">{highlight(label)}</span>
      <div>{children}</div>
    </div>
  );
}