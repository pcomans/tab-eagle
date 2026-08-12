import { describe, expect, it } from 'vitest';
import {
  cameraForBounds,
  cameraForResize,
  detailVisibilityForZoom,
  easeOutCubic,
  interpolateCameraView,
  zoomAboutPoint
} from './camera';

describe('cameraForBounds', () => {
  it('centers the bounds and caps a small result at the maximum zoom', () => {
    expect(cameraForBounds({ left: 100, top: 200, right: 300, bottom: 300 }, 1200, 800, 72, 0.22, 1.45)).toEqual({
      zoom: 1.45,
      panX: 310,
      panY: 37.5
    });
  });

  it('zooms out enough to contain results spread across the canvas', () => {
    const view = cameraForBounds({ left: 100, top: 100, right: 2100, bottom: 900 }, 1200, 800, 72, 0.22, 1.45);

    expect(view.zoom).toBeCloseTo(0.528);
    expect(view.panX).toBeCloseTo(19.2);
    expect(view.panY).toBeCloseTo(136);
  });

  it('respects the minimum zoom for bounds larger than the canvas can fit', () => {
    expect(cameraForBounds({ left: 0, top: 0, right: 10000, bottom: 10000 }, 1200, 800, 72, 0.22, 1.45).zoom).toBe(0.22);
  });
});

describe('zoomAboutPoint', () => {
  it('keeps the anchored world point fixed on screen', () => {
    const view = { zoom: 0.5, panX: 100, panY: 50 };
    const anchor = { x: 420, y: 280 };
    const worldPoint = {
      x: (anchor.x - view.panX) / view.zoom,
      y: (anchor.y - view.panY) / view.zoom
    };

    const zoomed = zoomAboutPoint(view, 1.1, anchor.x, anchor.y, 0.22, 1.45);

    expect(zoomed.panX + worldPoint.x * zoomed.zoom).toBeCloseTo(anchor.x);
    expect(zoomed.panY + worldPoint.y * zoomed.zoom).toBeCloseTo(anchor.y);
  });

  it('preserves the anchor when the requested zoom is clamped', () => {
    const zoomed = zoomAboutPoint({ zoom: 1, panX: 20, panY: 40 }, 4, 200, 160, 0.22, 1.45);

    expect(zoomed.zoom).toBe(1.45);
    expect(zoomed.panX).toBeCloseTo(-61);
    expect(zoomed.panY).toBeCloseTo(-14);
  });
});

describe('interpolateCameraView', () => {
  const from = { zoom: 0.4, panX: 120, panY: 80 };
  const to = { zoom: 1.2, panX: -300, panY: -180 };

  it('returns the exact endpoints', () => {
    expect(interpolateCameraView(from, to, 0, 1200, 800)).toEqual(from);
    expect(interpolateCameraView(from, to, 1, 1200, 800)).toEqual(to);
  });

  it('moves zoom monotonically in logarithmic space', () => {
    const first = interpolateCameraView(from, to, 0.25, 1200, 800);
    const middle = interpolateCameraView(from, to, 0.5, 1200, 800);
    const last = interpolateCameraView(from, to, 0.75, 1200, 800);

    expect(first.zoom).toBeGreaterThan(from.zoom);
    expect(middle.zoom).toBeGreaterThan(first.zoom);
    expect(last.zoom).toBeGreaterThan(middle.zoom);
    expect(last.zoom).toBeLessThan(to.zoom);
    expect(middle.zoom).toBeCloseTo(Math.sqrt(from.zoom * to.zoom));
  });
});

describe('cameraForResize', () => {
  it('keeps the same world point at the viewport center', () => {
    const resized = cameraForResize({ zoom: 0.8, panX: 120, panY: 60 }, 1000, 700, 1400, 900);

    expect(resized).toEqual({ zoom: 0.8, panX: 320, panY: 160 });
  });
});

describe('detailVisibilityForZoom', () => {
  it('uses hysteresis in both directions', () => {
    expect(detailVisibilityForZoom(false, 0.7, 0.72, 0.62)).toBe(false);
    expect(detailVisibilityForZoom(false, 0.72, 0.72, 0.62)).toBe(true);
    expect(detailVisibilityForZoom(true, 0.7, 0.72, 0.62)).toBe(true);
    expect(detailVisibilityForZoom(true, 0.62, 0.72, 0.62)).toBe(false);
  });
});

describe('easeOutCubic', () => {
  it('keeps exact endpoints and advances quickly before settling', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(0.5)).toBe(0.875);
    expect(easeOutCubic(1)).toBe(1);
  });
});
