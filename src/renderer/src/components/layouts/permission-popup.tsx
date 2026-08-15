import { useEffect, useState } from 'react';
import { Button } from '@renderer/components/ui/button';

interface PermissionRequest {
  id: string;
  origin: string;
  permission: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  media: 'Kamera ve Mikrofon',
  geolocation: 'Konum',
  notifications: 'Bildirimler',
};

export function PermissionPopup() {
  const [requests, setRequests] = useState<PermissionRequest[]>([]);

  useEffect(() => {
    return window.aether.on('aethernode/security/permissionsRequest', (raw: unknown) => {
      const req = raw as PermissionRequest;
      if (req && req.id && req.origin) {
        setRequests((prev) => [...prev, req]);
      }
    });
  }, []);

  const handleRespond = (id: string, allow: boolean) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    window.aether.send('aethernode/security/permissionsRespond', id, allow);
  };

  if (requests.length === 0) return null;

  return (
    <div className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col gap-2">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex flex-col gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-2xl text-zinc-100"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">{req.origin}</p>
              <p className="text-xs text-zinc-400">
                {PERMISSION_LABELS[req.permission] || req.permission} kullanmak istiyor
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRespond(req.id, false)}
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              Reddet
            </Button>
            <Button
              variant="brand"
              size="sm"
              onClick={() => handleRespond(req.id, true)}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              İzin Ver
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
