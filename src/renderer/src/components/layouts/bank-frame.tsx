import { useMemo } from 'react';
import { useTabs } from '@renderer/store/tabs';
import { useSettings } from '@renderer/store/settings';
import { isBankUrl } from '@shared/utils';

/** Banka Modu aktifken pencere çevresinde yeşil nabız çerçevesi. */
export function BankFrame() {
  const active = useTabs((s) => s.tabs.find((t) => t.id === s.activeId));
  const bankModeOn = useSettings((s) => s.settings.privacy.bankMode?.enabled !== false);

  const active_ = useMemo(
    () => bankModeOn && !!active?.url && isBankUrl(active.url),
    [bankModeOn, active?.url],
  );

  if (!active_) return null;

  return (
    <div
      className="bank-pulse-frame pointer-events-none absolute inset-0 z-[100]"
      aria-hidden
      title="Banka Modu — korumalı oturum"
    />
  );
}
