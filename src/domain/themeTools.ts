/**
 * Bulk theme tools: hue-shift and brightness over a pattern or whole pack.
 */

import type { Pack, Pattern, Rgba } from './types';
import { brightnessRgba, hueShiftRgba } from './colors';
import { clonePattern } from './presets';

function mapColors(
  pattern: Pattern,
  fn: (c: Rgba) => Rgba
): Pattern {
  const next = clonePattern(pattern);
  for (let i = 0; i < 3; i++) {
    next.onColors[i] = fn(next.onColors[i]);
    next.offColors[i] = fn(next.offColors[i]);
  }
  return next;
}

/** Hue-shift all colors in a pattern by degrees. */
export function hueShiftPattern(pattern: Pattern, degrees: number): Pattern {
  if (degrees === 0) return clonePattern(pattern);
  return mapColors(pattern, (c) => hueShiftRgba(c, degrees));
}

/** Multiply RGB brightness of all colors (alpha unchanged). */
export function brightnessPattern(pattern: Pattern, factor: number): Pattern {
  if (factor === 1) return clonePattern(pattern);
  return mapColors(pattern, (c) => brightnessRgba(c, factor));
}

/** Apply hue shift to every pattern in a pack (returns new pack, dirty). */
export function hueShiftPack(pack: Pack, degrees: number): Pack {
  const patterns: Record<string, Pattern> = {};
  for (const [path, pattern] of Object.entries(pack.patterns)) {
    patterns[path] = hueShiftPattern(pattern, degrees);
  }
  return { ...pack, patterns, dirty: true };
}

/** Apply brightness multiply to every pattern in a pack. */
export function brightnessPack(pack: Pack, factor: number): Pack {
  const patterns: Record<string, Pattern> = {};
  for (const [path, pattern] of Object.entries(pack.patterns)) {
    patterns[path] = brightnessPattern(pattern, factor);
  }
  return { ...pack, patterns, dirty: true };
}
