import type { ManagedTab, SortMode } from '../shared/types';

const URL_SCHEME_LABELS: Record<string, string> = {
  'chrome:': 'chrome',
  'chrome-extension:': 'extension',
  'edge:': 'edge',
  'file:': 'file',
  'about:': 'about'
};

export function normalizeDomain(rawUrl: string | undefined): string {
  if (!rawUrl) return 'unknown';

  try {
    const url = new URL(rawUrl);
    if (URL_SCHEME_LABELS[url.protocol] && url.protocol !== 'http:' && url.protocol !== 'https:') {
      return URL_SCHEME_LABELS[url.protocol];
    }
    if (url.hostname) {
      return url.hostname.toLowerCase().replace(/^www\./, '');
    }
    return URL_SCHEME_LABELS[url.protocol] ?? url.protocol.replace(':', '') ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export function toRenderableFaviconUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    return ['http:', 'https:', 'data:', 'chrome-extension:'].includes(url.protocol) ? rawUrl : undefined;
  } catch {
    return undefined;
  }
}

export function toReadingListUrl(tab: Pick<ManagedTab, 'url' | 'pendingUrl'>): string | undefined {
  const rawUrl = tab.url ?? tab.pendingUrl;
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function toManagedTab(tab: chrome.tabs.Tab): ManagedTab | null {
  if (typeof tab.id !== 'number' || typeof tab.windowId !== 'number') {
    return null;
  }

  const url = tab.url ?? tab.pendingUrl;

  return {
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    url: tab.url,
    pendingUrl: tab.pendingUrl,
    domain: normalizeDomain(url),
    title: tab.title?.trim() || url || 'Untitled tab',
    favIconUrl: toRenderableFaviconUrl(tab.favIconUrl),
    pinned: Boolean(tab.pinned),
    audible: Boolean(tab.audible),
    muted: Boolean(tab.mutedInfo?.muted),
    status: tab.status,
    discarded: Boolean(tab.discarded),
    frozen: tab.frozen,
    lastAccessed: tab.lastAccessed
  };
}

export function sortTabs(tabs: ManagedTab[], sortMode: SortMode): ManagedTab[] {
  const copy = [...tabs];

  if (sortMode === 'domain') {
    return copy.sort((left, right) => {
      const domain = left.domain.localeCompare(right.domain, undefined, { sensitivity: 'base' });
      return domain || left.index - right.index;
    });
  }

  if (sortMode === 'recent') {
    return copy.sort((left, right) => compareAccessTime(left, right, 'descending') || left.index - right.index);
  }

  if (sortMode === 'leastRecent') {
    return copy.sort((left, right) => compareAccessTime(left, right, 'ascending') || left.index - right.index);
  }

  return copy.sort((left, right) => left.index - right.index);
}

export function nextSortMode(currentSortMode: SortMode, requestedSortMode: SortMode): SortMode {
  if (requestedSortMode === 'recent' && (currentSortMode === 'recent' || currentSortMode === 'leastRecent')) {
    return currentSortMode === 'recent' ? 'leastRecent' : 'recent';
  }

  return requestedSortMode;
}

function compareAccessTime(left: ManagedTab, right: ManagedTab, direction: 'ascending' | 'descending'): number {
  const leftAccessed = left.lastAccessed;
  const rightAccessed = right.lastAccessed;

  if (typeof leftAccessed === 'number' && typeof rightAccessed === 'number') {
    return direction === 'ascending' ? leftAccessed - rightAccessed : rightAccessed - leftAccessed;
  }

  if (typeof leftAccessed === 'number') return -1;
  if (typeof rightAccessed === 'number') return 1;
  return 0;
}
