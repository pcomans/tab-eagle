import { hexFromArgb, sourceColorFromImage, themeFromSourceColor } from '@material/material-color-utilities';
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
  const sourceArgb = await sourceColorFromImage(image);
  return colorsFromSourceArgb(sourceArgb, themeMode);
}

export function faviconUrlForPageUrl(pageUrl: string): string {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', '32');
  return url.toString();
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
