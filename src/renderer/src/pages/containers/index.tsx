import { useState } from 'react';
import { useContainers } from '@renderer/store/containers';
import type { TabGroupColor } from '@shared/types/tabs';

const COLORS: TabGroupColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'gray',
];

export default function ContainersPage() {
  const containers = useContainers((s) => s.containers);
  const rules = useContainers((s) => s.rules);
  const create = useContainers((s) => s.create);
  const rename = useContainers((s) => s.rename);
  const remove = useContainers((s) => s.remove);
  const addRule = useContainers((s) => s.addRule);
  const removeRule = useContainers((s) => s.removeRule);
  const [name, setName] = useState('');
  const [color, setColor] = useState<TabGroupColor>('purple');
  const [ruleDomain, setRuleDomain] = useState('');
  const [ruleContainer, setRuleContainer] = useState('');

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-fg">Site Konteynerleri</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Her konteyner ayrı çerez/depolama kullanır (çoklu hesap). Yeni sekmede sağ tık → Konteyner
        veya adres çubuğundan atayın.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-bg-elevated/60 p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Konteyner adı"
          className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-fg"
        />
        <select
          value={color}
          onChange={(e) => setColor(e.target.value as TabGroupColor)}
          className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-sm text-fg"
        >
          {COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg bg-brand/20 px-3 py-2 text-sm text-brand"
          onClick={() => {
            if (!name.trim()) return;
            create(name, color);
            setName('');
          }}
        >
          Oluştur
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {containers.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-bg-elevated/50 px-4 py-3"
          >
            <span className="flex-1 text-sm text-fg">{c.name}</span>
            <span className="text-[10px] text-fg-subtle">{c.color}</span>
            <input
              defaultValue={c.name}
              className="w-28 rounded border border-white/10 bg-black/20 px-2 py-1 text-xs"
              onBlur={(e) => rename(c.id, e.target.value)}
            />
            <button
              type="button"
              className="text-xs text-fg-muted hover:text-red-400"
              onClick={() => remove(c.id)}
            >
              Sil
            </button>
          </li>
        ))}
        {containers.length === 0 && (
          <li className="py-8 text-center text-sm text-fg-subtle">Henüz konteyner yok</li>
        )}
      </ul>

      <div className="mt-8 rounded-xl border border-white/10 bg-bg-elevated/40 p-4">
        <h2 className="text-sm font-semibold text-fg">Otomatik Konteyner Kuralları</h2>
        <p className="mt-1 text-xs text-fg-muted">Bu domain her zaman seçili konteynerde açılsın. Alt domainler otomatik dahil edilir (ör. <code className="rounded bg-white/10 px-1">example.com</code> → <code className="rounded bg-white/10 px-1">a.example.com</code> de eşleşir). <code className="rounded bg-white/10 px-1">*.example.com</code> yazımı da aynıdır.</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input
            value={ruleDomain}
            onChange={(e) => setRuleDomain(e.target.value)}
            placeholder="example.com veya *.example.com"
            className="min-w-[180px] flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-fg"
          />
          <select
            value={ruleContainer}
            onChange={(e) => setRuleContainer(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-fg"
          >
            <option value="">Konteyner seç</option>
            {containers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            type="button"
            className="rounded-lg bg-brand px-3 py-2 text-sm text-white disabled:opacity-40"
            disabled={!ruleDomain.trim() || !ruleContainer}
            onClick={() => {
              const id = addRule(ruleDomain, ruleContainer);
              if (id) { setRuleDomain(''); }
            }}
          >
            Kural Ekle
          </button>
        </div>
        <ul className="mt-3 space-y-1.5">
          {rules.map((r) => {
            const cname = containers.find((c) => c.id === r.containerId)?.name ?? r.containerId;
            return (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-fg">{r.rawDomain} <span className="text-fg-subtle">→</span> {cname}</span>
                <button type="button" onClick={() => removeRule(r.id)} className="text-xs text-fg-muted hover:text-red-400">Sil</button>
              </li>
            );
          })}
          {rules.length === 0 && <li className="py-2 text-center text-xs text-fg-subtle">Henüz kural yok</li>}
        </ul>
      </div>
    </div>
  );
}
