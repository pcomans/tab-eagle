import { createEagleUrl, getEagleBaseUrl, isEagleUrl } from '../shared/urls';

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
  const sourceIsEagle = isEagleUrl(sourceTab.url ?? sourceTab.pendingUrl);

  if (existingTab?.id) {
    if (!sourceIsEagle) {
      await chrome.tabs.update(existingTab.id, {
        url: createEagleUrl(sourceTab.id, sourceTab.windowId),
        active: true
      });
      return;
    }

    await chrome.tabs.update(existingTab.id, { active: true });
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
