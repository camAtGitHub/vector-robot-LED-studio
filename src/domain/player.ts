/**
 * Faithful port of robot/supervisor/src/ledController.cpp GetCurrentLEDcolor + AlphaBlend.
 * Linear RGB only; no easing.
 */

import type { LightStateParams, Pattern, Rgba } from './types';

/** 0–255 channels after packing (matches firmware u8 cast). */
export type Rgba8 = { r: number; g: number; b: number; a: number };

/** onPeriod_ms == 0xFFFF means solid (always onColor). */
export const SOLID_ON_PERIOD = 0xffff;

/**
 * Float channel f → byte. Matches ColorRGBA::GetU8:
 * static_cast<u8>(value * 255.f) after clip to [0,1].
 */
export function floatToByte(f: number): number {
  const clipped = f < 0 ? 0 : f > 1 ? 1 : f;
  return (clipped * 255) | 0;
}

/** Pack RGBA floats to firmware-style uint32 (R<<24|G<<16|B<<8|A). */
export function packRgba(color: Rgba): number {
  const r = floatToByte(color[0]);
  const g = floatToByte(color[1]);
  const b = floatToByte(color[2]);
  const a = floatToByte(color[3]);
  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

/** Unpack packed uint32 to Rgba8. */
export function unpackRgba(packed: number): Rgba8 {
  const p = packed >>> 0;
  return {
    r: (p >>> 24) & 0xff,
    g: (p >>> 16) & 0xff,
    b: (p >>> 8) & 0xff,
    a: p & 0xff,
  };
}

export function rgbaToRgba8(color: Rgba): Rgba8 {
  return {
    r: floatToByte(color[0]),
    g: floatToByte(color[1]),
    b: floatToByte(color[2]),
    a: floatToByte(color[3]),
  };
}

/**
 * AlphaBlend from ledController.cpp — linear RGB only; alpha channel of
 * result is 0 (firmware only packs R/G/B into the return value).
 */
export function alphaBlend(
  onColor: number,
  offColor: number,
  alpha: number
): number {
  const onRed = (onColor >>> 24) & 0xff;
  const onGrn = (onColor >>> 16) & 0xff;
  const onBlu = (onColor >>> 8) & 0xff;
  const offRed = (offColor >>> 24) & 0xff;
  const offGrn = (offColor >>> 16) & 0xff;
  const offBlu = (offColor >>> 8) & 0xff;
  const invAlpha = 1.0 - alpha;

  // int(...) truncates toward zero like C++ static_cast / (int) float
  const r = (onRed * alpha + offRed * invAlpha) | 0;
  const g = (onGrn * alpha + offGrn * invAlpha) | 0;
  const b = (onBlu * alpha + offBlu * invAlpha) | 0;

  return ((r << 24) | (g << 16) | (b << 8)) >>> 0;
}

/**
 * Mirrors GetCurrentLEDcolor for one LED. Times in ms.
 * phaseStartMs is the phase origin (firmware third arg name "phaseTime").
 */
export function getCurrentLedColor(
  led: LightStateParams,
  currentTimeMs: number,
  phaseStartMs: number
): Rgba8 {
  const onPacked = packRgba(led.onColor);
  const offPacked = packRgba(led.offColor);

  // Solid if onPeriod_ms == 0xFFFF OR onColor == offColor (full packed uint32)
  if (led.onPeriod_ms === SOLID_ON_PERIOD || onPacked === offPacked) {
    return unpackRgba(onPacked);
  }

  const totalTime_ms =
    led.transitionOnPeriod_ms +
    led.onPeriod_ms +
    led.transitionOffPeriod_ms +
    led.offPeriod_ms;

  // Avoid % 0; firmware would hit UB — return off
  if (totalTime_ms === 0) {
    return unpackRgba(offPacked);
  }

  let phaseTime_ms = currentTimeMs - phaseStartMs;

  // Apply offset
  phaseTime_ms -= led.offset_ms;

  // Before cycle starts (offset not elapsed) → offColor
  if (phaseTime_ms < 0) {
    return unpackRgba(offPacked);
  }

  // Modulo to keep phase in [0, totalTime)
  phaseTime_ms = phaseTime_ms % totalTime_ms;

  let newColor: number;

  if (phaseTime_ms < led.transitionOnPeriod_ms) {
    // Transition on: lerp off → on
    newColor = alphaBlend(
      onPacked,
      offPacked,
      phaseTime_ms / led.transitionOnPeriod_ms
    );
  } else if (
    phaseTime_ms <
    led.transitionOnPeriod_ms + led.onPeriod_ms
  ) {
    // On hold
    newColor = onPacked;
  } else if (
    phaseTime_ms <
    led.transitionOnPeriod_ms +
      led.onPeriod_ms +
      led.transitionOffPeriod_ms
  ) {
    // Transition off: lerp on → off
    const offPhase =
      phaseTime_ms - (led.transitionOnPeriod_ms + led.onPeriod_ms);
    newColor = alphaBlend(
      offPacked,
      onPacked,
      offPhase / led.transitionOffPeriod_ms
    );
  } else {
    // Off hold
    newColor = offPacked;
  }

  return unpackRgba(newColor);
}

/** Extract LightStateParams for LED index 0|1|2 from a Pattern. */
export function ledParamsFromPattern(
  pattern: Pattern,
  ledIndex: 0 | 1 | 2
): LightStateParams {
  return {
    onColor: pattern.onColors[ledIndex],
    offColor: pattern.offColors[ledIndex],
    onPeriod_ms: pattern.onPeriod_ms[ledIndex],
    offPeriod_ms: pattern.offPeriod_ms[ledIndex],
    transitionOnPeriod_ms: pattern.transitionOnPeriod_ms[ledIndex],
    transitionOffPeriod_ms: pattern.transitionOffPeriod_ms[ledIndex],
    offset_ms: pattern.offset[ledIndex],
  };
}

/** Evaluate all 3 LEDs for a pattern at time tMs (phaseStart = 0). */
export function samplePattern(
  pattern: Pattern,
  tMs: number
): [Rgba8, Rgba8, Rgba8] {
  return [
    getCurrentLedColor(ledParamsFromPattern(pattern, 0), tMs, 0),
    getCurrentLedColor(ledParamsFromPattern(pattern, 1), tMs, 0),
    getCurrentLedColor(ledParamsFromPattern(pattern, 2), tMs, 0),
  ];
}
