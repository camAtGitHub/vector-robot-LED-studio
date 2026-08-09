import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  parsePattern,
  parsePatternJson,
  patternsEqual,
  SchemaError,
  serializePattern,
  stringifyPattern,
} from './schema';
import type { Pattern } from './types';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const chargingPath = join(
  root,
  'public/fixtures/packs/stock/charging.json'
);
const chargingJson = readFileSync(chargingPath, 'utf8');

describe('parsePattern', () => {
  it('parses stock charging.json', () => {
    const p = parsePattern(JSON.parse(chargingJson));
    expect(p.onColors).toHaveLength(3);
    expect(p.offColors).toHaveLength(3);
    expect(p.onPeriod_ms).toEqual([600, 1200, 1800]);
    expect(p.offset).toEqual([1200, 600, 0]);
  });

  it('rejects missing offset key', () => {
    const raw = JSON.parse(chargingJson) as Record<string, unknown>;
    delete raw.offset;
    expect(() => parsePattern(raw)).toThrow(SchemaError);
    try {
      parsePattern(raw);
    } catch (e) {
      expect(e).toBeInstanceOf(SchemaError);
      expect((e as SchemaError).message).toMatch(/offset/i);
    }
  });

  it('rejects missing onColors', () => {
    const raw = JSON.parse(chargingJson) as Record<string, unknown>;
    delete raw.onColors;
    expect(() => parsePattern(raw)).toThrow(SchemaError);
  });

  it('rejects wrong array length', () => {
    const raw = JSON.parse(chargingJson) as Record<string, unknown>;
    raw.onPeriod_ms = [1, 2];
    expect(() => parsePattern(raw)).toThrow(SchemaError);
  });

  it('rejects wrong color channel count', () => {
    const raw = JSON.parse(chargingJson) as Record<string, unknown>;
    raw.onColors = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    expect(() => parsePattern(raw)).toThrow(SchemaError);
  });

  it('does not crash on invalid JSON string', () => {
    expect(() => parsePatternJson('{not json')).toThrow(SchemaError);
  });
});

describe('serialize / round-trip', () => {
  it('round-trip charging.json → serialize → deep equal (float tolerance)', () => {
    const original = parsePattern(JSON.parse(chargingJson));
    const serialized = serializePattern(original);
    const again = parsePattern(serialized);
    expect(patternsEqual(original, again)).toBe(true);
  });

  it('stringify then parse equals original', () => {
    const original = parsePattern(JSON.parse(chargingJson));
    const text = stringifyPattern(original);
    const again = parsePatternJson(text);
    expect(patternsEqual(original, again)).toBe(true);
  });

  it('does not invent extra JSON fields', () => {
    const original = parsePattern(JSON.parse(chargingJson));
    const obj = serializePattern(original);
    const keys = Object.keys(obj).sort();
    expect(keys).toEqual(
      [
        'offColors',
        'offPeriod_ms',
        'offset',
        'onColors',
        'onPeriod_ms',
        'transitionOffPeriod_ms',
        'transitionOnPeriod_ms',
      ].sort()
    );
  });
});

describe('patternsEqual', () => {
  it('tolerates tiny float noise', () => {
    const a = parsePattern(JSON.parse(chargingJson));
    const b: Pattern = {
      ...a,
      onColors: a.onColors.map(
        (c) => [c[0] + 1e-9, c[1], c[2], c[3]] as [number, number, number, number]
      ) as Pattern['onColors'],
    };
    expect(patternsEqual(a, b)).toBe(true);
  });
});
