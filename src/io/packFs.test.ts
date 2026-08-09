import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  FULL_PACK_PATTERN_COUNT,
  getAllModes,
  patternsEqual,
  SENTINEL_PATHS,
  type Pattern,
} from '../domain';
import {
  exportPackToFileMap,
  exportPackToZip,
  hasSentinels,
  importPackFromFiles,
  importPackFromZip,
  LOW_BATTERY_RELATIVE_PATH,
  normalizePackPath,
  resolvePackRelativePath,
  type PackFileEntry,
  validatePack,
} from './packFs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const fixturesRoot = join(root, 'public/fixtures/packs');

function walkJsonFiles(dir: string): PackFileEntry[] {
  const entries: PackFileEntry[] = [];

  function walk(current: string) {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (name.endsWith('.json')) {
        const rel = relative(dir, full).replace(/\\/g, '/');
        entries.push({ path: rel, text: readFileSync(full, 'utf8') });
      }
    }
  }

  walk(dir);
  return entries;
}

function loadFixturePack(id: 'stock' | 'wireos' | 'example-cyan') {
  return importPackFromFiles(walkJsonFiles(join(fixturesRoot, id)), {
    name: id,
  });
}

describe('path normalization', () => {
  it('strips customBackpackLights/ prefix', () => {
    expect(normalizePackPath('customBackpackLights/off.json')).toBe('off.json');
    expect(
      normalizePackPath('customBackpackLights/cubeSpinner/purple/spinner_purple_celebration.json')
    ).toBe('cubeSpinner/purple/spinner_purple_celebration.json');
  });

  it('maps basename to spinner relative path', () => {
    expect(resolvePackRelativePath('spinner_purple_celebration.json')).toBe(
      'cubeSpinner/purple/spinner_purple_celebration.json'
    );
  });

  it('maps LowBattery basename to badCharger.json (not lowBattery)', () => {
    expect(resolvePackRelativePath('badCharger.json')).toBe('badCharger.json');
    expect(resolvePackRelativePath('lowBattery.json')).toBeNull();
    expect(LOW_BATTERY_RELATIVE_PATH).toBe('badCharger.json');
  });

  it('strips zip root folder when path ends with known relative path', () => {
    expect(
      resolvePackRelativePath('my-theme/cubeSpinner/red/spinner_red_celebration.json')
    ).toBe('cubeSpinner/red/spinner_red_celebration.json');
  });
});

describe('import example-cyan', () => {
  it('loads 32 patterns with 0 errors', () => {
    const { pack, report } = loadFixturePack('example-cyan');

    expect(Object.keys(pack.patterns)).toHaveLength(FULL_PACK_PATTERN_COUNT);
    expect(report.patternCount).toBe(32);
    expect(report.missingFiles).toEqual([]);
    expect(report.schemaErrors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.issues.filter((i) => i.severity === 'error')).toHaveLength(0);

    // All trigger paths present
    for (const mode of getAllModes()) {
      expect(pack.patterns[mode.relativePath]).toBeDefined();
    }
  });

  it('keeps LowBattery at badCharger.json', () => {
    const { pack } = loadFixturePack('example-cyan');
    expect(pack.patterns['badCharger.json']).toBeDefined();
    expect(pack.patterns['lowBattery.json']).toBeUndefined();

    const lowBat = getAllModes().find((m) => m.cladEvent === 'LowBattery');
    expect(lowBat?.relativePath).toBe('badCharger.json');
    expect(pack.patterns[lowBat!.relativePath]).toBeDefined();
  });
});

describe('import wireos', () => {
  it('loads 28 patterns and warns about 4 missing thermal files', () => {
    const { pack, report } = loadFixturePack('wireos');

    expect(Object.keys(pack.patterns)).toHaveLength(28);
    expect(report.patternCount).toBe(28);
    expect(report.schemaErrors).toEqual([]);

    const thermal = [
      'overheated.json',
      'chargingOverheated.json',
      'badChargerOverheated.json',
      'chargingLowBatteryOverheated.json',
    ];
    expect(report.missingFiles.sort()).toEqual(thermal.sort());

    const missingWarnings = report.issues.filter(
      (i) => i.code === 'missing_file' && i.severity === 'warning'
    );
    expect(missingWarnings).toHaveLength(4);
    for (const t of thermal) {
      expect(missingWarnings.some((w) => w.path === t)).toBe(true);
    }

    // Sentinels still present → ok for import (missing thermal is warning only)
    expect(hasSentinels(pack)).toBe(true);
    expect(report.missingSentinels).toEqual([]);
    expect(report.ok).toBe(true);
  });
});

describe('import stock', () => {
  it('loads complete 32-file pack with sentinels', () => {
    const { pack, report } = loadFixturePack('stock');
    expect(Object.keys(pack.patterns)).toHaveLength(32);
    expect(report.ok).toBe(true);
    expect(hasSentinels(pack)).toBe(true);
    for (const s of SENTINEL_PATHS) {
      expect(pack.patterns[s]).toBeDefined();
    }
  });
});

