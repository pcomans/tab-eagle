import { describe, expect, it } from 'vitest';
import { maxDriftPerMinutePx, skyDriftAt } from './sky-drift';

const MINUTE_MS = 60 * 1000;

describe('skyDriftAt', () => {
  it('is deterministic for a given instant', () => {
    const at = new Date('2026-07-03T14:30:00Z');
    expect(skyDriftAt(at)).toEqual(skyDriftAt(new Date(at)));
  });

  it('stays within each component amplitude', () => {
    for (let hour = 0; hour < 24 * 7; hour += 1) {
      const drift = skyDriftAt(new Date(Date.UTC(2026, 6, 3, hour)));
      expect(Math.abs(drift.ax)).toBeLessThanOrEqual(34);
      expect(Math.abs(drift.ay)).toBeLessThanOrEqual(18);
      expect(Math.abs(drift.bx)).toBeLessThanOrEqual(44);
      expect(Math.abs(drift.cx)).toBeLessThanOrEqual(80);
      expect(Math.abs(drift.cy)).toBeLessThanOrEqual(26);
      expect(Math.abs(drift.dy)).toBeLessThanOrEqual(42);
      expect(Math.abs(drift.ey)).toBeLessThanOrEqual(36);
    }
  });

  it('never moves more than a hair between minute ticks', () => {
    const start = new Date('2026-07-03T00:00:00Z').getTime();
    for (let minute = 0; minute < 24 * 60; minute += 7) {
      const a = skyDriftAt(new Date(start + minute * MINUTE_MS));
      const b = skyDriftAt(new Date(start + (minute + 1) * MINUTE_MS));
      for (const key of Object.keys(a) as Array<keyof typeof a>) {
        expect(Math.abs(a[key] - b[key])).toBeLessThan(2);
      }
    }
  });

  it('drifts noticeably across several hours', () => {
    const morning = skyDriftAt(new Date('2026-07-03T08:00:00Z'));
    const evening = skyDriftAt(new Date('2026-07-03T17:30:00Z'));
    const totalShift = Object.keys(morning).reduce(
      (sum, key) => sum + Math.abs(morning[key as keyof typeof morning] - evening[key as keyof typeof evening]),
      0
    );
    expect(totalShift).toBeGreaterThan(40);
  });

  it('is continuous across midnight', () => {
    const before = skyDriftAt(new Date('2026-07-03T23:59:30Z'));
    const after = skyDriftAt(new Date('2026-07-04T00:00:30Z'));
    for (const key of Object.keys(before) as Array<keyof typeof before>) {
      expect(Math.abs(before[key] - after[key])).toBeLessThan(2);
    }
  });

  it('caps live drift below one pixel per minute', () => {
    expect(maxDriftPerMinutePx()).toBeLessThan(1);
  });
});
