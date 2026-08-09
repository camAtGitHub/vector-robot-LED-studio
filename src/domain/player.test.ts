import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parsePattern } from './schema';
import {
  floatToByte,
  getCurrentLedColor,
  ledParamsFromPattern,
  packRgba,
  samplePattern,
  type Rgba8,
} from './player';
import type { Pattern } from './types';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const fixtures = join(root, 'public/fixtures/packs');

function loadStock(rel: string): Pattern {
  const text = readFileSync(join(fixtures, 'stock', rel), 'utf8');
  return parsePattern(JSON.parse(text));
}

function loadExample(rel: string): Pattern {
  const text = readFileSync(join(fixtures, 'example-cyan', rel), 'utf8');
  return parsePattern(JSON.parse(text));
}

function isBlack(c: Rgba8): boolean {
  return c.r === 0 && c.g === 0 && c.b === 0;
}

function colorsEqual(a: Rgba8, b: Rgba8): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

describe('floatToByte / packRgba', () => {
  it('matches firmware cast (f*255)|0', () => {
    expect(floatToByte(0)).toBe(0);
    expect(floatToByte(1)).toBe(255);
    expect(floatToByte(0.5)).toBe(127); // (0.5*255)|0 = 127
    expect(floatToByte(0.7)).toBe(178); // 178.5 → 178
  });

  it('packs RGBA as R<<24|G<<16|B<<8|A', () => {
    // cyan [0,1,1,1] → 0x00ffffff
    expect(packRgba([0, 1, 1, 1])).toBe(0x00ffffff);
    // black [0,0,0,1] → 0x000000ff
    expect(packRgba([0, 0, 0, 1])).toBe(0x000000ff);
    // red [1,0,0,1] → 0xff0000ff
    expect(packRgba([1, 0, 0, 1])).toBe(0xff0000ff);
  });
});

describe('samplePattern — off.json', () => {
  const off = loadStock('off.json');

  it('always black for t in [0, 5000]', () => {
    for (const t of [0, 1, 100, 500, 1000, 2500, 5000]) {
      const [f, m, b] = samplePattern(off, t);
      expect(isBlack(f)).toBe(true);
      expect(isBlack(m)).toBe(true);
      expect(isBlack(b)).toBe(true);
    }
  });
});

describe('samplePattern — streaming solid (on==off)', () => {
  const streaming = loadStock('streaming.json');

  it('constant cyan color for all LEDs at many times', () => {
    const expected: Rgba8 = {
      r: floatToByte(0),
      g: floatToByte(1),
      b: floatToByte(1),
      a: floatToByte(1),
    };
    for (const t of [0, 50, 500, 999, 1000, 2000, 3333]) {
      const leds = samplePattern(streaming, t);
      for (const led of leds) {
        expect(colorsEqual(led, expected)).toBe(true);
      }
    }
  });
});

describe('samplePattern — charging with offsets', () => {
  const charging = loadStock('charging.json');

  it('LEDs are phase-shifted (not all equal at intermediate t)', () => {
    // Offsets: front 1200, middle 600, back 0
    // At t=0: front & middle still in offset wait → off; back may be transitioning
    const at0 = samplePattern(charging, 0);
    expect(isBlack(at0[0])).toBe(true); // front offset 1200
    expect(isBlack(at0[1])).toBe(true); // middle offset 600

    // At t=600: middle just starts; front still waiting
    const at600 = samplePattern(charging, 600);
    expect(isBlack(at600[0])).toBe(true);

    // At t=1200: front just starts (offColor at boundary of offset)
    // After offset elapses phaseTime=0 → if transitionOn>0, alpha=0 → off
    const frontAt1200 = getCurrentLedColor(
      ledParamsFromPattern(charging, 0),
      1200,
      0
    );
    expect(isBlack(frontAt1200)).toBe(true);

    // Mid-transition for back at t=150 (transitionOn=300): half blend green/off
    const backAt150 = getCurrentLedColor(
      ledParamsFromPattern(charging, 2),
      150,
      0
    );
    // alpha = 150/300 = 0.5; on green 0.5*255=127, off 0 → r=0,g=63,b=0 (int blend)
    // onGreen byte = 127, off=0 → int(127*0.5 + 0) = 63
    expect(backAt150.r).toBe(0);
    expect(backAt150.g).toBe(63);
    expect(backAt150.b).toBe(0);

    // At a time when LEDs differ due to offsets
    const at900 = samplePattern(charging, 900);
    // Not all three equal (phase-shifted)
    const same =
      colorsEqual(at900[0], at900[1]) && colorsEqual(at900[1], at900[2]);
    expect(same).toBe(false);
  });

  it('front enters on hold after offset+transitionOn', () => {
    // front: offset 1200, transOn 300, on 600, transOff 300, off 1200
    // At t=1200+300=1500 → phaseTime=300 → on hold, green 0.5
    const front = getCurrentLedColor(
      ledParamsFromPattern(charging, 0),
      1500,
      0
    );
    expect(front.r).toBe(0);
    expect(front.g).toBe(floatToByte(0.5));
    expect(front.b).toBe(0);
    expect(front.a).toBe(floatToByte(1));
  });
});

describe('samplePattern — badCharger (only back pulses)', () => {
  const bad = loadStock('badCharger.json');

  it('front and middle stay black; back animates red', () => {
    let sawNonBlackBack = false;
    for (const t of [0, 150, 300, 600, 900, 1200, 1500]) {
      const [f, m, b] = samplePattern(bad, t);
      expect(isBlack(f)).toBe(true);
      expect(isBlack(m)).toBe(true);
      if (!isBlack(b)) {
        sawNonBlackBack = true;
        expect(b.r).toBeGreaterThan(0);
        expect(b.g).toBe(0);
        expect(b.b).toBe(0);
      }
    }
    expect(sawNonBlackBack).toBe(true);
  });
});

describe('getCurrentLedColor — solid via 0xFFFF', () => {
  it('returns onColor when onPeriod_ms is 0xFFFF even if colors differ', () => {
    const led = {
      onColor: [1, 0, 0, 1] as [number, number, number, number],
      offColor: [0, 0, 0, 1] as [number, number, number, number],
      onPeriod_ms: 0xffff,
      offPeriod_ms: 100,
      transitionOnPeriod_ms: 50,
      transitionOffPeriod_ms: 50,
      offset_ms: 0,
    };
    for (const t of [0, 100, 1000]) {
      const c = getCurrentLedColor(led, t, 0);
      expect(c.r).toBe(255);
      expect(c.g).toBe(0);
      expect(c.b).toBe(0);
    }
  });
});

describe('example-cyan fixtures load', () => {
  it('petting and charging parse', () => {
    const petting = loadExample('petting.json');
    const charging = loadExample('charging.json');
    expect(petting.onColors[0].length).toBe(4);
    expect(charging.offset.length).toBe(3);
  });
});
