const HOUR_MS = 60 * 60 * 1000;

export interface SkyDrift {
  ax: number;
  ay: number;
  bx: number;
  cx: number;
  cy: number;
  dy: number;
  ey: number;
}

interface DriftComponent {
  amplitudePx: number;
  periodHours: number;
  phase: number;
}

// Periods are deliberately non-harmonic so the sky never repeats the
// same overall arrangement day to day. Amplitudes are bounded so every
// cloud stays inside its compositional zone (corner bleeds keep
// bleeding, margin puffs stay in the margins).
const COMPONENTS: Record<keyof SkyDrift, DriftComponent> = {
  ax: { amplitudePx: 34, periodHours: 26, phase: 0.7 },
  ay: { amplitudePx: 18, periodHours: 9.5, phase: 2.4 },
  bx: { amplitudePx: 44, periodHours: 21, phase: 4.1 },
  cx: { amplitudePx: 80, periodHours: 15, phase: 1.3 },
  cy: { amplitudePx: 26, periodHours: 33, phase: 5.2 },
  dy: { amplitudePx: 42, periodHours: 19, phase: 3.0 },
  ey: { amplitudePx: 36, periodHours: 24.7, phase: 0.2 }
};

export function skyDriftAt(date: Date): SkyDrift {
  const hours = date.getTime() / HOUR_MS;
  const drift = {} as SkyDrift;

  for (const key of Object.keys(COMPONENTS) as Array<keyof SkyDrift>) {
    const { amplitudePx, periodHours, phase } = COMPONENTS[key];
    const value = amplitudePx * Math.sin((2 * Math.PI * hours) / periodHours + phase);
    drift[key] = Math.round(value * 10) / 10;
  }

  return drift;
}

export function maxDriftPerMinutePx(): number {
  let max = 0;
  for (const { amplitudePx, periodHours } of Object.values(COMPONENTS)) {
    max = Math.max(max, (amplitudePx * 2 * Math.PI) / (periodHours * 60));
  }
  return max;
}
