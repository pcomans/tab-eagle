import { argbFromRgb, hexFromArgb, QuantizerMap, Score, themeFromSourceColor } from '@material/material-color-utilities';
import type { ManagedTab } from '../shared/types';
import type { ThemeMode } from './age-colors';

export interface DomainCardColors {
  container: string;
  onContainer: string;
  outline: string;
  primary: string;
}

export function colorsFromSourceArgb(sourceArgb: number, themeMode: ThemeMode = 'light'): DomainCardColors {
  const theme = themeFromSourceColor(sourceArgb);
  const scheme = themeMode === 'dark' ? theme.schemes.dark : theme.schemes.light;

  return {
    container: hexFromArgb(scheme.secondaryContainer),
    onContainer: hexFromArgb(scheme.onSecondaryContainer),
    outline: hexFromArgb(scheme.outlineVariant),
    primary: hexFromArgb(scheme.primary)
  };
}

export async function colorsFromImage(image: HTMLImageElement, themeMode: ThemeMode = 'light'): Promise<DomainCardColors> {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not read favicon colors.');

  canvas.width = image.width;
  canvas.height = image.height;
  context.drawImage(image, 0, 0);
  const imageBytes = context.getImageData(0, 0, image.width, image.height).data;
  return colorsFromSourceArgb(sourceColorFromFaviconBytes(imageBytes), themeMode);
}

export function sourceColorFromFaviconBytes(imageBytes: ArrayLike<number>): number {
  const pixels: number[] = [];
  for (let index = 0; index < imageBytes.length; index += 4) {
    if (imageBytes[index + 3] < 255) continue;
    pixels.push(argbFromRgb(imageBytes[index], imageBytes[index + 1], imageBytes[index + 2]));
  }
  return Score.score(QuantizerMap.quantize(pixels))[0];
}

export function faviconUrlForPageUrl(pageUrl: string): string {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', '32');
  return url.toString();
}

export function faviconUrlForTab(tab: Pick<ManagedTab, 'url' | 'pendingUrl'>): string | undefined {
  const pageUrl = tab.url ?? tab.pendingUrl;
  return pageUrl ? faviconUrlForPageUrl(pageUrl) : undefined;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', () => reject(new Error('Image failed to load.')), { once: true });

    image.decoding = 'async';
    image.src = url;
  });
}
