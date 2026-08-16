import { describe, expect, it } from 'vitest';
import { SOLID_ON_PERIOD, samplePattern } from './player';
import {
  applyPreset,
  patternCycleMs,
  presetBlink,
  presetBreathe,
  presetChase,
  presetSingleLed,
  presetSolid,
} from './presets';
import { brightnessPattern, hueShiftPattern } from './themeTools';
import { packToProject, parseProjectJson, projectToPack, stringifyProject } from './project';

describe('presets', () => {
  it('presetSolid is constant color via player', () => {
    const p = presetSolid([0, 0.85, 1, 1]);
    expect(p.onPeriod_ms[0]).toBe(SOLID_ON_PERIOD);
    const a = samplePattern(p, 0);
    const b = samplePattern(p, 5000);
    expect(a[0]).toEqual(b[0]);
    expect(a[0].g).toBeGreaterThan(200);
  });

  it('presetChase produces non-zero staggered offsets', () => {
    const p = presetChase([0, 0.5, 0, 1]);
    expect(p.offset[0]).toBe(0);
    expect(p.offset[1]).toBeGreaterThan(0);
    expect(p.offset[2]).toBeGreaterThan(p.offset[1]);
    // At t=0 after offsets, LEDs differ
    const colors = samplePattern(p, p.offset[2] + 100);
    // Not all identical when chase is running
    const packed = colors.map((c) => (c.r << 16) | (c.g << 8) | c.b);
    expect(new Set(packed).size).toBeGreaterThan(1);
  });

  it('presetBlink toggles', () => {
    const p = presetBlink([1, 0, 0, 1], 400, 400);
    const on = samplePattern(p, 50);
    const off = samplePattern(p, 450);
    expect(on[0].r).toBeGreaterThan(200);
    expect(off[0].r).toBe(0);
  });

  it('presetBreathe has long transitions', () => {
    const p = presetBreathe();
    expect(p.transitionOnPeriod_ms[0]).toBeGreaterThan(p.onPeriod_ms[0]);
  });

  it('presetSingleLed only lights one LED', () => {
    const p = presetSingleLed(2, [1, 0, 0, 1]);
    const c = samplePattern(p, 0);
    expect(c[0].r + c[0].g + c[0].b).toBe(0);
    expect(c[1].r + c[1].g + c[1].b).toBe(0);
    expect(c[2].r).toBeGreaterThan(200);
  });

  it('applyPreset covers all ids', () => {
    for (const id of [
      'solid',
      'blink',
      'breathe',
      'chase',
      'single-front',
      'single-middle',
      'single-back',
    ] as const) {
      expect(applyPreset(id).onColors).toHaveLength(3);
    }
  });

  it('patternCycleMs uses max LED total', () => {
    const p = presetBlink([1, 0, 0, 1], 100, 100);
    expect(patternCycleMs(p)).toBe(200);
    expect(patternCycleMs(presetSolid())).toBe(2000);
  });

  it('patternCycleMs includes offset so delayed LEDs appear in the timeline', () => {
    // Chase-style: period 297, offsets 0 / 150 / 300 — back only lights after 300ms
    const p = presetBlink([1, 0, 0, 1], 99, 198);
    p.offset = [0, 150, 300];
    expect(patternCycleMs(p)).toBe(297 + 300);
  });
});

describe('themeTools', () => {
  it('hueShiftPattern changes non-black on colors', () => {
    const p = presetSolid([1, 0, 0, 1]);
    const shifted = hueShiftPattern(p, 120);
    // Red → green-ish
    expect(shifted.onColors[0][1]).toBeGreaterThan(0.5);
    expect(shifted.onColors[0][0]).toBeLessThan(0.5);
  });

  it('brightnessPattern dims', () => {
    const p = presetSolid([0.8, 0.8, 0.8, 1]);
    const dim = brightnessPattern(p, 0.5);
    expect(dim.onColors[0][0]).toBeCloseTo(0.4, 5);
  });
});

describe('project', () => {
  it('round-trips pack via project file', () => {
    const pattern = presetChase();
    const pack = {
      name: 'Test neon',
      patterns: { 'charging.json': pattern },
      dirty: false,
    };
    const project = packToProject(pack, '2024-01-01T00:00:00.000Z');
    expect(project.format).toBe('vector-backpack-lights-designer');
    expect(project.version).toBe(1);
    const restored = projectToPack(project);
    expect(restored.name).toBe('Test neon');
    expect(restored.patterns['charging.json'].offset).toEqual(pattern.offset);
  });

  it('packToProject includes a changed pack name', () => {
    const pack = {
      name: 'Renamed backpack',
      patterns: { 'charging.json': presetChase() },
      dirty: true,
    };
    const project = packToProject(pack, '2024-01-01T00:00:00.000Z');
    expect(project.name).toBe('Renamed backpack');
  });

  it('parseProjectJson / projectToPack restores a changed pack name', () => {
    const pack = {
      name: 'Renamed backpack',
      patterns: { 'charging.json': presetChase() },
      dirty: true,
    };
    const project = packToProject(pack, '2024-01-01T00:00:00.000Z');
    expect(projectToPack(project).name).toBe('Renamed backpack');
    expect(parseProjectJson(stringifyProject(project)).name).toBe(
      'Renamed backpack'
    );
  });
});
