import { describe, expect, it } from 'vitest';
import type { ManagedTab } from '../shared/types';
import { normalizeDomain, sortTabs } from './tab-model';

function tab(id: number, index: number, domain: string): ManagedTab {
  return {
    id,
    windowId: 1,
    index,
    domain,
    title: `Tab ${id}`,
    pinned: false,
    audible: false,
    muted: false,
    discarded: false
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
});
