import { useState } from 'react';
import { useBoosts } from '@renderer/store/boosts';
import { showToast } from '@renderer/components/layouts/toast-bus';

export default function BoostsPage() {
  const boosts = useBoosts((s) => s.boosts);
  const upsert = useBoosts((s) => s.upsert);
  const remove = useBoosts((s) => s.remove);
  const [host, setHost] = useState('');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');
  const [enabled, setEnabled] = useState(true);

  const edit = (h: string) => {
    const b = boosts.find((x) => x.host === h);
    if (!b) return;
    setHost(b.host);
    setCss(b.css);
    setJs(b.js);
    setEnabled(b.enabled);
  };

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-fg">Site Boosts</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Site başına özel CSS/JS. Uzantı mağazası yerine yerel kullanıcı betikleri —
        yalnızca sizin cihazınızda çalışır.
      </p>

      <div className="mt-6 space-y-3 rounded-xl border border-white/10 bg-bg-elevated/60 p-4">
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="örnek.com"
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-fg"
        />
        <textarea
          value={css}
          onChange={(e) => setCss(e.target.value)}
          placeholder="/* CSS */"
          rows={5}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-fg"
        />
        <textarea
          value={js}
          onChange={(e) => setJs(e.target.value)}
          placeholder="// JavaScript (dikkatli kullanın)"
          rows={5}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-fg"
        />
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Etkin
        </label>
        <button
          type="button"
          className="rounded-lg bg-brand/20 px-3 py-2 text-sm text-brand"
          onClick={() => {
            if (!host.trim()) return;
            upsert({ host, css, js, enabled });
            showToast('Boost kaydedildi — sayfayı yenileyin', 'success');
          }}
        >
          Kaydet
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {boosts.map((b) => (
          <li
            key={b.host}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3"
          >
            <button
              type="button"
              className="flex-1 truncate text-left text-sm text-fg"
              onClick={() => edit(b.host)}
            >
              {b.host} {!b.enabled && <span className="text-fg-subtle">(kapalı)</span>}
            </button>
            <button
              type="button"
              className="text-xs text-fg-muted hover:text-red-400"
              onClick={() => remove(b.host)}
            >
              Sil
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
