import type { EagleReopenMessage } from '../shared/types';
import { createEagleUrl, getEagleBaseUrl, getEagleSourceTabId, isEagleUrl } from '../shared/urls';

async function findExistingEagleTab(windowId: number): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ windowId });
  const eagleBaseUrl = getEagleBaseUrl();
  return tabs.find((tab) => isEagleUrl(tab.url ?? tab.pendingUrl, eagleBaseUrl));
}

chrome.action.onClicked.addListener((tab) => {
  void openTabEagle(tab);
});

async function openTabEagle(sourceTab: chrome.tabs.Tab): Promise<void> {
  if (typeof sourceTab.windowId !== 'number' || typeof sourceTab.id !== 'number') {
    return;
  }

  const existingTab = await findExistingEagleTab(sourceTab.windowId);
  const sourceTabUrl = sourceTab.url ?? sourceTab.pendingUrl;
  const sourceIsEagle = isEagleUrl(sourceTabUrl);

  if (existingTab?.id) {
    if (!sourceIsEagle) {
      // Message the living page instead of re-navigating it: a reload
      // blanks the tab for a frame, which reads as flicker. Fall back
      // to navigation only if the page is gone (e.g. discarded).
      const reopened = await tryReopenExistingEagle(existingTab.id, sourceTab.id, sourceTab.windowId);

      if (!reopened) {
        await chrome.tabs.update(existingTab.id, {
          url: createEagleUrl(sourceTab.id, sourceTab.windowId),
          active: true
        });
      }
      return;
    }

    await hideTabEagle(sourceTab);
    return;
  }

  if (sourceIsEagle) {
    return;
  }

  await chrome.tabs.create({
    windowId: sourceTab.windowId,
    index: sourceTab.index + 1,
    url: createEagleUrl(sourceTab.id, sourceTab.windowId),
    active: true
  });
}

async function tryReopenExistingEagle(
  eagleTabId: number,
  sourceTabId: number,
  sourceWindowId: number
): Promise<boolean> {
  try {
    await chrome.tabs.update(eagleTabId, { active: true });
    const message: EagleReopenMessage = { type: 'tab-eagle-reopen', sourceTabId, sourceWindowId };
    const response: unknown = await chrome.tabs.sendMessage(eagleTabId, message);
    return response === true;
  } catch {
    return false;
  }
}

async function hideTabEagle(eagleTab: chrome.tabs.Tab): Promise<void> {
  const sourceTabId = getEagleSourceTabId(eagleTab.url ?? eagleTab.pendingUrl);

  if (typeof sourceTabId === 'number') {
    try {
      await chrome.tabs.update(sourceTabId, { active: true });
      return;
    } catch {
      // The source tab may have been closed while Tab Eagle stayed open.
    }
  }

  const fallbackTab = await findFallbackTab(eagleTab);
  if (fallbackTab?.id) {
    await chrome.tabs.update(fallbackTab.id, { active: true });
  }
}

async function findFallbackTab(eagleTab: chrome.tabs.Tab): Promise<chrome.tabs.Tab | undefined> {
  if (typeof eagleTab.windowId !== 'number') return undefined;

  const tabs = await chrome.tabs.query({ windowId: eagleTab.windowId });
  const eagleBaseUrl = getEagleBaseUrl();
  return tabs.find((tab) => tab.id !== eagleTab.id && !isEagleUrl(tab.url ?? tab.pendingUrl, eagleBaseUrl));
}
