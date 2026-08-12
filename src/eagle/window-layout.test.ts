import { describe, expect, it } from 'vitest';
import type { ManagedWindow } from '../shared/types';
import {
  layoutWindows,
  moveIndexBefore,
  reconcileWindowLayout,
  replaceWindowIdInLayout,
  sortWindowsById,
  windowLayoutsEqual,
  WINDOW_CARD_GAP,
  WINDOW_CARD_WIDTH,
  WORLD_MARGIN
} from './window-layout';

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
      muted: false
    }))
  };
}

describe('sortWindowsById', () => {
  it('is independent of the focused or triggering window', () => {
    const windows = [
      { ...managedWindow(30, 2), focused: true },
      managedWindow(10, 2),
      managedWindow(20, 2)
    ];

    expect(sortWindowsById(windows).map((windowItem) => windowItem.id)).toEqual([10, 20, 30]);
    expect(windows.map((windowItem) => windowItem.id)).toEqual([30, 10, 20]);
  });
});

describe('replaceWindowIdInLayout', () => {
  it('keeps a newly created window in its reserved preview position', () => {
    const previewLayout = reconcileWindowLayout(
      [managedWindow(1, 4), managedWindow(2, 4), managedWindow(-1, 1)],
      layoutWindows([managedWindow(1, 4), managedWindow(2, 4)])
    );
    const previewItem = previewLayout.items.find((item) => item.windowId === -1);

    const createdLayout = replaceWindowIdInLayout(previewLayout, -1, 42);

    expect(createdLayout.items.find((item) => item.windowId === 42)).toMatchObject({
      x: previewItem?.x,
      y: previewItem?.y,
      width: previewItem?.width,
      height: previewItem?.height
    });
    expect(createdLayout.items.some((item) => item.windowId === -1)).toBe(false);
  });
});

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

describe('reconcileWindowLayout', () => {
  it('does not move surviving windows when another window disappears', () => {
    const windows = [
      managedWindow(1, 18),
      managedWindow(2, 2),
      managedWindow(3, 2),
      managedWindow(4, 2),
      managedWindow(5, 2)
    ];
    const previousLayout = layoutWindows(windows);
    const nextLayout = reconcileWindowLayout(
      windows.filter((windowItem) => windowItem.id !== 2),
      previousLayout
    );

    nextLayout.items.forEach((item) => {
      const previousItem = previousLayout.items.find((candidate) => candidate.windowId === item.windowId);
      expect(item).toMatchObject({ x: previousItem?.x, y: previousItem?.y });
    });
  });

  it('adds a newly created window without moving existing windows', () => {
    const existingWindows = [managedWindow(1, 4), managedWindow(2, 4)];
    const previousLayout = layoutWindows(existingWindows);
    const nextLayout = reconcileWindowLayout([...existingWindows, managedWindow(3, 4)], previousLayout);

    previousLayout.items.forEach((previousItem) => {
      expect(nextLayout.items.find((item) => item.windowId === previousItem.windowId)).toMatchObject({
        x: previousItem.x,
        y: previousItem.y
      });
    });
  });

  it('keeps existing slots when a new focused window is sorted before them', () => {
    const existingWindows = [managedWindow(1, 4), managedWindow(2, 4)].map((windowItem) => ({
      ...windowItem,
      focused: false
    }));
    const previousLayout = layoutWindows(existingWindows);
    const focusedNewWindow = { ...managedWindow(3, 4), focused: true };
    const nextLayout = reconcileWindowLayout([focusedNewWindow, ...existingWindows], previousLayout);

    previousLayout.items.forEach((previousItem) => {
      expect(nextLayout.items.find((item) => item.windowId === previousItem.windowId)).toMatchObject({
        x: previousItem.x,
        y: previousItem.y
      });
    });
  });

  it('reuses shared session geometry in a fresh Tab Eagle instance', () => {
    const allWindows = [
      managedWindow(1, 12),
      managedWindow(2, 2),
      managedWindow(3, 2),
      managedWindow(4, 2),
      managedWindow(5, 2)
    ];
    const sharedLayout = reconcileWindowLayout(
      allWindows.filter((windowItem) => windowItem.id !== 2),
      layoutWindows(allWindows)
    );
    const survivingWindows = allWindows.filter((windowItem) => windowItem.id !== 2);

    const freshInstanceLayout = reconcileWindowLayout(survivingWindows, sharedLayout);

    expect(windowLayoutsEqual(freshInstanceLayout, sharedLayout)).toBe(true);
    expect(windowLayoutsEqual(freshInstanceLayout, layoutWindows(survivingWindows))).toBe(false);
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
