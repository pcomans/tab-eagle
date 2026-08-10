import { describe, expect, it } from 'vitest';
import type { ManagedWindow } from '../shared/types';
import { layoutWindows, moveIndexBefore, WINDOW_CARD_GAP, WINDOW_CARD_WIDTH, WORLD_MARGIN } from './window-layout';

function managedWindow(id: number, tabCount: number): ManagedWindow {
  return {
    id,
    focused: id === 1,
    incognito: false,
    tabs: Array.from({ length: tabCount }, (_, index) => ({
      id: id * 100 + index,
      windowId: id,
      index,
      domain: 'example.com',
      title: `Tab ${index + 1}`,
      pinned: false,
      audible: false,
      muted: false,
      discarded: false
    }))
  };
}

describe('layoutWindows', () => {
  it('keeps a single window inside a padded world', () => {
    const layout = layoutWindows([managedWindow(1, 4)]);
    expect(layout.items[0]).toMatchObject({ x: WORLD_MARGIN, y: WORLD_MARGIN, width: WINDOW_CARD_WIDTH });
    expect(layout.width).toBe(WINDOW_CARD_WIDTH + WORLD_MARGIN * 2);
  });

  it('uses three balanced columns for a larger collection', () => {
    const layout = layoutWindows([
      managedWindow(1, 18),
      managedWindow(2, 2),
      managedWindow(3, 2),
      managedWindow(4, 2),
      managedWindow(5, 2)
    ]);
    const xPositions = new Set(layout.items.map((item) => item.x));
    expect(xPositions.size).toBe(3);
    expect(layout.width).toBe(WORLD_MARGIN * 2 + WINDOW_CARD_WIDTH * 3 + WINDOW_CARD_GAP * 2);
  });
});

describe('moveIndexBefore', () => {
  it('accounts for the source tab being removed before a later same-window target', () => {
    expect(moveIndexBefore(1, 2, 1, 6)).toBe(5);
  });

  it('keeps the target index for earlier and cross-window moves', () => {
    expect(moveIndexBefore(1, 6, 1, 2)).toBe(2);
    expect(moveIndexBefore(1, 2, 2, 6)).toBe(6);
  });
});
