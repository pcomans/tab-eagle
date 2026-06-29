export type SortMode = 'position' | 'domain' | 'recent' | 'leastRecent';

export interface ManagedTab {
  id: number;
  windowId: number;
  index: number;
  url?: string;
  pendingUrl?: string;
  domain: string;
  title: string;
  favIconUrl?: string;
  pinned: boolean;
  audible: boolean;
  muted: boolean;
  status?: chrome.tabs.Tab['status'];
  discarded: boolean;
  frozen?: boolean;
  lastAccessed?: number;
}

export interface EagleState {
  sourceWindowId: number;
  selfTabId?: number;
  originTabId?: number;
  sortMode: SortMode;
  pendingTabIds: Set<number>;
}
