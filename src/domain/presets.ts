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

/** Minimum post-offset time shown on the strip so a short loop is visible. */
const MIN_LOOP_VISIBLE_MS = 2000;
const SOLID_WINDOW_MS = 2000;
const LCM_CAP_MS = 30_000;

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return Math.max(a, b);
  return Math.abs((a / gcd(a, b)) * b);
}

/** Per-LED firmware loop length, or null if solid / zero (no modulo). */
function ledLoopMs(pattern: Pattern, i: number): number | null {
  if (pattern.onPeriod_ms[i] === SOLID_ON_PERIOD) return null;
  const total =
    pattern.transitionOnPeriod_ms[i] +
    pattern.onPeriod_ms[i] +
    pattern.transitionOffPeriod_ms[i] +
    pattern.offPeriod_ms[i];
  return total > 0 ? total : null;
}

/** Repeating period after offset: max(transOn + on + transOff + off). */
export function patternPeriodMs(pattern: Pattern): number {
  let max = 0;
  for (let i = 0; i < LED_COUNT; i++) {
    const loop = ledLoopMs(pattern, i);
    if (loop != null && loop > max) max = loop;
  }
  return max;
}

/**
 * One-shot wait before any LED enters its loop (firmware applies offset once).
 * Negative offsets start already inside the cycle, so they do not extend intro.
 */
export function patternIntroMs(pattern: Pattern): number {
  let max = 0;
  for (let i = 0; i < LED_COUNT; i++) {
    if (ledLoopMs(pattern, i) == null) continue;
    const offset = pattern.offset[i] ?? 0;
    if (offset > max) max = offset;
  }
  return max;
}

/** Combined loop length used to wrap the playhead without restarting offset. */
function patternLoopUnitMs(pattern: Pattern): number {
  const periods: number[] = [];
  for (let i = 0; i < LED_COUNT; i++) {
    const loop = ledLoopMs(pattern, i);
    if (loop != null) periods.push(loop);
  }
  if (periods.length === 0) return 0;
  let unit = periods[0];
  for (let i = 1; i < periods.length; i++) {
    const next = lcm(unit, periods[i]);
    if (next > LCM_CAP_MS) return Math.max(...periods);
    unit = next;
  }
  return unit;
}

/**
 * Timeline strip length: one-shot offset wait, then enough loop repeats
 * that the robot’s ongoing flash is visible (not a single first-cycle blip).
 */
export function patternWindowMs(pattern: Pattern): number {
  const intro = patternIntroMs(pattern);
  const unit = patternLoopUnitMs(pattern);
  if (unit <= 0) return SOLID_WINDOW_MS;
  const repeats = Math.max(1, Math.ceil(MIN_LOOP_VISIBLE_MS / unit));
  return intro + unit * repeats;
}

/** @deprecated Use patternWindowMs — kept as the strip/scrub window. */
export function patternCycleMs(pattern: Pattern): number {
  return patternWindowMs(pattern);
}

/**
 * Map continuous robot time onto the timeline strip.
 * After the offset wait, wraps only the looping tail — never restarts intro.
 */
export function previewPlayheadMs(timeMs: number, pattern: Pattern): number {
  const t = Math.max(0, timeMs);
  const intro = patternIntroMs(pattern);
  const window = patternWindowMs(pattern);
  if (t <= intro) return t;
  const tail = window - intro;
  if (tail <= 0) return intro;
  return intro + ((t - intro) % tail);
}

/** Clock next to the scrubber: 0…intro during offset, then 0…period in the loop. */
export function previewTimerMs(
  timeMs: number,
  pattern: Pattern
): { valueMs: number; spanMs: number; phase: 'delay' | 'loop' } {
  const head = previewPlayheadMs(timeMs, pattern);
  const intro = patternIntroMs(pattern);
  const period = patternPeriodMs(pattern);
  if (intro > 0 && head < intro) {
    return { valueMs: head, spanMs: intro, phase: 'delay' };
  }
  if (period > 0) {
    return {
      valueMs: (head - intro) % period,
      spanMs: period,
      phase: 'loop',
    };
  }
  const window = patternWindowMs(pattern);
  return { valueMs: head, spanMs: window, phase: 'loop' };
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
