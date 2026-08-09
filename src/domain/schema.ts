/**
 * Parse / validate / serialize backpack light pattern JSON.
 * Schema from animBackpackLightAnimation.cpp DefineFromJSON.
 * All 7 keys required; arrays length 3; colors RGBA floats 0–1.
 */

import type { Pattern, Rgba } from './types';

export const PATTERN_KEYS = [
  'onColors',
  'offColors',
  'onPeriod_ms',
  'offPeriod_ms',
  'transitionOnPeriod_ms',
  'transitionOffPeriod_ms',
  'offset',
] as const;

export type PatternKey = (typeof PATTERN_KEYS)[number];

export class SchemaError extends Error {
  constructor(
    message: string,
    public readonly path?: string
  ) {
    super(message);
    this.name = 'SchemaError';
  }
}

const LED_COUNT = 3;
const COLOR_CHANNELS = 4;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function parseRgba(raw: unknown, path: string): Rgba {
  if (!Array.isArray(raw) || raw.length !== COLOR_CHANNELS) {
    throw new SchemaError(
      `Expected RGBA array of length ${COLOR_CHANNELS}`,
      path
    );
  }
  const out: number[] = [];
  for (let i = 0; i < COLOR_CHANNELS; i++) {
    const c = raw[i];
    if (!isFiniteNumber(c)) {
      throw new SchemaError(`RGBA channel must be a finite number`, `${path}[${i}]`);
    }
    // Clip to [0,1] for storage (firmware warns + truncates on pack)
    out.push(Math.min(1, Math.max(0, c)));
  }
  return out as Rgba;
}

function parseColorArray(raw: unknown, key: string): [Rgba, Rgba, Rgba] {
  if (!Array.isArray(raw) || raw.length !== LED_COUNT) {
    throw new SchemaError(
      `"${key}" must be an array of length ${LED_COUNT}`,
      key
    );
  }
  return [
    parseRgba(raw[0], `${key}[0]`),
    parseRgba(raw[1], `${key}[1]`),
    parseRgba(raw[2], `${key}[2]`),
  ];
}

function parseNumberArray(raw: unknown, key: string): [number, number, number] {
  if (!Array.isArray(raw) || raw.length !== LED_COUNT) {
    throw new SchemaError(
      `"${key}" must be an array of length ${LED_COUNT}`,
      key
    );
  }
  const out: number[] = [];
  for (let i = 0; i < LED_COUNT; i++) {
    const n = raw[i];
    if (!isFiniteNumber(n)) {
      throw new SchemaError(`"${key}" entries must be finite numbers`, `${key}[${i}]`);
    }
    out.push(n);
  }
  return out as [number, number, number];
}

/**
 * Validate and parse unknown JSON into a Pattern.
 * Throws SchemaError on missing keys, wrong lengths, or bad types.
 */
export function parsePattern(json: unknown): Pattern {
  if (!isPlainObject(json)) {
    throw new SchemaError('Pattern must be a JSON object');
  }

  for (const key of PATTERN_KEYS) {
    if (!(key in json)) {
      throw new SchemaError(`Missing required key "${key}"`, key);
    }
  }

  return {
    onColors: parseColorArray(json.onColors, 'onColors'),
    offColors: parseColorArray(json.offColors, 'offColors'),
    onPeriod_ms: parseNumberArray(json.onPeriod_ms, 'onPeriod_ms'),
    offPeriod_ms: parseNumberArray(json.offPeriod_ms, 'offPeriod_ms'),
    transitionOnPeriod_ms: parseNumberArray(
      json.transitionOnPeriod_ms,
      'transitionOnPeriod_ms'
    ),
    transitionOffPeriod_ms: parseNumberArray(
      json.transitionOffPeriod_ms,
      'transitionOffPeriod_ms'
    ),
    offset: parseNumberArray(json.offset, 'offset'),
  };
}

/**
 * Parse a JSON string into a Pattern.
 */
export function parsePatternJson(text: string): Pattern {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new SchemaError(
      `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  return parsePattern(data);
}

/**
 * Serialize Pattern back to a plain object suitable for robot JSON files.
 * Colors as floats 0–1; no invented fields.
 */
export function serializePattern(pattern: Pattern): Record<string, unknown> {
  return {
    onColors: pattern.onColors.map((c) => [...c]),
    offColors: pattern.offColors.map((c) => [...c]),
    onPeriod_ms: [...pattern.onPeriod_ms],
    offPeriod_ms: [...pattern.offPeriod_ms],
    transitionOnPeriod_ms: [...pattern.transitionOnPeriod_ms],
    transitionOffPeriod_ms: [...pattern.transitionOffPeriod_ms],
    offset: [...pattern.offset],
  };
}

/**
 * Pretty-print pattern JSON (2-space) for human diffs / export.
 */
export function stringifyPattern(pattern: Pattern, pretty = true): string {
  return JSON.stringify(serializePattern(pattern), null, pretty ? 2 : undefined);
}

/**
 * Deep-compare two patterns with float tolerance on color channels.
 */
export function patternsEqual(
  a: Pattern,
  b: Pattern,
  epsilon = 1e-6
): boolean {
  const colorsClose = (x: Rgba, y: Rgba) =>
    x.every((v, i) => Math.abs(v - y[i]) <= epsilon);

  for (let i = 0; i < LED_COUNT; i++) {
    if (!colorsClose(a.onColors[i], b.onColors[i])) return false;
    if (!colorsClose(a.offColors[i], b.offColors[i])) return false;
  }

  const nums = (x: number[], y: number[]) =>
    x.every((v, i) => Math.abs(v - y[i]) <= epsilon);

  return (
    nums(a.onPeriod_ms, b.onPeriod_ms) &&
    nums(a.offPeriod_ms, b.offPeriod_ms) &&
    nums(a.transitionOnPeriod_ms, b.transitionOnPeriod_ms) &&
    nums(a.transitionOffPeriod_ms, b.transitionOffPeriod_ms) &&
    nums(a.offset, b.offset)
  );
}
