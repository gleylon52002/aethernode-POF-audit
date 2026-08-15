import { Command, Shield, Lock, EyeOff, LayoutGrid } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl p-8 space-y-12 pb-32">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-fg">AetherNode Kullanım Kılavuzu</h1>
        <p className="text-fg-muted text-lg">Güvenli ve özgür bir web deneyimi için tüm özellikler ve kısayollar.</p>
      </header>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-fg flex items-center gap-2">
          <Command className="w-5 h-5 text-brand" />
          Klavye Kısayolları
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ShortcutCard label="Yeni Sekme (Normal)" keys={['Ctrl', 'T']} desc="Standart bir sekme açar." />
          <ShortcutCard label="Yeni Sekme (Gizli)" keys={['Ctrl', 'Shift', 'N']} desc="Kalıcı iz bırakmayan sekme açar." />
          <ShortcutCard label="AetherNode Kalkanı" keys={['Ctrl', 'Shift', 'X']} desc="İzleyici engelleyici ayarlarını açar." />
          <ShortcutCard label="Komut Paleti" keys={['Ctrl', 'K']} desc="Tüm işlemleri arayıp anında bulun." />
          <ShortcutCard label="Split View (Yan Yana)" keys={['Ctrl', 'Shift', 'L']} desc="İki sekmeyi tek ekranda açar." />
          <ShortcutCard label="Hızlı Çeviri" keys={['Ctrl', 'Shift', 'E']} desc="Aktif sekmeyi çevirir." />
          <ShortcutCard label="Boss Key (Kamuflaj)" keys={['Shift', 'ESC']} desc="Acil çıkış ve sahte ekran modu." />
          <ShortcutCard label="Şifre Kasası Kilidi" keys={['Ctrl', 'Shift', 'P']} desc="Şifreleri hızla açar/kilitler." />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-fg flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand" />
          Güvenlik Özellikleri
        </h2>
        <div className="grid grid-cols-1 gap-4">
          <FeatureCard 
            icon={<Shield className="text-green-500 w-6 h-6" />}
            title="Sıfır Güven (Zero-Trust) Mimarisi"
            desc="Hiçbir sayfa varsayılan olarak depolama, mikrofon, veya kamera iznine sahip değildir. Gelişmiş koruma duvarımız siteleri birbirinden tamamen izole eder."
          />
          <FeatureCard 
            icon={<Lock className="text-orange-500 w-6 h-6" />}
            title="Kullan-At (Burner) Sekmeler"
            desc="Her 'Burner' sekme kendi izole 'partition'unda çalışır. Sekme kapatıldığında tüm çerezler, yerel depolama (localStorage) ve veriler anında imha edilir. Gelecekte geçmişe bile kaydedilmez."
          />
          <FeatureCard 
            icon={<EyeOff className="text-purple-500 w-6 h-6" />}
            title="Panik Tuşu (Kamuflaj)"
            desc="Shift+ESC tuşuna bastığınızda tarayıcınız anında Wikipedia gibi masum bir siteye dönüşür ve tüm sekmeleriniz geçici olarak susturulur. 3 saniye ESC tuşuna basılı tutana kadar gerçek sekmeler görünmez."
          />
          <FeatureCard 
            icon={<LayoutGrid className="text-blue-500 w-6 h-6" />}
            title="Dinamik Aura Efekti"
            desc="Girdiğiniz web sitesinin favicon renklerine uyum sağlayarak tarayıcı arayüzünde çok şık bir renk yansıması (Aura) oluşturur."
          />
        </div>
      </section>
    </div>
  );
}

function ShortcutCard({ label, keys, desc }: { label: string, keys: string[], desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:bg-white/10 transition">
      <div className="flex justify-between items-start mb-2">
        <span className="font-medium text-fg">{label}</span>
        <div className="flex gap-1">
          {keys.map(k => (
            <span key={k} className="px-2 py-1 bg-black/50 rounded text-xs font-mono text-fg-muted border border-white/10">{k}</span>
          ))}
        </div>
      </div>
      <p className="text-sm text-fg-muted">{desc}</p>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex gap-4 hover:border-brand/50 transition">
      <div className="flex-shrink-0 mt-1">{icon}</div>
      <div>
        <h3 className="font-medium text-fg text-lg mb-1">{title}</h3>
        <p className="text-fg-muted text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
