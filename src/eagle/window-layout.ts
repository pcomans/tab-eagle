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
