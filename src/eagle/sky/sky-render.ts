import type { ThemeMode } from '../age-colors';
import {
  CLOUD_MASK_SCALE,
  CLOUD_SCALE_X,
  CLOUD_SCALE_Y,
  celestialPosition,
  clamp01,
  cloudAlphaAt,
  coverageForTabCount,
  driftForHours,
  fbm,
  gradeForHour,
  lerp,
  smooth,
  starHash,
  type Rgb,
  type SkyGrade
} from './sky-state';
import { applySkyTheme } from './sky-theme';

const RENDER_WIDTH = 520;
const STAR_COUNT = 220;

export interface SkyUpdaterOptions {
  getThemeMode: () => ThemeMode;
  onThemeModeChange?: (mode: ThemeMode) => void;
}

// Re-renders only when the visible scene can actually have changed: the clock
// minute, the cloud coverage, the theme mode, or the viewport size.
export function createSkyUpdater(
  skyCanvas: HTMLCanvasElement,
  starsCanvas: HTMLCanvasElement,
  options: SkyUpdaterOptions
): (tabCount: number) => void {
  let lastKey = '';
  let lastMode: ThemeMode | undefined;

  return function update(tabCount: number): void {
    const hoursAbs = localHoursAbs();
    const mode = options.getThemeMode();
    const coverage = coverageForTabCount(tabCount);
    const key = [
      Math.floor(hoursAbs * 60),
      coverage.toFixed(3),
      mode,
      `${skyCanvas.clientWidth}x${skyCanvas.clientHeight}`
    ].join('|');

    if (key === lastKey) return;
    lastKey = key;

    const grade = renderSky(skyCanvas, starsCanvas, hoursAbs, coverage);
    applySkyTheme(grade, mode);

    if (lastMode !== undefined && lastMode !== mode) {
      options.onThemeModeChange?.(mode);
    }
    lastMode = mode;
  };
}

// Wall-clock hours in local time: `hoursAbs % 24` must be the user's local
// hour so noon in the sky is noon outside the window.
function localHoursAbs(): number {
  const now = Date.now();
  return (now - new Date(now).getTimezoneOffset() * 60_000) / 3_600_000;
}

