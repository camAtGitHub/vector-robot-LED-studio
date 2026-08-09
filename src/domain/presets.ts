/**
 * Quick pattern presets for the editor (apply to current mode only).
 * Pure functions — no React.
 */

import type { Pattern, Rgba } from './types';
import { SOLID_ON_PERIOD } from './player';

const BLACK: Rgba = [0, 0, 0, 1];
const LED_COUNT = 3;

function tripleRgba(c: Rgba): [Rgba, Rgba, Rgba] {
  return [[...c] as Rgba, [...c] as Rgba, [...c] as Rgba];
}

function tripleN(n: number): [number, number, number] {
  return [n, n, n];
}

/** Solid color on all LEDs (onPeriod = 0xFFFF). */
export function presetSolid(color: Rgba = [0, 0.85, 1, 1]): Pattern {
  const on = tripleRgba(color);
  return {
    onColors: on,
    offColors: on.map((c) => [...c] as Rgba) as [Rgba, Rgba, Rgba],
    onPeriod_ms: tripleN(SOLID_ON_PERIOD),
    offPeriod_ms: tripleN(0),
    transitionOnPeriod_ms: tripleN(0),
    transitionOffPeriod_ms: tripleN(0),
    offset: tripleN(0),
  };
}

/** Equal on/off blink, all LEDs in sync. */
export function presetBlink(
  color: Rgba = [1, 0.2, 0.1, 1],
  onMs = 400,
  offMs = 400
): Pattern {
  return {
    onColors: tripleRgba(color),
    offColors: tripleRgba(BLACK),
    onPeriod_ms: tripleN(onMs),
    offPeriod_ms: tripleN(offMs),
    transitionOnPeriod_ms: tripleN(0),
    transitionOffPeriod_ms: tripleN(0),
    offset: tripleN(0),
  };
}

/** Long transitions, short holds — breathing pulse. */
export function presetBreathe(
  color: Rgba = [0.2, 0.6, 1, 1],
  holdOnMs = 200,
  holdOffMs = 200,
  transMs = 800
): Pattern {
  return {
    onColors: tripleRgba(color),
    offColors: tripleRgba(BLACK),
    onPeriod_ms: tripleN(holdOnMs),
    offPeriod_ms: tripleN(holdOffMs),
    transitionOnPeriod_ms: tripleN(transMs),
    transitionOffPeriod_ms: tripleN(transMs),
    offset: tripleN(0),
  };
}

/**
 * Chase: same cycle on all LEDs with offsets 0 / third / 2× third of cycle.
 * Matches the “staggered breath” look of charging-style patterns.
 */
export function presetChase(
  color: Rgba = [0, 0.5, 0, 1],
  onMs = 600,
  offMs = 600,
  transMs = 300
): Pattern {
  const cycle = transMs + onMs + transMs + offMs;
  const third = Math.round(cycle / 3);
  return {
    onColors: tripleRgba(color),
    offColors: tripleRgba(BLACK),
    onPeriod_ms: tripleN(onMs),
    offPeriod_ms: tripleN(offMs),
    transitionOnPeriod_ms: tripleN(transMs),
    transitionOffPeriod_ms: tripleN(transMs),
    offset: [0, third, third * 2],
  };
}

/** Only one LED active (solid color); others black solid. */
export function presetSingleLed(
  ledIndex: 0 | 1 | 2,
  color: Rgba = [1, 0, 0, 1]
): Pattern {
  const onColors: [Rgba, Rgba, Rgba] = [
    [...BLACK] as Rgba,
    [...BLACK] as Rgba,
    [...BLACK] as Rgba,
  ];
  onColors[ledIndex] = [...color] as Rgba;
  return {
    onColors,
    offColors: onColors.map((c) => [...c] as Rgba) as [Rgba, Rgba, Rgba],
    onPeriod_ms: tripleN(SOLID_ON_PERIOD),
    offPeriod_ms: tripleN(0),
    transitionOnPeriod_ms: tripleN(0),
    transitionOffPeriod_ms: tripleN(0),
    offset: tripleN(0),
  };
}

/** Max cycle length across non-solid LEDs (for timeline scrub). */
export function patternCycleMs(pattern: Pattern): number {
  let max = 0;
  for (let i = 0; i < LED_COUNT; i++) {
    const on = pattern.onPeriod_ms[i];
    if (on === SOLID_ON_PERIOD) continue;
    const total =
      pattern.transitionOnPeriod_ms[i] +
      pattern.onPeriod_ms[i] +
      pattern.transitionOffPeriod_ms[i] +
      pattern.offPeriod_ms[i];
    if (total > max) max = total;
  }
  // Solid-only patterns: still show a short timeline window
  return max > 0 ? max : 2000;
}

/** Deep clone a pattern. */
export function clonePattern(pattern: Pattern): Pattern {
  return {
    onColors: pattern.onColors.map((c) => [...c] as Rgba) as Pattern['onColors'],
    offColors: pattern.offColors.map(
      (c) => [...c] as Rgba
    ) as Pattern['offColors'],
    onPeriod_ms: [...pattern.onPeriod_ms] as Pattern['onPeriod_ms'],
    offPeriod_ms: [...pattern.offPeriod_ms] as Pattern['offPeriod_ms'],
    transitionOnPeriod_ms: [
      ...pattern.transitionOnPeriod_ms,
    ] as Pattern['transitionOnPeriod_ms'],
    transitionOffPeriod_ms: [
      ...pattern.transitionOffPeriod_ms,
    ] as Pattern['transitionOffPeriod_ms'],
    offset: [...pattern.offset] as Pattern['offset'],
  };
}

export type PresetId =
  | 'solid'
  | 'blink'
  | 'breathe'
  | 'chase'
  | 'single-front'
  | 'single-middle'
  | 'single-back';

/** Apply named preset using a base on-color from the current pattern (LED 0). */
export function applyPreset(id: PresetId, baseColor?: Rgba): Pattern {
  const color = baseColor ?? ([0, 0.85, 1, 1] as Rgba);
  switch (id) {
    case 'solid':
      return presetSolid(color);
    case 'blink':
      return presetBlink(color);
    case 'breathe':
      return presetBreathe(color);
    case 'chase':
      return presetChase(color);
    case 'single-front':
      return presetSingleLed(0, color);
    case 'single-middle':
      return presetSingleLed(1, color);
    case 'single-back':
      return presetSingleLed(2, color);
    default:
      return presetSolid(color);
  }
}
