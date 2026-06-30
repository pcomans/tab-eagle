import { describe, expect, it } from 'vitest';
import { argbFromRgb } from '@material/material-color-utilities';
import { colorsFromSourceArgb, faviconUrlForPageUrl } from './domain-colors';

describe('colorsFromSourceArgb', () => {
  it('returns Material role colors as CSS hex values', () => {
    const colors = colorsFromSourceArgb(argbFromRgb(0, 101, 143));

    expect(colors.container).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.onContainer).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.outline).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.primary).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('faviconUrlForPageUrl', () => {
  it('constructs the Chrome MV3 favicon endpoint URL', () => {
    globalThis.chrome = {
      runtime: {
        getURL: (path: string) => `chrome-extension://extension-id${path}`
      }
    } as typeof chrome;

    const faviconUrl = new URL(faviconUrlForPageUrl('https://example.com/path'));

    expect(faviconUrl.protocol).toBe('chrome-extension:');
    expect(faviconUrl.hostname).toBe('extension-id');
    expect(faviconUrl.pathname).toBe('/_favicon/');
    expect(faviconUrl.searchParams.get('pageUrl')).toBe('https://example.com/path');
    expect(faviconUrl.searchParams.get('size')).toBe('32');
  });
});
