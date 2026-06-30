import { argbFromRgb, hexFromArgb, TonalPalette } from '@material/material-color-utilities';
import type { SortMode } from '../shared/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const CONTAINER_TONE = 90;
const ON_CONTAINER_TONE = 10;
const OUTLINE_TONE = 72;
const PRIMARY_TONE = 40;

export type AgeBucket = 'fiveMinutes' | 'oneHour' | 'sixHours' | 'oneDay' | 'threeDays' | 'oneWeek';

export interface AgeCardColors {
  container: string;
  onContainer: string;
  outline: string;
  primary: string;
}

const AGE_COLORS: Record<AgeBucket, AgeCardColors> = {
  fiveMinutes: colorsFromRgb(0, 101, 143),
  oneHour: colorsFromRgb(164, 129, 34),
  sixHours: colorsFromRgb(180, 130, 0),
  oneDay: colorsFromRgb(177, 108, 0),
  threeDays: colorsFromRgb(145, 84, 0),
  oneWeek: colorsFromRgb(102, 72, 45)
};

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

export function colorsForAgeBucket(bucket: AgeBucket): AgeCardColors {
  return AGE_COLORS[bucket];
}

export function isAgeSortMode(sortMode: SortMode): boolean {
  return sortMode === 'recent' || sortMode === 'leastRecent';
}

function colorsFromRgb(red: number, green: number, blue: number): AgeCardColors {
  const palette = TonalPalette.fromInt(argbFromRgb(red, green, blue));

  return {
    container: hexFromArgb(palette.tone(CONTAINER_TONE)),
    onContainer: hexFromArgb(palette.tone(ON_CONTAINER_TONE)),
    outline: hexFromArgb(palette.tone(OUTLINE_TONE)),
    primary: hexFromArgb(palette.tone(PRIMARY_TONE))
  };
}
