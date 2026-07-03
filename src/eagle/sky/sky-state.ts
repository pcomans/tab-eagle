import type { ThemeMode } from '../age-colors';

// The entire sky is a pure function of (wall-clock hours, tab count): the same
// moment always renders the same frame, so reopening Tab Eagle never jumps, and
// cloud drift appears to continue while the page is closed.

export type Rgb = readonly [number, number, number];

export interface SkyGrade {
  top: Rgb;
  hor: Rgb;
  hi: Rgb;
  lo: Rgb;
  sun: Rgb;
  night: number;
  glow: number;
}

interface SkyKeyframe extends SkyGrade {
  h: number;
}

export const CLOUD_SCALE_X = 3.1;
export const CLOUD_SCALE_Y = 6.4;
export const CLOUD_MASK_SCALE = 0.33;
export const CLOUD_DRIFT_PER_HOUR = 0.35;
export const NIGHT_UI_THRESHOLD = 0.65;

const KEYS: SkyKeyframe[] = [
  { h: 0.0,  top: [6, 11, 28],    hor: [20, 32, 58],    hi: [58, 68, 94],    lo: [21, 29, 46],    sun: [200, 214, 255], night: 1.0,  glow: 0.0 },
  { h: 4.5,  top: [8, 16, 39],    hor: [26, 39, 66],    hi: [64, 74, 100],   lo: [24, 32, 50],    sun: [200, 214, 255], night: 1.0,  glow: 0.0 },
  { h: 6.0,  top: [51, 64, 110],  hor: [217, 134, 90],  hi: [242, 180, 140], lo: [90, 82, 115],   sun: [255, 217, 168], night: 0.4,  glow: 0.75 },
  { h: 7.5,  top: [90, 134, 194], hor: [244, 199, 143], hi: [253, 227, 194], lo: [139, 143, 174], sun: [255, 226, 178], night: 0.05, glow: 0.5 },
  { h: 10.0, top: [79, 157, 224], hor: [207, 230, 246], hi: [255, 255, 255], lo: [159, 180, 204], sun: [255, 250, 235], night: 0.0,  glow: 0.25 },
  { h: 13.0, top: [63, 146, 221], hor: [198, 226, 245], hi: [255, 255, 255], lo: [160, 182, 207], sun: [255, 250, 235], night: 0.0,  glow: 0.2 },
  { h: 16.5, top: [77, 142, 207], hor: [216, 227, 236], hi: [255, 246, 232], lo: [154, 168, 192], sun: [255, 240, 210], night: 0.0,  glow: 0.3 },
  { h: 18.5, top: [70, 99, 159],  hor: [242, 169, 94],  hi: [255, 221, 172], lo: [172, 134, 129], sun: [255, 190, 115], night: 0.1,  glow: 0.85 },
  { h: 19.8, top: [42, 52, 101],  hor: [209, 115, 138], hi: [232, 160, 168], lo: [104, 90, 122],  sun: [255, 170, 140], night: 0.45, glow: 0.5 },
  { h: 21.0, top: [13, 20, 46],   hor: [35, 48, 79],    hi: [74, 84, 112],   lo: [28, 36, 56],    sun: [200, 214, 255], night: 0.9,  glow: 0.0 },
  { h: 24.0, top: [6, 11, 28],    hor: [20, 32, 58],    hi: [58, 68, 94],    lo: [21, 29, 46],    sun: [200, 214, 255], night: 1.0,  glow: 0.0 }
];

export const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

export function smooth(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t)
];

function hashLattice(ix: number, iy: number): number {
  let n = (ix * 374761393 + iy * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function starHash(index: number, salt: number): number {
  return hashLattice(index, salt);
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hashLattice(ix, iy);
  const b = hashLattice(ix + 1, iy);
  const c = hashLattice(ix, iy + 1);
  const d = hashLattice(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function fbm(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.52;
  let px = x;
  let py = y;
  for (let octave = 0; octave < octaves; octave += 1) {
    value += amplitude * valueNoise(px, py);
    px = px * 2.03 + 17.3;
    py = py * 2.03 + 9.1;
    amplitude *= 0.5;
  }
  return value;
}

export function gradeForHour(hourOfDay: number): SkyGrade {
  const h = ((hourOfDay % 24) + 24) % 24;
  let index = 0;
  while (index < KEYS.length - 2 && KEYS[index + 1].h <= h) index += 1;
  const from = KEYS[index];
  const to = KEYS[index + 1];
  const t = smooth(0, 1, (h - from.h) / (to.h - from.h));
  return {
    top: mixRgb(from.top, to.top, t),
    hor: mixRgb(from.hor, to.hor, t),
    hi: mixRgb(from.hi, to.hi, t),
    lo: mixRgb(from.lo, to.lo, t),
    sun: mixRgb(from.sun, to.sun, t),
    night: lerp(from.night, to.night, t),
    glow: lerp(from.glow, to.glow, t)
  };
}

export function coverageForTabCount(tabCount: number): number {
  return clamp01(0.16 + (Math.max(0, tabCount) / 110) * 0.62);
}

export function driftForHours(hoursAbs: number): number {
  return hoursAbs * CLOUD_DRIFT_PER_HOUR;
}

// Normalized (0..1) position of the sun (day) or moon (night) along its arc.
export function celestialPosition(hourOfDay: number): { x: number; y: number } {
  const h = ((hourOfDay % 24) + 24) % 24;
  if (h >= 6 && h <= 20) {
    const progress = (h - 6) / 14;
    return { x: 0.12 + 0.76 * progress, y: 0.62 - 0.5 * Math.sin(Math.PI * progress) };
  }
  const hh = h < 6 ? h + 24 : h;
  const progress = (hh - 20) / 10;
  return { x: 0.15 + 0.7 * progress, y: 0.45 - 0.3 * Math.sin(Math.PI * progress) };
}

// Cloud opacity at a normalized point — the same field the cloud render pass
// uses, so stars can dim behind clouds without reading pixels back.
export function cloudAlphaAt(u: number, v: number, drift: number, coverage: number): number {
  const threshold = 1 - (0.3 + coverage * 0.52);
  const x = u * CLOUD_SCALE_X + drift;
  const y = v * CLOUD_SCALE_Y;
  const mask = smooth(0.36, 0.66, fbm(x * CLOUD_MASK_SCALE + drift * -0.12, y * CLOUD_MASK_SCALE, 3));
  const density = fbm(x, y, 5) * (0.5 + 0.75 * mask);
  const verticalFade = smooth(0.02, 0.14, v) * (1 - smooth(0.78, 0.99, v));
  return smooth(threshold, threshold + 0.26, density) * verticalFade;
}

// The sky decides the UI's light/dark mode: night snaps the theme dark even if
// the OS is in light mode. A linear blend would collapse text contrast at
// twilight, so this is a hard threshold, not a mix.
export function effectiveThemeMode(prefersDark: boolean, hourOfDay: number): ThemeMode {
  if (prefersDark) return 'dark';
  return gradeForHour(hourOfDay).night > NIGHT_UI_THRESHOLD ? 'dark' : 'light';
}