describe('sentinels', () => {
  it('reports missing sentinels as errors', () => {
    const { pack } = loadFixturePack('example-cyan');
    delete pack.patterns['off.json'];
    delete pack.patterns['cubeSpinner/purple/spinner_purple_celebration.json'];

    const report = validatePack(pack);
    expect(report.missingSentinels.sort()).toEqual(
      [...SENTINEL_PATHS].sort()
    );
    expect(report.ok).toBe(false);
    expect(
      report.issues.filter((i) => i.code === 'missing_sentinel')
    ).toHaveLength(2);
  });

  it('hasSentinels checks both required files', () => {
    const { pack } = loadFixturePack('stock');
    expect(hasSentinels(pack)).toBe(true);
    delete pack.patterns['off.json'];
    expect(hasSentinels(pack)).toBe(false);
  });
});

describe('export zip round-trip', () => {
  it('export zip → re-import → identical patterns', async () => {
    const { pack: original } = loadFixturePack('example-cyan');
    const blob = await exportPackToZip(original);
    const buffer = await blob.arrayBuffer();

    const { pack: reimported, report } = await importPackFromZip(buffer, {
      name: 'roundtrip',
    });

    expect(report.schemaErrors).toEqual([]);
    expect(Object.keys(reimported.patterns).sort()).toEqual(
      Object.keys(original.patterns).sort()
    );

    for (const path of Object.keys(original.patterns)) {
      const a = original.patterns[path];
      const b = reimported.patterns[path];
      expect(b, `missing ${path}`).toBeDefined();
      expect(patternsEqual(a, b), `mismatch ${path}`).toBe(true);
    }
  });

  it('export tree includes both sentinels and badCharger.json', async () => {
    const { pack } = loadFixturePack('example-cyan');
    const files = exportPackToFileMap(pack);

    expect(files['off.json']).toBeDefined();
    expect(
      files['cubeSpinner/purple/spinner_purple_celebration.json']
    ).toBeDefined();
    expect(files['badCharger.json']).toBeDefined();
    expect(files['lowBattery.json']).toBeUndefined();

    const blob = await exportPackToZip(pack);
    const zipPack = await importPackFromZip(await blob.arrayBuffer());
    expect(hasSentinels(zipPack.pack)).toBe(true);
    expect(zipPack.pack.patterns['badCharger.json']).toBeDefined();
  });

  it('blocks export when sentinels missing unless force', async () => {
    const { pack } = loadFixturePack('example-cyan');
    delete pack.patterns['off.json'];

    await expect(exportPackToZip(pack)).rejects.toThrow(/sentinel/i);
    await expect(exportPackToZip(pack, { force: true })).resolves.toBeInstanceOf(
      Blob
    );
  });
});

describe('import with prefixes and extras', () => {
  it('accepts customBackpackLights/ nested paths', () => {
    const base = walkJsonFiles(join(fixturesRoot, 'stock'));
    const nested = base.map((e) => ({
      path: `customBackpackLights/${e.path}`,
      text: e.text,
    }));
    const { pack, report } = importPackFromFiles(nested, { name: 'nested' });
    expect(Object.keys(pack.patterns)).toHaveLength(32);
    expect(report.ok).toBe(true);
  });

  it('flags unknown json as extra', () => {
    const { pack } = loadFixturePack('stock');
    const entries = walkJsonFiles(join(fixturesRoot, 'stock'));
    entries.push({
      path: 'notes/readme.json',
      text: JSON.stringify({ hello: true }),
    });
    const result = importPackFromFiles(entries, { name: 'with-extra' });
    expect(result.report.extraFiles.some((p) => p.includes('readme'))).toBe(
      true
    );
    // Still has all patterns
    expect(Object.keys(result.pack.patterns)).toHaveLength(32);
    expect(Object.keys(pack.patterns)).toHaveLength(32);
  });

  it('reports schema errors per file without crashing', () => {
    const entries: PackFileEntry[] = [
      {
        path: 'off.json',
        text: JSON.stringify({
          onColors: [
            [0, 0, 0, 1],
            [0, 0, 0, 1],
            [0, 0, 0, 1],
          ],
          // missing most keys
        }),
      },
      {
        path: 'cubeSpinner/purple/spinner_purple_celebration.json',
        text: readFileSync(
          join(
            fixturesRoot,
            'stock/cubeSpinner/purple/spinner_purple_celebration.json'
          ),
          'utf8'
        ),
      },
    ];
    const { pack, report } = importPackFromFiles(entries, { name: 'broken' });
    expect(pack.patterns['off.json']).toBeUndefined();
    expect(report.schemaErrors.some((e) => e.path === 'off.json')).toBe(true);
    expect(report.ok).toBe(false);
  });
});

describe('totalTime==0 risk warning', () => {
  it('warns when non-solid LED has zero total period', () => {
    const zeroCycle: Pattern = {
      onColors: [
        [1, 0, 0, 1],
        [0, 0, 0, 1],
        [0, 0, 0, 1],
      ],
      offColors: [
        [0, 0, 0, 1],
        [0, 0, 0, 1],
        [0, 0, 0, 1],
      ],
      onPeriod_ms: [0, 0, 0],
      offPeriod_ms: [0, 0, 0],
      transitionOnPeriod_ms: [0, 0, 0],
      transitionOffPeriod_ms: [0, 0, 0],
      offset: [0, 0, 0],
    };

    const pack = {
      name: 'risk',
      patterns: {
        'off.json': zeroCycle,
        'cubeSpinner/purple/spinner_purple_celebration.json': zeroCycle,
      },
      dirty: false,
    };

    const report = validatePack(pack);
    expect(report.totalTimeZeroWarnings.length).toBeGreaterThan(0);
    expect(
      report.issues.some((i) => i.code === 'total_time_zero')
    ).toBe(true);
  });
});