function renderSky(
  skyCanvas: HTMLCanvasElement,
  starsCanvas: HTMLCanvasElement,
  hoursAbs: number,
  coverage: number
): SkyGrade {
  const hourOfDay = ((hoursAbs % 24) + 24) % 24;
  const grade = gradeForHour(hourOfDay);
  const drift = driftForHours(hoursAbs);
  const body = celestialPosition(hourOfDay);

  const clientWidth = skyCanvas.clientWidth;
  const clientHeight = skyCanvas.clientHeight;
  if (clientWidth === 0 || clientHeight === 0) return grade;

  const width = RENDER_WIDTH;
  const height = Math.max(200, Math.round((width * clientHeight) / clientWidth));
  skyCanvas.width = width;
  skyCanvas.height = height;

  const ctx = skyCanvas.getContext('2d');
  if (!ctx) return grade;

  const bodyX = body.x * width;
  const bodyY = body.y * height;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, cssRgb(grade.top));
  gradient.addColorStop(1, cssRgb(grade.hor));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawGlow(ctx, grade, bodyX, bodyY, width, height);

  if (grade.night > 0.5) {
    ctx.fillStyle = `rgba(226,233,248,${0.85 * grade.night})`;
    ctx.beginPath();
    ctx.arc(bodyX, bodyY, width * 0.014, 0, Math.PI * 2);
    ctx.fill();
  }

  drawClouds(ctx, grade, drift, coverage, bodyX, bodyY, width, height);

  const haze = ctx.createLinearGradient(0, height * 0.55, 0, height);
  haze.addColorStop(0, cssRgba(grade.hor, 0));
  haze.addColorStop(1, cssRgba(grade.hor, 0.55));
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  renderStars(starsCanvas, grade, hoursAbs, drift, coverage);

  return grade;
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  grade: SkyGrade,
  bodyX: number,
  bodyY: number,
  width: number,
  height: number
): void {
  const day = clamp01(1 - grade.night);
  const radius = width * (0.32 + 0.25 * grade.glow);
  const glow = ctx.createRadialGradient(bodyX, bodyY, 0, bodyX, bodyY, radius);
  const alpha = day > 0.05 ? 0.55 * (0.35 + grade.glow) : 0.3 * grade.night;
  glow.addColorStop(0, cssRgba(grade.sun, alpha));
  glow.addColorStop(1, cssRgba(grade.sun, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  grade: SkyGrade,
  drift: number,
  coverage: number,
  bodyX: number,
  bodyY: number,
  width: number,
  height: number
): void {
  const image = ctx.createImageData(width, height);
  const pixels = image.data;
  const threshold = 1 - (0.3 + coverage * 0.52);

  for (let py = 0; py < height; py += 1) {
    const v = py / height;
    const verticalFade = smooth(0.02, 0.14, v) * (1 - smooth(0.78, 0.99, v));
    const y = v * CLOUD_SCALE_Y;

    for (let px = 0; px < width; px += 1) {
      const u = px / width;
      const x = u * CLOUD_SCALE_X + drift;
      const mask = smooth(0.36, 0.66, fbm(x * CLOUD_MASK_SCALE + drift * -0.12, y * CLOUD_MASK_SCALE, 3));
      const density = fbm(x, y, 5) * (0.5 + 0.75 * mask);
      const alpha = smooth(threshold, threshold + 0.26, density) * verticalFade;
      if (alpha <= 0.004) continue;

      // shade against the sample above to give the flat noise volume
      const lightAbove = fbm(x, y - 0.38, 5) * (0.5 + 0.75 * mask);
      const shade = clamp01(0.55 + (density - lightAbove) * 2.6);
      let r = lerp(grade.lo[0], grade.hi[0], shade);
      let g = lerp(grade.lo[1], grade.hi[1], shade);
      let b = lerp(grade.lo[2], grade.hi[2], shade);

      // warm the lit cloud faces near the sun/moon
      const dx = (px - bodyX) / width;
      const dy = (py - bodyY) / width;
      const warm = Math.exp(-(dx * dx + dy * dy) * 14) * (0.25 + grade.glow) * 0.9;
      r = lerp(r, grade.sun[0], warm * shade);
      g = lerp(g, grade.sun[1], warm * shade);
      b = lerp(b, grade.sun[2], warm * shade);

      const offset = (py * width + px) * 4;
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = alpha * 235;
    }
  }

  const layer = document.createElement('canvas');
  layer.width = width;
  layer.height = height;
  layer.getContext('2d')?.putImageData(image, 0, 0);
  ctx.drawImage(layer, 0, 0);
}

// Stars live on their own full-resolution, unblurred canvas: the cloud canvas
// is upscaled and blurred, which smears point lights into raindrop blobs.
function renderStars(
  canvas: HTMLCanvasElement,
  grade: SkyGrade,
  hoursAbs: number,
  drift: number,
  coverage: number
): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx || grade.night <= 0.02) return;

  for (let i = 0; i < STAR_COUNT; i += 1) {
    const u = starHash(i, 7);
    const v = starHash(i, 13) * 0.85;
    const twinkle = 0.55 + 0.45 * Math.sin(hoursAbs * 40 + i * 2.4);
    const alpha =
      (0.2 + 0.7 * starHash(i, 29)) * twinkle * grade.night * (1 - cloudAlphaAt(u, v, drift, coverage));
    if (alpha < 0.02) continue;

    const x = u * canvas.width;
    const y = v * canvas.height;
    const bright = starHash(i, 41) > 0.9;
    const radius = (bright ? 1.3 : 0.7 + 0.4 * starHash(i, 53)) * dpr;
    const tint = starHash(i, 61) > 0.88 ? '255,240,214' : '225,232,255';

    if (bright) {
      ctx.fillStyle = `rgba(${tint},${alpha * 0.22})`;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(${tint},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function cssRgb(color: Rgb): string {
  return `rgb(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])})`;
}

function cssRgba(color: Rgb, alpha: number): string {
  return `rgba(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])},${alpha})`;
}
