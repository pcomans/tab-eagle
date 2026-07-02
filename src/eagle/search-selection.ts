import type { ManagedTab } from '../shared/types';

export type SearchNavigationKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export function firstVisibleTabId(tabs: ManagedTab[]): number | undefined {
  return tabs[0]?.id;
}

export function reconcileSelectedTabId(
  tabs: ManagedTab[],
  selectedTabId: number | undefined,
  options: { resetToFirst?: boolean } = {}
): number | undefined {
  if (tabs.length === 0) return undefined;
  if (options.resetToFirst) return firstVisibleTabId(tabs);
  return tabs.some((tab) => tab.id === selectedTabId) ? selectedTabId : firstVisibleTabId(tabs);
}

export function nextSelectedTabId(
  tabs: ManagedTab[],
  selectedTabId: number | undefined,
  key: SearchNavigationKey,
  columnCount: number
): number | undefined {
  if (tabs.length === 0) return undefined;

  const currentIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === selectedTabId)
  );
  const columns = Math.max(1, Math.floor(columnCount));
  const deltaByKey: Record<SearchNavigationKey, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -columns,
    ArrowDown: columns
  };
  const nextIndex = clamp(currentIndex + deltaByKey[key], 0, tabs.length - 1);

  return tabs[nextIndex]?.id;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
