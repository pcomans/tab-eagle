import type { ManagedTab, ManagedWindow } from '../shared/types';

export function browserSnapshotsEqual(left: ManagedWindow[], right: ManagedWindow[]): boolean {
  if (left.length !== right.length) return false;

  return left.every((leftWindow, windowIndex) => {
    const rightWindow = right[windowIndex];
    if (!rightWindow ||
        leftWindow.id !== rightWindow.id ||
        leftWindow.focused !== rightWindow.focused ||
        leftWindow.incognito !== rightWindow.incognito ||
        leftWindow.tabs.length !== rightWindow.tabs.length) {
      return false;
    }

    return leftWindow.tabs.every((leftTab, tabIndex) => tabsEqual(leftTab, rightWindow.tabs[tabIndex]));
  });
}

function tabsEqual(left: ManagedTab, right: ManagedTab | undefined): boolean {
  return Boolean(right &&
    left.id === right.id &&
    left.windowId === right.windowId &&
    left.index === right.index &&
    left.url === right.url &&
    left.pendingUrl === right.pendingUrl &&
    left.domain === right.domain &&
    left.title === right.title &&
    left.pinned === right.pinned &&
    left.audible === right.audible &&
    left.muted === right.muted &&
    left.lastAccessed === right.lastAccessed);
}
