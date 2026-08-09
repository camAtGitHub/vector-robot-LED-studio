/**
 * Color conversion helpers for UI (0–255 / hex) ↔ model (float 0–1).
 */

import type { Rgba } from './types';
import { floatToByte } from './player';

/** Float RGBA → CSS rgb() string (0–255 channels). */
export function rgbaToCssRgb(c: Rgba): string {
  const r = floatToByte(c[0]);
  const g = floatToByte(c[1]);
  const b = floatToByte(c[2]);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Float RGBA → CSS rgba() string. */
export function rgbaToCssRgba(c: Rgba): string {
  const r = floatToByte(c[0]);
  const g = floatToByte(c[1]);
  const b = floatToByte(c[2]);
  const a = Math.min(1, Math.max(0, c[3]));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Float RGB → #rrggbb hex (ignores alpha). */
export function rgbaToHex(c: Rgba): string {
  const r = floatToByte(c[0]);
  const g = floatToByte(c[1]);
  const b = floatToByte(c[2]);
  return (
    '#' +
    [r, g, b]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Parse #rgb / #rrggbb / #rrggbbaa into float Rgba (alpha default 1). */
export function hexToRgba(hex: string, defaultAlpha = 1): Rgba | null {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (h.length === 6 || h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    let a = defaultAlpha;
    if (h.length === 8) {
      const aa = parseInt(h.slice(6, 8), 16);
      if (Number.isNaN(aa)) return null;
      a = aa / 255;
    }
    return [r / 255, g / 255, b / 255, a];
  }
  return null;
}

/** 0–255 channels → float Rgba. */
export function rgb255ToRgba(
  r: number,
  g: number,
  b: number,
  a = 255
): Rgba {
  const clip = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  return [clip(r) / 255, clip(g) / 255, clip(b) / 255, clip(a) / 255];
}

/** Float Rgba → 0–255 channel object. */
export function rgbaToRgb255(c: Rgba): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  return {
    r: floatToByte(c[0]),
    g: floatToByte(c[1]),
    b: floatToByte(c[2]),
    a: floatToByte(c[3]),
  };
}

/** Relative luminance of float RGB (for glow intensity). */
export function luminance(c: { r: number; g: number; b: number }): number {
  // channels are 0–255
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
}

/** RGB float → HSL (h 0–360, s/l 0–1). */
export function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }
  return { h: h * 360, s, l };
}

/** HSL → RGB floats 0–1. */
export function hslToRgb(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  const hh = ((h % 360) + 360) % 360;
  if (s === 0) {
    return [l, l, l];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hNorm = hh / 360;
  return [
    hue2rgb(p, q, hNorm + 1 / 3),
    hue2rgb(p, q, hNorm),
    hue2rgb(p, q, hNorm - 1 / 3),
  ];
}

/** Shift hue of a color by degrees; preserve alpha; leave near-black alone. */
export function hueShiftRgba(c: Rgba, degrees: number): Rgba {
  const [r, g, b, a] = c;
  if (r === 0 && g === 0 && b === 0) return [...c] as Rgba;
  const { h, s, l } = rgbToHsl(r, g, b);
  if (s < 0.001) return [...c] as Rgba;
  const [nr, ng, nb] = hslToRgb(h + degrees, s, l);
  return [
    Math.min(1, Math.max(0, nr)),
    Math.min(1, Math.max(0, ng)),
    Math.min(1, Math.max(0, nb)),
    a,
  ];
}

/** Multiply RGB by factor (clip 0–1); keep alpha. */
export function brightnessRgba(c: Rgba, factor: number): Rgba {
  return [
    Math.min(1, Math.max(0, c[0] * factor)),
    Math.min(1, Math.max(0, c[1] * factor)),
    Math.min(1, Math.max(0, c[2] * factor)),
    c[3],
  ];
}
