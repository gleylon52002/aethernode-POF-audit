import type { ID } from './result';

export type TabId = ID;

/** Sekme grubu renk paleti (Chrome tab groups benzeri 8 renk) */
export type TabGroupColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'gray';

export interface TabGroup {
  id: ID;
  name: string;
  color: TabGroupColor;
  collapsed: boolean;
  createdAt: number;
}

export interface TabSnapshot {
  id: TabId;
  title: string;
  url: string;
  faviconUrl?: string;
  loading: boolean;
  pinned: boolean;
  muted: boolean;
  /** Sekmede ses çalıyor (medya) */
  audible?: boolean;
  groupId?: ID;
  /** Workspace id — iş/kişisel bağlam */
  workspaceId?: ID;
  /** Ağaç sekme: üst sekme */
  parentId?: TabId;
  /** Site konteyneri (çoklu hesap izolasyonu) */
  containerId?: string;
  profileId: ID; // normal | incognito | workspace
  deepFocus?: boolean;
  readerMode?: boolean;
  discarded?: boolean;
  /** Yeni sekme manzarası indeksi (sekme başına sabit) */
  wallpaperIndex?: number;
  /** Kullan-at (Burner) sekme bayrağı */
  isBurner?: boolean;
  createdAt: number;
  lastActiveAt: number;
}

/** Arc tarzı workspace — sekme kümeleri */
export interface Workspace {
  id: ID;
  name: string;
  color: TabGroupColor;
  icon?: string;
  order?: number;
  createdAt: number;
}

/** Site konteyneri — ayrı çerez/depolama */
export interface SiteContainer {
  id: string;
  name: string;
  color: TabGroupColor;
  createdAt: number;
}