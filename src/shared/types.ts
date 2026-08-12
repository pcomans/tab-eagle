export type SortMode = 'position' | 'domain' | 'recent' | 'leastRecent';

export interface ManagedTab {
  id: number;
  windowId: number;
  index: number;
  url?: string;
  pendingUrl?: string;
  domain: string;
  title: string;
  pinned: boolean;
  audible: boolean;
  muted: boolean;
  lastAccessed?: number;
  active?: boolean;
}

export interface ManagedWindow {
  id: number;
  focused: boolean;
  incognito: boolean;
  tabs: ManagedTab[];
}

export interface EagleReopenMessage {
  type: 'tab-eagle-reopen';
  sourceTabId: number;
  sourceWindowId: number;
}

export interface EagleState {
  sourceWindowId: number;
  selfTabId?: number;
  originTabId?: number;
  sortMode: SortMode;
  pendingTabIds: Set<number>;
}
