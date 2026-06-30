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

export function getEagleSourceTabId(tabUrl: string | undefined, eagleBaseUrl = getEagleBaseUrl()): number | undefined {
  if (!tabUrl || !isEagleUrl(tabUrl, eagleBaseUrl)) return undefined;

  try {
    const url = new URL(tabUrl);
    const sourceTabIdParam = url.searchParams.get('sourceTabId');
    if (!sourceTabIdParam) return undefined;

    const sourceTabId = Number(sourceTabIdParam);
    return Number.isInteger(sourceTabId) ? sourceTabId : undefined;
  } catch {
    return undefined;
  }
}
