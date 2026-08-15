const fs = require('fs');

let c = fs.readFileSync('src/renderer/src/pages/settings/index.tsx', 'utf8');

// 1. Add activeTab state
c = c.replace(
  'const [cleaning, setCleaning] = useState(false);',
  `const [cleaning, setCleaning] = useState(false);
  const [activeTab, setActiveTab] = useState('Genel');
  const TABS = ['Genel', 'Görünüm', 'Arama', 'Ağ / DNS', 'Gizlilik & Güvenlik', 'Laboratuvar (Deneysel)', 'Sıfırla'];`
);

// 2. Change Section to filter by activeTab if no search
c = c.replace(
  'function Section({ title, children }: { title: string; children: React.ReactNode }) {',
  `const SettingsTabContext = createContext('');
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const search = useContext(SettingsSearchContext);
  const activeTab = useContext(SettingsTabContext);
  if (!search && activeTab && activeTab !== title && activeTab !== 'Sıfırla' /* Sıfırla isn't a strict section match sometimes */) {
    if (!(activeTab === 'Sıfırla' && title === 'Panik Tuşu & Temizlik')) {
      return null;
    }
  }
`
);

// 3. Re-write the UI layout wrapper
const oldHeader = `  return (
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

      <SettingsSearchContext.Provider value={search}>`;

const newHeader = `  return (
    <div className="flex h-full w-full" data-settings-page>
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-white/5 bg-bg-base/50 p-6 flex flex-col gap-1 overflow-y-auto hidden md:flex">
        <div className="mb-6 flex items-center gap-3 px-2">
          <SettingsIcon className="text-brand" />
          <h1 className="text-lg font-semibold tracking-wide">Ayarlar</h1>
        </div>
        
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setActiveTab(t); setSearchRaw(''); setSearch(''); }}
            className={\`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 \${
              activeTab === t && !search
                ? 'bg-brand/10 text-brand shadow-[inset_2px_0_0_0_var(--brand)]'
                : 'text-fg-muted hover:bg-white/5 hover:text-fg'
            }\`}
          >
            {t}
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl p-6 lg:p-10">
          <div className="mb-8 flex items-center gap-2 rounded-xl border border-white/10 bg-bg-elevated/60 px-4 shadow-sm focus-within:border-brand/40 focus-within:ring-1 focus-within:ring-brand/40 transition-all">
            <Search className="h-4 w-4 text-fg-subtle" />
            <input
              ref={searchRef}
              value={searchRaw}
              onChange={(e) => setSearchRaw(e.target.value)}
              placeholder="Ayarlarda ara… (Ctrl+F)"
              className="h-11 w-full bg-transparent text-sm placeholder:text-fg-subtle focus:outline-none"
            />
            {searchRaw && (
              <button type="button" onClick={() => { setSearchRaw(''); setSearch(''); }} className="text-xs font-medium text-brand hover:text-brand-light">Temizle</button>
            )}
          </div>
          {search && <p className="mb-5 text-sm text-fg-muted">“{search}” için sonuçlar ({activeTab} dışındaki tüm bölümlerde aranıyor)</p>}
          {!search && <h2 className="mb-6 text-2xl font-bold tracking-tight text-fg">{activeTab === 'Sıfırla' ? 'Temizlik ve Sıfırlama' : activeTab}</h2>}

          <SettingsSearchContext.Provider value={search}>
            <SettingsTabContext.Provider value={activeTab}>`;

c = c.replace(oldHeader, newHeader);

// 4. Close the provider correctly
const oldFooter = `      </SettingsSearchContext.Provider>
    </div>
  );
}

function Section`;

const newFooter = `            </SettingsTabContext.Provider>
          </SettingsSearchContext.Provider>
        </div>
      </main>
    </div>
  );
}

function Section`;

c = c.replace(oldFooter, newFooter);

fs.writeFileSync('src/renderer/src/pages/settings/index.tsx', c);
console.log('Settings refactored successfully.');
