import { describe, expect, it } from 'vitest';
import { cameraForBounds } from './camera-fit';

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
