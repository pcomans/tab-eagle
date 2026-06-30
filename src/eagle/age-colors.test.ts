import { describe, expect, it } from 'vitest';
import { Hct } from '@material/material-color-utilities';
import { ageBucketForLastAccessed, colorsForAgeBucket, isAgeSortMode, type AgeBucket } from './age-colors';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-29T12:00:00Z').getTime();
const AGE_BUCKETS: AgeBucket[] = ['fiveMinutes', 'oneHour', 'sixHours', 'oneDay', 'threeDays', 'oneWeek'];

describe('ageBucketForLastAccessed', () => {
  it('uses a blue bucket for very recently used tabs', () => {
    expect(ageBucketForLastAccessed(NOW - 4 * 60 * 1000, NOW)).toBe('fiveMinutes');
  });

  it('keeps tabs between five minutes and one hour neutral', () => {
    expect(ageBucketForLastAccessed(NOW - 30 * 60 * 1000, NOW)).toBeUndefined();
  });

  it('uses fast ADHD-friendly tab-aging buckets', () => {
    expect(ageBucketForLastAccessed(NOW - 1 * 60 * 60 * 1000, NOW)).toBe('oneHour');
    expect(ageBucketForLastAccessed(NOW - 6 * 60 * 60 * 1000, NOW)).toBe('sixHours');
    expect(ageBucketForLastAccessed(NOW - 1 * DAY_MS, NOW)).toBe('oneDay');
    expect(ageBucketForLastAccessed(NOW - 3 * DAY_MS, NOW)).toBe('threeDays');
    expect(ageBucketForLastAccessed(NOW - 7 * DAY_MS, NOW)).toBe('oneWeek');
    expect(ageBucketForLastAccessed(NOW - 14 * DAY_MS, NOW)).toBe('oneWeek');
  });

  it('leaves unknown access times uncolored', () => {
    expect(ageBucketForLastAccessed(undefined, NOW)).toBeUndefined();
  });
});

describe('colorsForAgeBucket', () => {
  it('returns Material role colors as CSS hex values', () => {
    const colors = colorsForAgeBucket('oneWeek');

    expect(colors.container).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.onContainer).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.outline).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.primary).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('keeps bucket container tones visually consistent', () => {
    const tones = AGE_BUCKETS.map((bucket) => Hct.fromInt(argbFromHex(colorsForAgeBucket(bucket).container)).tone);

    expect(Math.max(...tones) - Math.min(...tones)).toBeLessThan(1);
  });
});

describe('isAgeSortMode', () => {
  it('only enables age coloring for age sorts', () => {
    expect(isAgeSortMode('recent')).toBe(true);
    expect(isAgeSortMode('leastRecent')).toBe(true);
    expect(isAgeSortMode('domain')).toBe(false);
    expect(isAgeSortMode('position')).toBe(false);
  });
});

function argbFromHex(hex: string): number {
  return Number.parseInt(`ff${hex.slice(1)}`, 16);
}
