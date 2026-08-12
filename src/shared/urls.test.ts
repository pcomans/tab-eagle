import { describe, expect, it } from 'vitest';
import { getEagleSourceTabId, isEagleUrl, updateEagleSourceUrl } from './urls';

const EAGLE_BASE_URL = 'chrome-extension://extension-id/eagle/index.html';

describe('isEagleUrl', () => {
  it('matches the Tab Eagle page with or without query params', () => {
    expect(isEagleUrl(EAGLE_BASE_URL, EAGLE_BASE_URL)).toBe(true);
    expect(isEagleUrl(`${EAGLE_BASE_URL}?sourceTabId=123`, EAGLE_BASE_URL)).toBe(true);
  });

  it('rejects non-Eagle URLs', () => {
    expect(isEagleUrl('https://example.com', EAGLE_BASE_URL)).toBe(false);
  });
});

describe('getEagleSourceTabId', () => {
  it('returns the source tab id from a Tab Eagle URL', () => {
    expect(getEagleSourceTabId(`${EAGLE_BASE_URL}?sourceTabId=123`, EAGLE_BASE_URL)).toBe(123);
  });

  it('returns undefined when the source tab id is missing or invalid', () => {
    expect(getEagleSourceTabId(EAGLE_BASE_URL, EAGLE_BASE_URL)).toBeUndefined();
    expect(getEagleSourceTabId(`${EAGLE_BASE_URL}?sourceTabId=abc`, EAGLE_BASE_URL)).toBeUndefined();
  });

  it('returns undefined for non-Eagle URLs', () => {
    expect(getEagleSourceTabId('https://example.com?sourceTabId=123', EAGLE_BASE_URL)).toBeUndefined();
  });
});

describe('updateEagleSourceUrl', () => {
  it('updates the source while preserving unrelated page state', () => {
    expect(
      updateEagleSourceUrl(`${EAGLE_BASE_URL}?sourceTabId=1&sourceWindowId=2&openNonce=abc`, 7, 8)
    ).toBe(`${EAGLE_BASE_URL}?sourceTabId=7&sourceWindowId=8&openNonce=abc`);
  });

  it('removes a source tab that is no longer available', () => {
    expect(updateEagleSourceUrl(`${EAGLE_BASE_URL}?sourceTabId=1&sourceWindowId=2`, undefined, 2)).toBe(
      `${EAGLE_BASE_URL}?sourceWindowId=2`
    );
  });
});
