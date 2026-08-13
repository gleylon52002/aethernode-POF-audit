import { createContext, lazy, Suspense, useContext, type ComponentType } from 'react';

// Dahili sayfalar. Aethernode://<name> adresleri bu sayfalara çözülür.
// lazy() doğrudan bir bileşen döndürür; ayrıca .default almaya gerek yok.
const Dashboard = lazy(() => import('@renderer/pages/dashboard'));
const Bookmarks = lazy(() => import('@renderer/pages/bookmarks'));
const Downloads = lazy(() => import('@renderer/pages/downloads'));
const Security = lazy(() => import('@renderer/pages/security'));
const Privacy = lazy(() => import('@renderer/pages/privacy'));
const Network = lazy(() => import('@renderer/pages/network'));
const Passwords = lazy(() => import('@renderer/pages/passwords'));
const Notes = lazy(() => import('@renderer/pages/notes'));
const SettingsPage = lazy(() => import('@renderer/pages/settings'));
const History = lazy(() => import('@renderer/pages/history'));
const Relay = lazy(() => import('@renderer/pages/relay'));
const PdfViewer = lazy(() => import('@renderer/pages/pdf'));
const ImportPage = lazy(() => import('@renderer/pages/import'));
const LibraryPage = lazy(() => import('@renderer/pages/library'));
const WorkspacesPage = lazy(() => import('@renderer/pages/workspaces'));
const ContainersPage = lazy(() => import('@renderer/pages/containers'));
const BoostsPage = lazy(() => import('@renderer/pages/boosts'));
const AnnotatePage = lazy(() => import('@renderer/pages/annotate'));
const SecurityLabPage = lazy(() => import('@renderer/pages/security-lab'));
const PerformancePage = lazy(() => import('@renderer/pages/performance'));
const ExtensionsPage = lazy(() => import('@renderer/pages/extensions'));

const pages: Record<string, ComponentType> = {
  dashboard: Dashboard,
  bookmarks: Bookmarks,
  downloads: Downloads,
  security: Security,
  'security-lab': SecurityLabPage,
  privacy: Privacy,
  network: Network,
  passwords: Passwords,
  notes: Notes,
  settings: SettingsPage,
  history: History,
  relay: Relay,
  pdf: PdfViewer,
  import: ImportPage,
  library: LibraryPage,
  workspaces: WorkspacesPage,
  containers: ContainersPage,
  boosts: BoostsPage,
  annotate: AnnotatePage,
  performance: PerformancePage,
  extensions: ExtensionsPage,
};

export function resolveInternalRoute(url: string): {
  internal: boolean;
  pageKey?: string;
  externalUrl?: string;
} {
  if (url.startsWith('aethernode://')) {
    const key = url.slice('aethernode://'.length).split(/[/?#]/)[0] || 'dashboard';
    return { internal: true, pageKey: key };
  }
  return { internal: false, externalUrl: url };
}

/**
 * Dahili sayfanın hangi sekmeye ait olduğunu taşır. Split view'de sağ
 * paneldeki dashboard, aramayı KENDİ sekmesinde açsın diye gerekli.
 */
export const TabPageContext = createContext<string | null>(null);

/** Dahili sayfanın render edildiği sekmenin id'si (yoksa aktif sekme). */
export function useOwnTabId(): string | null {
  return useContext(TabPageContext);
}

export function InternalPage({ url, tabId }: { url: string; tabId?: string }) {
  const { pageKey } = resolveInternalRoute(url);
  const Page = pages[pageKey ?? 'dashboard'] ?? Dashboard;
  return (
    <TabPageContext.Provider value={tabId ?? null}>
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    </TabPageContext.Provider>
  );
}