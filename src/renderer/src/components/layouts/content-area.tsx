import { useTabs } from '@renderer/store/tabs';
import { resolveInternalRoute, InternalPage } from '@renderer/router';
import { WebviewStack } from './webview-stack';
import { useEffect } from 'react';

// İçerik alanı: WebviewStack HER ZAMAN mount kalır — aksi halde dahili
// sayfaya (dashboard vb.) geçince tüm webview'lar yok olur ve YouTube
// müziği kesilir. Dahili sayfa üstte overlay olarak gösterilir.
export function ContentArea() {
  const active = useTabs((s) => s.tabs.find((t) => t.id === s.activeId) ?? s.tabs[0]);
  const activate = useTabs((s) => s.activate);

  // activeId kaybolursa ilk sekmeyi seç
  useEffect(() => {
    const state = useTabs.getState();
    if (!state.activeId && state.tabs[0]) activate(state.tabs[0].id);
  }, [active, activate]);

  if (!active) {
    return (
      <div className="grid h-full w-full place-items-center text-fg-subtle">
        Sekme seçili değil
      </div>
    );
  }

  const r = resolveInternalRoute(active.url);

  return (
    <div className="relative h-full w-full">
      {/* visibility:hidden — display:none medyayı askıya alır */}
      <div
        className="absolute inset-0 h-full w-full"
        style={{
          visibility: r.internal ? 'hidden' : 'visible',
          pointerEvents: r.internal ? 'none' : 'auto',
        }}
        aria-hidden={r.internal}
      >
        <WebviewStack />
      </div>
      {r.internal && (
        <div className="absolute inset-0 z-10 h-full w-full overflow-y-auto bg-bg-base">
          <InternalPage url={active.url} />
        </div>
      )}
    </div>
  );
}
