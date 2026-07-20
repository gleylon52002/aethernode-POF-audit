import { Titlebar } from './titlebar';
import { Sidebar } from './sidebar';
import { TabBar } from './tab-bar';
import { AddressBar } from './address-bar';
import { ContentArea } from './content-area';
import { StatusBar } from './status-bar';
import { FindBar } from './find-bar';
import { useShortcuts, useFindBarOpen, persistSession } from '@renderer/hooks/use-shortcuts';
import { useEffect } from 'react';
import { useTabs } from '@renderer/store/tabs';
import { useSettings } from '@renderer/store/settings';
import { getActiveWebviewControl } from './webview-control-bus';

const DISCARD_IDLE_MS = 15 * 60 * 1000;
const DISCARD_TICK_MS = 60 * 1000;

export function AppShell() {
  useShortcuts();
  const [findOpen, setFindOpen] = useFindBarOpen();
  const memorySaver = useSettings((s) => s.settings.general.memorySaver);
  const discardInactive = useTabs((s) => s.discardInactive);
  const tabs = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const update = useTabs((s) => s.update);

  useEffect(() => {
    persistSession();
  }, [tabs, activeId]);

  useEffect(() => {
    if (!memorySaver) return;
    const id = window.setInterval(() => discardInactive(DISCARD_IDLE_MS), DISCARD_TICK_MS);
    return () => window.clearInterval(id);
  }, [memorySaver, discardInactive]);

  // Sağ tık menüsünden Deep Focus
  useEffect(() => {
    return window.aether.on('aethernode/guest/contextDeepFocus', () => {
      const state = useTabs.getState();
      const active = state.tabs.find((t) => t.id === state.activeId);
      if (!active || active.url.startsWith('aethernode://')) return;
      const next = !active.deepFocus;
      update(active.id, { deepFocus: next });
      getActiveWebviewControl().setDeepFocus(next);
    });
  }, [update]);

  return (
    <div className="flex h-full flex-col">
      <Titlebar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col">
          <TabBar />
          <AddressBar />
          <div className="relative min-h-0 flex-1">
            <FindBar open={findOpen} onClose={() => setFindOpen(false)} />
            <ContentArea />
          </div>
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
