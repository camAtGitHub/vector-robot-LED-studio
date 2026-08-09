import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  animNameToRelativePath,
  FULL_PACK_PATTERN_COUNT,
  getAllModes,
  loadTriggerMap,
  SENTINEL_PATHS,
  TRIGGER_MAP,
} from './triggers';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('triggers', () => {
  it('has 32 modes', () => {
    expect(TRIGGER_MAP).toHaveLength(FULL_PACK_PATTERN_COUNT);
    expect(getAllModes()).toHaveLength(FULL_PACK_PATTERN_COUNT);
  });

  it('maps LowBattery → badCharger.json', () => {
    const mode = getAllModes().find((m) => m.cladEvent === 'LowBattery');
    expect(mode?.relativePath).toBe('badCharger.json');
    expect(mode?.animName).toBe('badCharger');
  });

  it('maps spinners under cubeSpinner/<color>/', () => {
    expect(animNameToRelativePath('spinner_purple_celebration')).toBe(
      'cubeSpinner/purple/spinner_purple_celebration.json'
    );
    expect(animNameToRelativePath('spinner_red_hold_target')).toBe(
      'cubeSpinner/red/spinner_red_hold_target.json'
    );
  });

  it('matches public fixtures triggerMap.json', () => {
    const disk = JSON.parse(
      readFileSync(join(root, 'public/fixtures/triggerMap.json'), 'utf8')
    );
    const loaded = loadTriggerMap(disk);
    expect(loaded).toEqual(TRIGGER_MAP);
  });

  it('groups include Critical, Behavior, Utility', () => {
    const modes = getAllModes();
    expect(modes.some((m) => m.group === 'Critical')).toBe(true);
    expect(modes.some((m) => m.group === 'Behavior')).toBe(true);
    expect(modes.some((m) => m.group === 'Utility')).toBe(true);
  });

  it('sentinels are present in mode list', () => {
    const paths = new Set(getAllModes().map((m) => m.relativePath));
    for (const s of SENTINEL_PATHS) {
      expect(paths.has(s)).toBe(true);
    }
  });
});
