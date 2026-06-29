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
    favIconUrl: tab.favIconUrl,
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

  return copy.sort((left, right) => left.index - right.index);
}
