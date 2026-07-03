import { argbFromRgb, hexFromArgb, themeFromSourceColor, type Theme } from '@material/material-color-utilities';
import type { ThemeMode } from '../age-colors';
import type { SkyGrade } from './sky-state';

let cachedSourceArgb: number | undefined;
let cachedTheme: Theme | undefined;

// The sky drives the MD3 palette: the horizon color becomes the Material You
// source color, so the whole UI is lit by the current time of day.
export function applySkyTheme(grade: SkyGrade, mode: ThemeMode): void {
  const sourceArgb = argbFromRgb(
    Math.round(grade.hor[0]),
    Math.round(grade.hor[1]),
    Math.round(grade.hor[2])
  );

  if (sourceArgb !== cachedSourceArgb || !cachedTheme) {
    cachedSourceArgb = sourceArgb;
    cachedTheme = themeFromSourceColor(sourceArgb);
  }

  const theme = cachedTheme;
  const scheme = mode === 'dark' ? theme.schemes.dark : theme.schemes.light;
  const style = document.documentElement.style;
  const set = (token: string, argb: number): void => {
    style.setProperty(token, hexFromArgb(argb));
  };

  set('--md-sys-color-primary', scheme.primary);
  set('--md-sys-color-on-primary', scheme.onPrimary);
  set('--md-sys-color-primary-container', scheme.primaryContainer);
  set('--md-sys-color-on-primary-container', scheme.onPrimaryContainer);
  set('--md-sys-color-secondary', scheme.secondary);
  set('--md-sys-color-secondary-container', scheme.secondaryContainer);
  set('--md-sys-color-on-secondary-container', scheme.onSecondaryContainer);
  set('--md-sys-color-on-surface', scheme.onSurface);
  set('--md-sys-color-on-surface-variant', scheme.onSurfaceVariant);
  set('--md-sys-color-outline', scheme.outline);
  set('--md-sys-color-outline-variant', scheme.outlineVariant);

  // themeFromSourceColor predates the surface-container tiers; derive them
  // from the neutral tonal palette at the spec tones.
  const tones = mode === 'dark'
    ? { surface: 6, low: 10, container: 12, high: 17, highest: 22 }
    : { surface: 98, low: 96, container: 94, high: 92, highest: 90 };
  const neutral = theme.palettes.neutral;
  set('--md-sys-color-surface', neutral.tone(tones.surface));
  set('--md-sys-color-surface-container-low', neutral.tone(tones.low));
  set('--md-sys-color-surface-container', neutral.tone(tones.container));
  set('--md-sys-color-surface-container-high', neutral.tone(tones.high));
  set('--md-sys-color-surface-container-highest', neutral.tone(tones.highest));

  // Keeps native widgets, scrollbars, and the CSS fallback palette in step
  // when night forces dark mode while the OS is still in light mode.
  document.documentElement.dataset.colorScheme = mode;
}
