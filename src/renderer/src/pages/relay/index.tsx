import { useEffect, useState } from 'react';
import { useTabs } from '@renderer/store/tabs';
import { useOwnTabId } from '@renderer/router';
import { LinkIcon, ClockIcon, Warning } from '@renderer/components/ui/icons';

// Geçici bağlantı (relay) açılış sayfası — aethernode://relay/<token>
// Token yerel olarak doğrulanır (süre + kullanım sayısı); geçerliyse hedef
// sayfa İZOLE bir gizli sekmede (oturumsuz/çerezsiz) açılır.

type Status =
  | { kind: 'checking' }
  | { kind: 'opened'; url: string; expiresAt?: number; usesLeft?: number }
  | { kind: 'invalid'; reason: string };

export default function RelayPage() {
  const ownTabId = useOwnTabId();
  const tab = useTabs((s) => s.tabs.find((t) => t.id === (ownTabId ?? s.activeId)));
  const open = useTabs((s) => s.open);
  const [status, setStatus] = useState<Status>({ kind: 'checking' });

  const token = tab?.url ?? '';

  useEffect(() => {
    if (!token.startsWith('aethernode://relay/')) {
      setStatus({ kind: 'invalid', reason: 'Bağlantı biçimi tanınmadı.' });
      return;
    }
    let cancelled = false;
    void window.aether.relay.resolve(token).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data?.valid && res.data.url) {
        // İzole bağlam: gizli sekme profili — kalıcı çerez/oturum yok
        open(res.data.url, 'incognito');
        setStatus({
          kind: 'opened',
          url: res.data.url,
          expiresAt: res.data.expiresAt,
          usesLeft: res.data.usesLeft,
        });
        return;
      }
      const reason = res.ok ? res.data?.reason : res.error;
      setStatus({
        kind: 'invalid',
        reason:
          reason === 'expired'
            ? 'Bu bağlantının süresi doldu.'
            : reason === 'used'
              ? 'Bu bağlantı kullanım limitine ulaştı (tek/sınırlı kullanımlık).'
              : 'Bağlantı çözümlenemedi (bozuk veya eksik token).',
      });
    });
    return () => {
      cancelled = true;
    };
  }, [token, open]);

  return (
    <div className="grid h-full place-items-center bg-bg-base p-6">
      <div className="w-[min(480px,92vw)] rounded-2xl border border-white/10 bg-bg-elevated/80 p-6 text-center shadow-2xl">
        {status.kind === 'checking' && (
          <>
            <LinkIcon className="mx-auto mb-3 h-8 w-8 text-brand" />
            <p className="text-sm text-fg">Geçici bağlantı doğrulanıyor…</p>
          </>
        )}
        {status.kind === 'opened' && (
          <>
            <LinkIcon className="mx-auto mb-3 h-8 w-8 text-success" />
            <p className="mb-1 text-sm font-medium text-fg">Sayfa izole oturumda açıldı</p>
            <p className="break-all text-xs text-fg-muted">{status.url}</p>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-fg-subtle">
              <ClockIcon className="h-3 w-3" />
              {status.expiresAt
                ? `Geçerlilik: ${new Date(status.expiresAt).toLocaleString('tr-TR')}`
                : 'Süre bilgisi yok'}
              {typeof status.usesLeft === 'number' && ` — kalan kullanım: ${status.usesLeft}`}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-fg-subtle">
              Çerezsiz, oturumsuz gizli bağlamda görüntüleniyor — paylaşan kişinin giriş
              bilgileri size aktarılmadı.
            </p>
          </>
        )}
        {status.kind === 'invalid' && (
          <>
            <Warning className="mx-auto mb-3 h-8 w-8 text-amber-400" />
            <p className="mb-1 text-sm font-medium text-fg">Bağlantı açılamadı</p>
            <p className="text-xs text-fg-muted">{status.reason}</p>
          </>
        )}
      </div>
    </div>
  );
}
