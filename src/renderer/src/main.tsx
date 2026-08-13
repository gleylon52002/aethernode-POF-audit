import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from '@renderer/components/layouts';
import { useSettings } from '@renderer/store/settings';
import { useTabs } from '@renderer/store/tabs';
import { loadSession, loadSessionGroups } from '@renderer/hooks/use-shortcuts';
import { NEW_TAB_URL } from '@shared/constants/app';
import '@renderer/styles/global.css';
import { initSoundUnlock } from '@renderer/hooks/use-sound';

initSoundUnlock();

// eslint-disable-next-line no-console
console.log('[aether] renderer mounted');

function App() {
  const loadSettings = useSettings((s) => s.load);
  const settingsLoaded = useSettings((s) => s.loaded);
  const startupPage = useSettings((s) => s.settings.general.startupPage);
  const restoreSession = useTabs((s) => s.restoreSession);
  const resetAll = useTabs((s) => s.resetAll);
  const open = useTabs((s) => s.open);
  const restored = useRef(false);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // Ayarlar yüklendikten sonra startupPage politikasını uygula.
  useEffect(() => {
    if (!settingsLoaded || restored.current) return;
    restored.current = true;

    if (startupPage === 'lastSession') {
      const session = loadSession();
      if (session && session.length > 0) {
        useTabs.getState().restoreGroups(loadSessionGroups());
        restoreSession(session);
        return;
      }
    }
    if (startupPage === 'blank') {
      resetAll();
      return;
    }
    // dashboard (varsayılan): tek başlangıç sekmesi NEW_TAB_URL
    const state = useTabs.getState();
    if (state.tabs.length === 0) {
      open(NEW_TAB_URL);
    } else if (!state.activeId) {
      state.activate(state.tabs[0]!.id);
    }
  }, [settingsLoaded, startupPage, restoreSession, resetAll, open]);

  if (!settingsLoaded) {
    return (
      <div className="grid h-full place-items-center text-fg-muted text-sm">
        POF yükleniyor…
      </div>
    );
  }

  return <AppShell />;
}

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root bulunamadı');

createRoot(container).render(<App />);
