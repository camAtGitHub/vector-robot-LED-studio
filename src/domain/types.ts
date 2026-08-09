/**
 * Domain types for Vector backpack light packs.
 * LED order: Front=0, Middle=1, Back=2 (matches LEDId).
 */

/** RGBA channel floats 0.0–1.0 as stored in robot pattern JSON. */
export type Rgba = [number, number, number, number];

/** Per-LED animation parameters (mirrors robot LightState fields). */
export interface LightStateParams {
  onColor: Rgba;
  offColor: Rgba;
  onPeriod_ms: number;
  offPeriod_ms: number;
  transitionOnPeriod_ms: number;
  transitionOffPeriod_ms: number;
  /** Phase delay in ms (JSON key: "offset"). */
  offset_ms: number;
}

/**
 * One pattern file: three LEDs (Front, Middle, Back).
 * Matches the 7 required JSON keys with arrays of length 3.
 */
export interface Pattern {
  onColors: [Rgba, Rgba, Rgba];
  offColors: [Rgba, Rgba, Rgba];
  onPeriod_ms: [number, number, number];
  offPeriod_ms: [number, number, number];
  transitionOnPeriod_ms: [number, number, number];
  transitionOffPeriod_ms: [number, number, number];
  offset: [number, number, number];
}

/** In-app pack document (patterns keyed by relative path within pack). */
export interface Pack {
  name: string;
  /** relativePath → Pattern, e.g. "charging.json", "cubeSpinner/red/spinner_red_celebration.json" */
  patterns: Record<string, Pattern>;
  dirty: boolean;
}

export type ModeGroup = 'Critical' | 'Behavior' | 'Utility';

/** One robot mode (CladEvent) with UI metadata and pack file path. */
export interface ModeDef {
  cladEvent: string;
  /** Basename without .json (from trigger map AnimName). */
  animName: string;
  /** Relative path under pack root, e.g. badCharger.json or cubeSpinner/blue/... */
  relativePath: string;
  /** Human-readable label for UI. */
  label: string;
  group: ModeGroup;
}
