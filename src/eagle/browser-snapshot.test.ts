import { describe, expect, it } from 'vitest';
import type { ManagedWindow } from '../shared/types';
import { browserSnapshotsEqual } from './browser-snapshot';

function snapshot(): ManagedWindow[] {
  return [{
    id: 1,
    focused: true,
    incognito: false,
    tabs: [{
      id: 10,
      windowId: 1,
      index: 0,
      url: 'https://example.com/',
      domain: 'example.com',
      title: 'Example',
      pinned: false,
      audible: false,
      muted: false,
      lastAccessed: 100,
      active: true
    }]
  }];
}

describe('browserSnapshotsEqual', () => {
  it('accepts equivalent browser state', () => {
    expect(browserSnapshotsEqual(snapshot(), snapshot())).toBe(true);
  });

  it('detects window and tab changes that affect the map', () => {
    const changedTitle = snapshot();
    changedTitle[0].tabs[0].title = 'Changed';
    expect(browserSnapshotsEqual(snapshot(), changedTitle)).toBe(false);

    const changedFocus = snapshot();
    changedFocus[0].focused = false;
    expect(browserSnapshotsEqual(snapshot(), changedFocus)).toBe(false);

    const addedTab = snapshot();
    addedTab[0].tabs.push({ ...addedTab[0].tabs[0], id: 11, index: 1 });
    expect(browserSnapshotsEqual(snapshot(), addedTab)).toBe(false);
  });
});
