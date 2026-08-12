import { beforeEach, describe, expect, it } from 'vitest';
import { argbFromRgb } from '@material/material-color-utilities';
import {
  colorsFromSourceArgb,
  faviconUrlForPageUrl,
  faviconUrlForTab,
  sourceColorFromFaviconBytes
} from './domain-colors';

beforeEach(() => {
  globalThis.chrome = {
    runtime: {
      getURL: (path: string) => `chrome-extension://extension-id${path}`
    }
  } as typeof chrome;
});

describe('colorsFromSourceArgb', () => {
  it('returns Material role colors as CSS hex values', () => {
    const colors = colorsFromSourceArgb(argbFromRgb(0, 101, 143));

    expect(colors.container).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.onContainer).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.outline).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.primary).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('sourceColorFromFaviconBytes', () => {
  it('selects a dominant opaque favicon color', () => {
    const red = [220, 30, 30, 255];
    const blue = [30, 80, 220, 255];

    expect(sourceColorFromFaviconBytes([...red, ...red, ...red, ...blue])).toBe(argbFromRgb(220, 30, 30));
  });

  it('ignores transparent pixels', () => {
    expect(sourceColorFromFaviconBytes([220, 30, 30, 0, 30, 80, 220, 255])).toBe(argbFromRgb(30, 80, 220));
  });
});

describe('faviconUrlForPageUrl', () => {
  it('constructs the Chrome MV3 favicon endpoint URL', () => {
    const faviconUrl = new URL(faviconUrlForPageUrl('https://example.com/path'));

    expect(faviconUrl.protocol).toBe('chrome-extension:');
    expect(faviconUrl.hostname).toBe('extension-id');
    expect(faviconUrl.pathname).toBe('/_favicon/');
    expect(faviconUrl.searchParams.get('pageUrl')).toBe('https://example.com/path');
    expect(faviconUrl.searchParams.get('size')).toBe('32');
  });
});

describe('faviconUrlForTab', () => {
  it('routes a tab favicon through the Chrome-local endpoint', () => {
    const faviconUrl = new URL(faviconUrlForTab({ url: 'https://example.com/page' })!);

    expect(faviconUrl.protocol).toBe('chrome-extension:');
    expect(faviconUrl.pathname).toBe('/_favicon/');
    expect(faviconUrl.searchParams.get('pageUrl')).toBe('https://example.com/page');
  });

  it('uses a pending URL and omits tabs without a page URL', () => {
    expect(new URL(faviconUrlForTab({ pendingUrl: 'https://example.com/loading' })!).searchParams.get('pageUrl')).toBe(
      'https://example.com/loading'
    );
    expect(faviconUrlForTab({})).toBeUndefined();
  });
});
