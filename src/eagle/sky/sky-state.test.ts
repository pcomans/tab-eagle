import { describe, expect, it } from 'vitest';
import {
  cloudAlphaAt,
  celestialPosition,
  coverageForTabCount,
  driftForHours,
  effectiveThemeMode,
  fbm,
  gradeForHour,
  type Rgb
} from './sky-state';

function expectChannel(color: Rgb): void {
  for (const channel of color) {
    expect(channel).toBeGreaterThanOrEqual(0);
    expect(channel).toBeLessThanOrEqual(255);
    expect(Number.isFinite(channel)).toBe(true);
  }
}

describe('gradeForHour', () => {
  it('wraps midnight seamlessly', () => {
    expect(gradeForHour(0)).toEqual(gradeForHour(24));
    expect(gradeForHour(-1)).toEqual(gradeForHour(23));
  });

  it('stays within valid ranges across the whole day', () => {
    for (let h = 0; h <= 24; h += 0.25) {
      const grade = gradeForHour(h);
      expectChannel(grade.top);
      expectChannel(grade.hor);
      expectChannel(grade.hi);
      expectChannel(grade.lo);
      expectChannel(grade.sun);
      expect(grade.night).toBeGreaterThanOrEqual(0);
      expect(grade.night).toBeLessThanOrEqual(1);
      expect(grade.glow).toBeGreaterThanOrEqual(0);
      expect(grade.glow).toBeLessThanOrEqual(1);
    }
  });

  it('is dark at midnight and bright at noon', () => {
    expect(gradeForHour(0).night).toBe(1);
    expect(gradeForHour(13).night).toBe(0);
  });
});

describe('coverageForTabCount', () => {
  it('grows with tab count and clamps at both ends', () => {
    expect(coverageForTabCount(5)).toBeLessThan(coverageForTabCount(80));
    expect(coverageForTabCount(0)).toBeGreaterThan(0);
    expect(coverageForTabCount(-3)).toBe(coverageForTabCount(0));
    expect(coverageForTabCount(10_000)).toBe(1);
  });
});

describe('cloudAlphaAt', () => {
  it('is deterministic and bounded', () => {
    const drift = driftForHours(492_301.25);
    for (const [u, v] of [
      [0.1, 0.2],
      [0.5, 0.5],
      [0.9, 0.05]
    ]) {
      const alpha = cloudAlphaAt(u, v, drift, 0.4);
      expect(alpha).toBe(cloudAlphaAt(u, v, drift, 0.4));
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
    }
  });

  it('produces more cloud at higher coverage', () => {
    const drift = driftForHours(492_301.25);
    let low = 0;
    let high = 0;
    for (let i = 0; i < 400; i += 1) {
      const u = (i % 20) / 20;
      const v = Math.floor(i / 20) / 20;
      low += cloudAlphaAt(u, v, drift, 0.16);
      high += cloudAlphaAt(u, v, drift, 0.78);
    }
    expect(high).toBeGreaterThan(low);
  });
});

describe('fbm', () => {
  it('is deterministic', () => {
    expect(fbm(12.34, 5.67, 5)).toBe(fbm(12.34, 5.67, 5));
  });
});

describe('celestialPosition', () => {
  it('keeps the body inside the sky for every hour', () => {
    for (let h = 0; h < 24; h += 0.5) {
      const { x, y } = celestialPosition(h);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });
});

describe('effectiveThemeMode', () => {
  it('respects an explicit dark preference at any hour', () => {
    expect(effectiveThemeMode(true, 13)).toBe('dark');
    expect(effectiveThemeMode(true, 0)).toBe('dark');
  });

  it('snaps light-preference users dark only at night', () => {
    expect(effectiveThemeMode(false, 13)).toBe('light');
    expect(effectiveThemeMode(false, 8)).toBe('light');
    expect(effectiveThemeMode(false, 0)).toBe('dark');
    expect(effectiveThemeMode(false, 22)).toBe('dark');
  });
});
