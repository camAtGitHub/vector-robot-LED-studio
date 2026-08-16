import { describe, expect, it } from 'vitest';
import { parsePattern } from './schema';
import { libraryPresets } from './libraryPresets';

describe('library presets', () => {
  it('ships a fixed built-in catalog', () => {
    const presets = libraryPresets();
    expect(presets.length).toBe(25);
    expect(presets.slice(0, 3).map((p) => p.id)).toEqual([
      'preset-solid-cyan',
      'preset-green-charge-chase',
      'preset-red-rear-blink',
    ]);
  });

  it('has unique ids and names, and every pattern parses', () => {
    const presets = libraryPresets();
    const ids = presets.map((p) => p.id);
    const names = presets.map((p) => p.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    for (const p of presets) {
      expect(p.id.startsWith('preset-')).toBe(true);
      expect(parsePattern(p.pattern)).toEqual(p.pattern);
    }
  });

  it('covers distinct timing recipes', () => {
    const byId = Object.fromEntries(
      libraryPresets().map((p) => [p.id, p.pattern])
    );
    expect(byId['preset-knight-rider'].offset).toEqual([0, 120, 240]);
    expect(byId['preset-amber-reverse-scan'].offset).toEqual([360, 180, 0]);
    expect(byId['preset-heartbeat'].offset[2]).toBe(180);
    expect(byId['preset-ember-flicker'].onPeriod_ms[0]).not.toBe(
      byId['preset-ember-flicker'].onPeriod_ms[1]
    );
    expect(byId['preset-comet-tail'].transitionOffPeriod_ms[0]).toBeGreaterThan(
      byId['preset-comet-tail'].transitionOnPeriod_ms[0]
    );
    expect(byId['preset-rolling-breathe'].offset).toEqual([0, 1167, 2333]);
    expect(byId['preset-overlap-marquee'].onPeriod_ms[0]).toBeGreaterThan(
      byId['preset-overlap-marquee'].offPeriod_ms[0]
    );
    expect(byId['preset-wink'].onPeriod_ms[0]).toBeGreaterThan(
      byId['preset-wink'].offPeriod_ms[0] * 10
    );
    expect(byId['preset-harmonic-trio'].onPeriod_ms).toEqual([200, 400, 800]);
    expect(byId['preset-pendulum'].offset[2]).toBe(250);
    expect(byId['preset-pendulum'].onPeriod_ms[1]).toBe(0xffff);
    expect(byId['preset-work-stagger'].offset).toEqual([0, 100, 200]);
    expect(byId['preset-walking-shadow'].offPeriod_ms[0]).toBe(150);
    expect(byId['preset-sawtooth-rise'].transitionOnPeriod_ms[0]).toBeGreaterThan(
      byId['preset-sawtooth-rise'].transitionOffPeriod_ms[0]
    );
    expect(byId['preset-duty-cascade'].onPeriod_ms).toEqual([480, 300, 120]);
    expect(byId['preset-triple-echo'].offset).toEqual([0, 140, 280]);
  });
});
