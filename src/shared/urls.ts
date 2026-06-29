export const EAGLE_PAGE_PATH = 'eagle/index.html';

export function getEagleBaseUrl(): string {
  return chrome.runtime.getURL(EAGLE_PAGE_PATH);
}

export function createEagleUrl(sourceTabId: number, sourceWindowId: number): string {
  const url = new URL(getEagleBaseUrl());
  url.searchParams.set('sourceTabId', String(sourceTabId));
  url.searchParams.set('sourceWindowId', String(sourceWindowId));
  url.searchParams.set('openNonce', crypto.randomUUID());
  return url.toString();
}

export function isEagleUrl(tabUrl: string | undefined, eagleBaseUrl = getEagleBaseUrl()): boolean {
  if (!tabUrl) return false;
  return tabUrl === eagleBaseUrl || tabUrl.startsWith(`${eagleBaseUrl}?`);
}
