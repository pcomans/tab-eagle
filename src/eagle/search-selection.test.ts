import { describe, expect, it } from 'vitest';
import type { ManagedTab } from '../shared/types';
import { firstVisibleTabId, nextSelectedTabId, reconcileSelectedTabId } from './search-selection';

function tab(id: number): ManagedTab {
  return {
    id,
    windowId: 1,
    index: id,
    domain: 'example.com',
    title: `Tab ${id}`,
    pinned: false,
    audible: false,
    muted: false,
    discarded: false
  };
}

const tabs = [tab(1), tab(2), tab(3), tab(4), tab(5), tab(6)];

describe('firstVisibleTabId', () => {
  it('selects the first visible tab by default', () => {
    expect(firstVisibleTabId(tabs)).toBe(1);
    expect(firstVisibleTabId([])).toBeUndefined();
  });
});

describe('reconcileSelectedTabId', () => {
  it('resets to the first visible tab when the search query changes', () => {
    expect(reconcileSelectedTabId(tabs, 4, { resetToFirst: true })).toBe(1);
  });

  it('preserves the selected tab during live updates when it remains visible', () => {
    expect(reconcileSelectedTabId(tabs, 4)).toBe(4);
  });

  it('falls back to the first visible tab when the selected tab disappears', () => {
    expect(reconcileSelectedTabId(tabs, 99)).toBe(1);
  });
});

describe('nextSelectedTabId', () => {
  it('moves left and right through visible results', () => {
    expect(nextSelectedTabId(tabs, 3, 'ArrowLeft', 3)).toBe(2);
    expect(nextSelectedTabId(tabs, 3, 'ArrowRight', 3)).toBe(4);
  });

  it('moves up and down by the current grid column count', () => {
    expect(nextSelectedTabId(tabs, 2, 'ArrowDown', 3)).toBe(5);
    expect(nextSelectedTabId(tabs, 5, 'ArrowUp', 3)).toBe(2);
  });

  it('clamps navigation at the first and last visible result', () => {
    expect(nextSelectedTabId(tabs, 1, 'ArrowLeft', 3)).toBe(1);
    expect(nextSelectedTabId(tabs, 1, 'ArrowUp', 3)).toBe(1);
    expect(nextSelectedTabId(tabs, 6, 'ArrowRight', 3)).toBe(6);
    expect(nextSelectedTabId(tabs, 6, 'ArrowDown', 3)).toBe(6);
  });

  it('starts navigation from the first result when nothing is selected', () => {
    expect(nextSelectedTabId(tabs, undefined, 'ArrowRight', 3)).toBe(2);
  });
});
