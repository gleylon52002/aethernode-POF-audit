import { useEffect } from 'react';
import { Badge, Button, Switch } from '@renderer/components/ui';
import { Network as NetworkIcon } from '@renderer/components/ui/icons';
import { useNetwork, type CapturedRequest } from '@renderer/store/network';

// Ağ Paneli — Aşama 6.
//
// Inspector açıkken networkGuard her webRequest'i yakalar ve IPC.network.captured
// ile renderer'a iter. Store son 500 isteği ring-buffer olarak tutar. Kapatınca
// guard kancaları kopar, akış durur.

const RESOURCE_TONE: Record<string, 'brand' | 'muted' | 'warning' | 'success'> = {
  xhr: 'brand',
  fetch: 'brand',
  script: 'muted',
  stylesheet: 'muted',
  image: 'muted',
  font: 'muted',
  document: 'success',
  websocket: 'warning',
  mainFrame: 'success',
  subFrame: 'success',
};

export default function NetworkPage() {
  const requests = useNetwork((s) => s.requests);
  const enabled = useNetwork((s) => s.enabled);
  const enable = useNetwork((s) => s.enable);
  const disable = useNetwork((s) => s.disable);
  const clear = useNetwork((s) => s.clear);
  const subscribeCaptured = useNetwork((s) => s.subscribeCaptured);

  useEffect(() => {
    const off = subscribeCaptured();
    return off;
  }, [subscribeCaptured]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NetworkIcon className="text-brand" />
          <div>
            <h1 className="text-xl font-semibold">Ağ Paneli</h1>
            <p className="text-xs text-fg-muted">
              Inspector {enabled ? 'aktif' : 'kapalı'} · {requests.length} istek yakalandı
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-fg-muted">Inspector</span>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => (v ? void enable() : void disable())}
            />
          </label>
          <Button variant="outline" size="sm" onClick={clear} disabled={requests.length === 0}>
            Temizle
          </Button>
        </div>
      </header>

      {requests.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-sm text-fg-muted">
          {enabled
            ? 'İstek bekleniyor — bir sekmede sayfa açın.'
            : 'Inspector kapalı. Açıp bir sekmede gezinti yapın.'}
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[64px_56px_1fr_120px_90px] gap-2 border-b border-white/10 px-4 py-2 text-[11px] uppercase tracking-wider text-fg-subtle">
            <span>Yöntem</span>
            <span>Tür</span>
            <span>URL</span>
            <span>Kaynak</span>
            <span className="text-right">Zaman</span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {requests.map((r) => (
              <RequestRow key={r.id} req={r} />
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] text-fg-subtle">
        Aşama 6: yakalanan istekler görsel amaçlıdır. Reklam/tracker engelleme ve HTTPS upgrade
        kuralları Aşama 6b&apos;de bu kanala uygulanacak.
      </p>
    </div>
  );
}

function RequestRow({ req }: { req: CapturedRequest }) {
  const tone = RESOURCE_TONE[req.resourceType] ?? 'muted';
  return (
    <div className="grid grid-cols-[64px_56px_1fr_120px_90px] items-center gap-2 border-b border-white/5 px-4 py-2 text-xs hover:bg-white/5">
      <span className="font-mono font-medium">{req.method}</span>
      <Badge tone={tone}>{shortType(req.resourceType)}</Badge>
      <span className="truncate font-mono text-fg-muted" title={req.url}>
        {req.url}
      </span>
      <span className="truncate text-fg-muted">{req.resourceType}</span>
      <span className="text-right text-fg-subtle tabular-nums">
        {new Date(req.at).toLocaleTimeString('tr-TR', { hour12: false })}
      </span>
    </div>
  );
}

function shortType(t: string): string {
  switch (t) {
    case 'mainFrame':
    case 'subFrame':
      return 'frame';
    case 'stylesheet':
      return 'css';
    case 'websocket':
      return 'ws';
    default:
      return t;
  }
}