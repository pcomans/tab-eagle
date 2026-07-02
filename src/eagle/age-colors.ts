import { argbFromRgb, hexFromArgb, TonalPalette } from '@material/material-color-utilities';
import type { SortMode } from '../shared/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const LIGHT_CONTAINER_TONE = 90;
const LIGHT_ON_CONTAINER_TONE = 10;
const LIGHT_OUTLINE_TONE = 72;
const LIGHT_PRIMARY_TONE = 40;
const DARK_CONTAINER_TONE = 30;
const DARK_ON_CONTAINER_TONE = 90;
const DARK_OUTLINE_TONE = 60;
const DARK_PRIMARY_TONE = 80;

export type AgeBucket = 'fiveMinutes' | 'oneHour' | 'sixHours' | 'oneDay' | 'threeDays' | 'oneWeek';

export interface AgeCardColors {
  container: string;
  onContainer: string;
  outline: string;
  primary: string;
}

const AGE_COLORS: Record<AgeBucket, AgeCardColors> = {
  fiveMinutes: colorsFromRgb(0, 101, 143, 'light'),
  oneHour: colorsFromRgb(164, 129, 34, 'light'),
  sixHours: colorsFromRgb(180, 130, 0, 'light'),
  oneDay: colorsFromRgb(177, 108, 0, 'light'),
  threeDays: colorsFromRgb(145, 84, 0, 'light'),
  oneWeek: colorsFromRgb(102, 72, 45, 'light')
};

const DARK_AGE_COLORS: Record<AgeBucket, AgeCardColors> = {
  fiveMinutes: colorsFromRgb(0, 101, 143, 'dark'),
  oneHour: colorsFromRgb(164, 129, 34, 'dark'),
  sixHours: colorsFromRgb(180, 130, 0, 'dark'),
  oneDay: colorsFromRgb(177, 108, 0, 'dark'),
  threeDays: colorsFromRgb(145, 84, 0, 'dark'),
  oneWeek: colorsFromRgb(102, 72, 45, 'dark')
};

export type ThemeMode = 'light' | 'dark';

export function ageBucketForLastAccessed(lastAccessed: number | undefined, now = Date.now()): AgeBucket | undefined {
  if (typeof lastAccessed !== 'number') return undefined;

  const elapsedMs = Math.max(0, now - lastAccessed);
  const elapsedDays = Math.floor(elapsedMs / DAY_MS);

  if (elapsedDays >= 7) return 'oneWeek';
  if (elapsedDays >= 3) return 'threeDays';
  if (elapsedDays >= 1) return 'oneDay';
  if (elapsedMs >= 6 * HOUR_MS) return 'sixHours';
  if (elapsedMs >= HOUR_MS) return 'oneHour';
  if (elapsedMs < 5 * MINUTE_MS) return 'fiveMinutes';
  return undefined;
}

export function colorsForAgeBucket(bucket: AgeBucket, themeMode: ThemeMode = 'light'): AgeCardColors {
  return themeMode === 'dark' ? DARK_AGE_COLORS[bucket] : AGE_COLORS[bucket];
}

export function isAgeSortMode(sortMode: SortMode): boolean {
  return sortMode === 'recent' || sortMode === 'leastRecent';
}

function colorsFromRgb(red: number, green: number, blue: number, themeMode: ThemeMode): AgeCardColors {
  const palette = TonalPalette.fromInt(argbFromRgb(red, green, blue));
  const tones =
    themeMode === 'dark'
      ? {
          container: DARK_CONTAINER_TONE,
          onContainer: DARK_ON_CONTAINER_TONE,
          outline: DARK_OUTLINE_TONE,
          primary: DARK_PRIMARY_TONE
        }
      : {
          container: LIGHT_CONTAINER_TONE,
          onContainer: LIGHT_ON_CONTAINER_TONE,
          outline: LIGHT_OUTLINE_TONE,
          primary: LIGHT_PRIMARY_TONE
        };

  return {
    container: hexFromArgb(palette.tone(tones.container)),
    onContainer: hexFromArgb(palette.tone(tones.onContainer)),
    outline: hexFromArgb(palette.tone(tones.outline)),
    primary: hexFromArgb(palette.tone(tones.primary))
  };
}
