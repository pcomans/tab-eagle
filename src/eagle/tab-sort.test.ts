import { describe, expect, it } from 'vitest';
import type { ManagedTab } from '../shared/types';
import { nextSortMode, normalizeDomain, sortTabs, toReadingListUrl, toRenderableFaviconUrl } from './tab-model';

function tab(id: number, index: number, domain: string, lastAccessed?: number): ManagedTab {
  return {
    id,
    windowId: 1,
    index,
    domain,
    title: `Tab ${id}`,
    pinned: false,
    audible: false,
    muted: false,
    discarded: false,
    lastAccessed
  };
}

describe('normalizeDomain', () => {
  it('normalizes ordinary web URLs', () => {
    expect(normalizeDomain('https://www.Example.com/path')).toBe('example.com');
  });

  it('falls back to stable labels for non-web URLs', () => {
    expect(normalizeDomain('chrome://extensions')).toBe('chrome');
    expect(normalizeDomain('file:///tmp/test.html')).toBe('file');
  });
});

describe('toRenderableFaviconUrl', () => {
  it('keeps favicon URLs the extension page can render', () => {
    expect(toRenderableFaviconUrl('https://example.com/icon.png')).toBe('https://example.com/icon.png');
    expect(toRenderableFaviconUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(toRenderableFaviconUrl('chrome-extension://extension-id/icon.png')).toBe(
      'chrome-extension://extension-id/icon.png'
    );
  });

  it('drops local file favicon URLs', () => {
    expect(toRenderableFaviconUrl('file:///Users/philipp/project/icon.png')).toBeUndefined();
  });
});

describe('toReadingListUrl', () => {
  it('keeps normal web page URLs', () => {
    expect(toReadingListUrl({ url: 'https://example.com/path?x=1#section' })).toBe(
      'https://example.com/path?x=1#section'
    );
  });

  it('uses pendingUrl when url is not available', () => {
    expect(toReadingListUrl({ pendingUrl: 'https://example.com/loading' })).toBe('https://example.com/loading');
  });

  it('drops non-web URLs', () => {
    expect(toReadingListUrl({ url: 'chrome://extensions' })).toBeUndefined();
    expect(toReadingListUrl({ url: 'file:///Users/philipp/project/index.html' })).toBeUndefined();
  });
});

describe('sortTabs', () => {
  it('sorts by tab index for position mode', () => {
    expect(sortTabs([tab(1, 2, 'b.com'), tab(2, 0, 'a.com')], 'position').map((item) => item.id)).toEqual([2, 1]);
  });

  it('sorts by domain and then original index', () => {
    expect(
      sortTabs([tab(1, 2, 'b.com'), tab(2, 1, 'a.com'), tab(3, 0, 'a.com')], 'domain').map(
        (item) => item.id
      )
    ).toEqual([3, 2, 1]);
  });

  it('sorts by most recently accessed first', () => {
    expect(
      sortTabs([tab(1, 0, 'a.com', 200), tab(2, 1, 'b.com'), tab(3, 2, 'c.com', 500)], 'recent').map(
        (item) => item.id
      )
    ).toEqual([3, 1, 2]);
  });

  it('sorts by least recently accessed first', () => {
    expect(
      sortTabs(
        [tab(1, 0, 'a.com', 200), tab(2, 1, 'b.com'), tab(3, 2, 'c.com', 500)],
        'leastRecent'
      ).map((item) => item.id)
    ).toEqual([1, 3, 2]);
  });
});

describe('nextSortMode', () => {
  it('toggles the recent control between newest and oldest first when clicked repeatedly', () => {
    expect(nextSortMode('position', 'recent')).toBe('recent');
    expect(nextSortMode('recent', 'recent')).toBe('leastRecent');
    expect(nextSortMode('leastRecent', 'recent')).toBe('recent');
  });

  it('does not toggle position or domain when clicked repeatedly', () => {
    expect(nextSortMode('position', 'position')).toBe('position');
    expect(nextSortMode('domain', 'domain')).toBe('domain');
  });
});
