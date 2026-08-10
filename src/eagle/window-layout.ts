import type { ManagedWindow } from '../shared/types';

export const WINDOW_CARD_WIDTH = 680;
export const WINDOW_CARD_GAP = 96;
export const WORLD_MARGIN = 72;

export interface WindowLayoutItem {
  windowId: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowLayout {
  items: WindowLayoutItem[];
  width: number;
  height: number;
}

export function layoutWindows(windows: ManagedWindow[]): WindowLayout {
  if (windows.length === 0) {
    return { items: [], width: WINDOW_CARD_WIDTH + WORLD_MARGIN * 2, height: 520 };
  }

  const columnCount = windows.length === 1 ? 1 : windows.length <= 4 ? 2 : 3;
  const columnHeights = Array.from({ length: columnCount }, () => WORLD_MARGIN);
  const items = windows.map((windowItem) => {
    const column = indexOfShortestColumn(columnHeights);
    const height = windowCardHeight(windowItem.tabs.length);
    const item = {
      windowId: windowItem.id,
      x: WORLD_MARGIN + column * (WINDOW_CARD_WIDTH + WINDOW_CARD_GAP),
      y: columnHeights[column],
      width: WINDOW_CARD_WIDTH,
      height
    };
    columnHeights[column] += height + WINDOW_CARD_GAP;
    return item;
  });

  return {
    items,
    width: WORLD_MARGIN * 2 + columnCount * WINDOW_CARD_WIDTH + (columnCount - 1) * WINDOW_CARD_GAP,
    height: Math.max(...columnHeights) - WINDOW_CARD_GAP + WORLD_MARGIN
  };
}

/**
 * Refresh the canvas without reassigning surviving windows to new columns.
 *
 * Chrome closes a window when its final tab moves elsewhere. Re-running the
 * masonry layout after that event makes unrelated windows jump into the newly
 * available space, which breaks the user's spatial orientation. Existing
 * window IDs therefore keep their coordinates; only genuinely new windows are
 * assigned a new slot.
 */
export function reconcileWindowLayout(windows: ManagedWindow[], previousLayout: WindowLayout): WindowLayout {
  if (previousLayout.items.length === 0) return layoutWindows(windows);
  if (windows.length === 0) return layoutWindows(windows);

  const previousItems = new Map(previousLayout.items.map((item) => [item.windowId, item]));
  const idealItems = new Map(layoutWindows(windows).items.map((item) => [item.windowId, item]));
  const items: WindowLayoutItem[] = [];

  windows.forEach((windowItem) => {
    const previous = previousItems.get(windowItem.id);
    if (previous) {
      items.push({ ...previous, height: windowCardHeight(windowItem.tabs.length) });
      return;
    }

    const ideal = idealItems.get(windowItem.id);
    if (ideal) items.push(placeNewWindow(ideal, items));
  });

  preventColumnOverlaps(items);
  return boundsForItems(items);
}

export function windowCardHeight(tabCount: number): number {
  const rows = Math.max(1, Math.ceil(tabCount / 2));
  return 116 + rows * 64;
}

export function moveIndexBefore(
  sourceWindowId: number,
  sourceIndex: number,
  targetWindowId: number,
  targetIndex: number
): number {
  if (sourceWindowId === targetWindowId && sourceIndex < targetIndex) {
    return Math.max(0, targetIndex - 1);
  }
  return targetIndex;
}

function indexOfShortestColumn(columnHeights: number[]): number {
  let shortestIndex = 0;
  for (let index = 1; index < columnHeights.length; index += 1) {
    if (columnHeights[index] < columnHeights[shortestIndex]) shortestIndex = index;
  }
  return shortestIndex;
}

function placeNewWindow(ideal: WindowLayoutItem, existingItems: WindowLayoutItem[]): WindowLayoutItem {
  if (existingItems.length === 0 || !existingItems.some((item) => item.x === ideal.x)) return ideal;

  const columns = [...new Set(existingItems.map((item) => item.x))];
  const columnBottoms = columns.map((x) => ({
    x,
    bottom: Math.max(...existingItems.filter((item) => item.x === x).map((item) => item.y + item.height))
  }));
  const shortestColumn = columnBottoms.reduce((shortest, column) =>
    column.bottom < shortest.bottom ? column : shortest
  );

  return { ...ideal, x: shortestColumn.x, y: shortestColumn.bottom + WINDOW_CARD_GAP };
}

function preventColumnOverlaps(items: WindowLayoutItem[]): void {
  const columns = [...new Set(items.map((item) => item.x))];
  columns.forEach((x) => {
    const columnItems = items.filter((item) => item.x === x).sort((left, right) => left.y - right.y);
    let nextAvailableY = WORLD_MARGIN;
    columnItems.forEach((item) => {
      item.y = Math.max(item.y, nextAvailableY);
      nextAvailableY = item.y + item.height + WINDOW_CARD_GAP;
    });
  });
}

function boundsForItems(items: WindowLayoutItem[]): WindowLayout {
  return {
    items,
    width: Math.max(WINDOW_CARD_WIDTH + WORLD_MARGIN * 2, ...items.map((item) => item.x + item.width + WORLD_MARGIN)),
    height: Math.max(520, ...items.map((item) => item.y + item.height + WORLD_MARGIN))
  };
}
