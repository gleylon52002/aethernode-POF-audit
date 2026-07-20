import type { ID } from './result';

export type TabId = ID;

export interface TabSnapshot {
  id: TabId;
  title: string;
  url: string;
  faviconUrl?: string;
  loading: boolean;
  pinned: boolean;
  muted: boolean;
  groupId?: ID;
  profileId: ID; // normal | incognito | workspace
  deepFocus?: boolean;
  readerMode?: boolean;
  discarded?: boolean;
  /** Yeni sekme manzarası indeksi (sekme başına sabit) */
  wallpaperIndex?: number;
  createdAt: number;
  lastActiveAt: number;
}