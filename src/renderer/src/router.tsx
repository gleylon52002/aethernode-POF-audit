import { lazy, Suspense, type ComponentType } from 'react';

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

const pages: Record<string, ComponentType> = {
  dashboard: Dashboard,
  bookmarks: Bookmarks,
  downloads: Downloads,
  security: Security,
  privacy: Privacy,
  network: Network,
  passwords: Passwords,
  notes: Notes,
  settings: SettingsPage,
  history: History,
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

export function InternalPage({ url }: { url: string }) {
  const { pageKey } = resolveInternalRoute(url);
  const Page = pages[pageKey ?? 'dashboard'] ?? Dashboard;
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}