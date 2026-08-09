/**
 * Pack import / export I/O for backpack light packs.
 * Folder (FileList / path+text entries), zip (JSZip), validation, stock clone.
 */

import JSZip from 'jszip';
import {
  FULL_PACK_PATTERN_COUNT,
  getAllModes,
  packRgba,
  parsePatternJson,
  SchemaError,
  SENTINEL_PATHS,
  SOLID_ON_PERIOD,
  stringifyPattern,
  type Pack,
  type Pattern,
} from '../domain';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One text file from a folder pick, zip, or fixture load. */
export interface PackFileEntry {
  /** Relative path as provided by the source (may include prefixes). */
  path: string;
  text: string;
}

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code:
    | 'missing_file'
    | 'extra_file'
    | 'missing_sentinel'
    | 'schema_error'
    | 'total_time_zero'
    | 'json_parse'
    | 'export_blocked';
  message: string;
  path?: string;
}

export interface SchemaErrorEntry {
  path: string;
  message: string;
}

export interface TotalTimeZeroWarning {
  path: string;
  ledIndex: number;
}

export interface PackValidationReport {
  /** True when there are no error-severity issues (warnings OK). */
  ok: boolean;
  missingFiles: string[];
  extraFiles: string[];
  missingSentinels: string[];
  schemaErrors: SchemaErrorEntry[];
  totalTimeZeroWarnings: TotalTimeZeroWarning[];
  issues: ValidationIssue[];
  patternCount: number;
  expectedCount: number;
}

export interface ImportResult {
  pack: Pack;
  report: PackValidationReport;
}

export interface ExportZipOptions {
  /**
   * Allow export even if sentinels are missing (debug incomplete packs).
   * Default false — throws if either sentinel is absent.
   */
  force?: boolean;
  /** Zip entry path prefix (e.g. "customBackpackLights"). Empty = pack root. */
  rootPrefix?: string;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** All expected relative paths for a complete 32-file pack. */
export function expectedRelativePaths(): string[] {
  return getAllModes().map((m) => m.relativePath);
}

/** Basename (e.g. "badCharger.json") → relative path. */
export function basenameToRelativePathMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const mode of getAllModes()) {
    const base = mode.relativePath.split('/').pop()!;
    map.set(base, mode.relativePath);
  }
  return map;
}

/**
 * Normalize slashes, strip leading ./ and customBackpackLights/ prefixes.
 */
export function normalizePackPath(raw: string): string {
  let path = raw.replace(/\\/g, '/').replace(/^\.\/+/, '');
  // Drop leading slashes
  path = path.replace(/^\/+/, '');
  // Strip one or more customBackpackLights/ prefixes (upload target folder name)
  while (
    path === 'customBackpackLights' ||
    path.startsWith('customBackpackLights/')
  ) {
    path =
      path === 'customBackpackLights'
        ? ''
        : path.slice('customBackpackLights/'.length);
  }
  // Collapse duplicate slashes
  path = path.replace(/\/{2,}/g, '/');
  return path;
}

/**
 * Map an incoming file path to a canonical pack-relative path using the
 * trigger table. Returns null if the file is not a known pack pattern.
 */
export function resolvePackRelativePath(rawPath: string): string | null {
  const path = normalizePackPath(rawPath);
  if (!path || !path.toLowerCase().endsWith('.json')) {
    return null;
  }

  const expected = expectedRelativePaths();
  const expectedSet = new Set(expected);

  if (expectedSet.has(path)) {
    return path;
  }

  // Path ends with a known relative path (zip root folder prefix)
  for (const rel of expected) {
    if (path.endsWith('/' + rel)) {
      return rel;
    }
  }

  // Basename → canonical relative path (do not invent; only map known basenames)
  const base = path.split('/').pop()!;
  const byBase = basenameToRelativePathMap().get(base);
  if (byBase) {
    return byBase;
  }

  return null;
}

// ---------------------------------------------------------------------------
// totalTime risk
// ---------------------------------------------------------------------------

function isLedSolid(pattern: Pattern, ledIndex: number): boolean {
  if (pattern.onPeriod_ms[ledIndex] === SOLID_ON_PERIOD) return true;
  return (
    packRgba(pattern.onColors[ledIndex]) ===
    packRgba(pattern.offColors[ledIndex])
  );
}

function ledTotalTimeMs(pattern: Pattern, ledIndex: number): number {
  return (
    pattern.transitionOnPeriod_ms[ledIndex] +
    pattern.onPeriod_ms[ledIndex] +
    pattern.transitionOffPeriod_ms[ledIndex] +
    pattern.offPeriod_ms[ledIndex]
  );
}

/** Non-solid LEDs with totalTime_ms === 0 risk firmware % 0. */
export function findTotalTimeZeroRisks(
  path: string,
  pattern: Pattern
): TotalTimeZeroWarning[] {
  const out: TotalTimeZeroWarning[] = [];
  for (let i = 0; i < 3; i++) {
    if (!isLedSolid(pattern, i) && ledTotalTimeMs(pattern, i) === 0) {
      out.push({ path, ledIndex: i });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a pack document against the 32-mode trigger map + sentinels.
 * `extraFiles` are paths that were present on import but not part of the map.
 */
export function validatePack(
  pack: Pack,
  extraFiles: string[] = []
): PackValidationReport {
  const expected = expectedRelativePaths();
  const expectedSet = new Set(expected);
  const present = new Set(Object.keys(pack.patterns));

  const missingFiles = expected.filter((p) => !present.has(p));
  const missingSentinels = SENTINEL_PATHS.filter(
    (s) => !present.has(s)
  ) as string[];

  // Patterns keyed under unknown paths (shouldn't happen if import maps well)
  const unknownKeys = Object.keys(pack.patterns).filter(
    (p) => !expectedSet.has(p)
  );
  const extras = [...new Set([...extraFiles, ...unknownKeys])].sort();

  const issues: ValidationIssue[] = [];
  const schemaErrors: SchemaErrorEntry[] = [];
  const totalTimeZeroWarnings: TotalTimeZeroWarning[] = [];

  for (const s of missingSentinels) {
    issues.push({
      severity: 'error',
      code: 'missing_sentinel',
      message: `Missing required sentinel "${s}" (custom pack will not enable on robot)`,
      path: s,
    });
  }

  for (const p of missingFiles) {
    // Sentinels already reported as errors; other missing files are warnings
    // (WireOS legitimately omits 4 thermal patterns).
    if ((SENTINEL_PATHS as readonly string[]).includes(p)) continue;
    issues.push({
      severity: 'warning',
      code: 'missing_file',
      message: `Missing expected pattern file "${p}"`,
      path: p,
    });
  }

  for (const p of extras) {
    issues.push({
      severity: 'warning',
      code: 'extra_file',
      message: `Extra file not in trigger map: "${p}"`,
      path: p,
    });
  }

  for (const [path, pattern] of Object.entries(pack.patterns)) {
    for (const risk of findTotalTimeZeroRisks(path, pattern)) {
      totalTimeZeroWarnings.push(risk);
      issues.push({
        severity: 'warning',
        code: 'total_time_zero',
        message: `LED ${risk.ledIndex} in "${path}" has totalTime_ms==0 (risk of % 0 on robot)`,
        path,
      });
    }
  }

  const ok = !issues.some((i) => i.severity === 'error');

  return {
    ok,
    missingFiles,
    extraFiles: extras,
    missingSentinels,
    schemaErrors,
    totalTimeZeroWarnings,
    issues,
    patternCount: present.size,
    expectedCount: FULL_PACK_PATTERN_COUNT,
  };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Import a pack from path+text entries (folder pick, tests, fixtures).
 * Pure: no DOM / network. Paths are normalized and basenames remapped via triggers.
 */
export function importPackFromFiles(
  files: PackFileEntry[],
  options?: { name?: string }
): ImportResult {
  const patterns: Record<string, Pattern> = {};
  const extraFiles: string[] = [];
  const schemaErrors: SchemaErrorEntry[] = [];
  const parseIssues: ValidationIssue[] = [];

  for (const file of files) {
    const normalized = normalizePackPath(file.path);
    if (!normalized.toLowerCase().endsWith('.json')) {
      continue;
    }

    const resolved = resolvePackRelativePath(file.path);
    if (!resolved) {
      extraFiles.push(normalized);
      continue;
    }

    try {
      patterns[resolved] = parsePatternJson(file.text);
    } catch (e) {
      const message =
        e instanceof SchemaError
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e);
      schemaErrors.push({ path: resolved, message });
      parseIssues.push({
        severity: 'error',
        code: e instanceof SchemaError ? 'schema_error' : 'json_parse',
        message: `Schema/parse error in "${resolved}": ${message}`,
        path: resolved,
      });
    }
  }

  const pack: Pack = {
    name: options?.name ?? 'imported-pack',
    patterns,
    dirty: false,
  };

  const report = validatePack(pack, extraFiles);
  report.schemaErrors = [...report.schemaErrors, ...schemaErrors];
  for (const issue of parseIssues) {
    report.issues.push(issue);
  }
  report.ok = !report.issues.some((i) => i.severity === 'error');
  report.patternCount = Object.keys(patterns).length;

  return { pack, report };
}

/**
 * Import a pack from a zip (ArrayBuffer / Uint8Array / Blob).
 */
export async function importPackFromZip(
  data: ArrayBuffer | Uint8Array | Blob,
  options?: { name?: string }
): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(data);
  const entries: PackFileEntry[] = [];

  const jobs: Promise<void>[] = [];
  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    if (!relativePath.toLowerCase().endsWith('.json')) return;
    jobs.push(
      file.async('string').then((text) => {
        entries.push({ path: relativePath, text });
      })
    );
  });
  await Promise.all(jobs);

  const name =
    options?.name ??
    inferPackNameFromZipPaths(entries.map((e) => e.path)) ??
    'imported-zip';

  return importPackFromFiles(entries, { name });
}

function inferPackNameFromZipPaths(paths: string[]): string | undefined {
  if (paths.length === 0) return undefined;
  // If all share a single top-level folder, use it
  const tops = new Set(
    paths.map((p) => normalizePackPath(p).split('/')[0]).filter(Boolean)
  );
  if (tops.size === 1) {
    const top = [...tops][0];
    // If top is a known root file basename, pack is flat
    if (top.endsWith('.json')) return undefined;
    return top;
  }
  return undefined;
}

/**
 * Convert browser FileList / File[] (webkitdirectory or multi-file) to entries.
 */
export async function filesToPackEntries(
  files: FileList | File[]
): Promise<PackFileEntry[]> {
  const list = Array.from(files);
  const entries: PackFileEntry[] = [];
  for (const file of list) {
    // webkitRelativePath is set for directory picks; else use name
    const rel =
      'webkitRelativePath' in file &&
      typeof file.webkitRelativePath === 'string' &&
      file.webkitRelativePath.length > 0
        ? file.webkitRelativePath
        : file.name;
    if (!rel.toLowerCase().endsWith('.json')) continue;
    const text = await file.text();
    entries.push({ path: rel, text });
  }
  return entries;
}

export async function importPackFromBrowserFiles(
  files: FileList | File[],
  options?: { name?: string }
): Promise<ImportResult> {
  const entries = await filesToPackEntries(files);
  return importPackFromFiles(entries, options);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Serialize pack patterns to relativePath → pretty JSON text.
 * Periods are rounded to integers for robot-friendly export.
 */
export function exportPackToFileMap(pack: Pack): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, pattern] of Object.entries(pack.patterns)) {
    out[path] = stringifyPattern(roundPeriods(pattern), true) + '\n';
  }
  return out;
}

function roundPeriods(pattern: Pattern): Pattern {
  const clampU16 = (n: number) => {
    const r = Math.round(n);
    return Math.min(65535, Math.max(0, r));
  };
  const clampI16 = (n: number) => {
    const r = Math.round(n);
    return Math.min(32767, Math.max(-32768, r));
  };
  const map3 = (
    arr: [number, number, number],
    fn: (n: number) => number
  ): [number, number, number] => [fn(arr[0]), fn(arr[1]), fn(arr[2])];

  return {
    onColors: pattern.onColors,
    offColors: pattern.offColors,
    onPeriod_ms: map3(pattern.onPeriod_ms, clampU16),
    offPeriod_ms: map3(pattern.offPeriod_ms, clampU16),
    transitionOnPeriod_ms: map3(pattern.transitionOnPeriod_ms, clampU16),
    transitionOffPeriod_ms: map3(pattern.transitionOffPeriod_ms, clampU16),
    offset: map3(pattern.offset, clampI16),
  };
}

/**
 * Build a zip Blob for the pack. Throws if sentinels missing unless force.
 */
export async function exportPackToZip(
  pack: Pack,
  options?: ExportZipOptions
): Promise<Blob> {
  const force = options?.force ?? false;
  const missingSentinels = SENTINEL_PATHS.filter((s) => !(s in pack.patterns));
  if (!force && missingSentinels.length > 0) {
    const err = new Error(
      `Cannot export: missing sentinels: ${missingSentinels.join(', ')}. Use force to export incomplete packs.`
    );
    (err as Error & { code: string }).code = 'export_blocked';
    throw err;
  }

  const zip = new JSZip();
  const prefix = options?.rootPrefix
    ? options.rootPrefix.replace(/\/+$/, '') + '/'
    : '';
  const files = exportPackToFileMap(pack);
  for (const [rel, text] of Object.entries(files)) {
    zip.file(prefix + rel, text);
  }
  return zip.generateAsync({ type: 'blob' });
}

/**
 * Trigger a browser download of a Blob.
 * No-op-safe: only runs when `document` exists.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') {
    throw new Error('triggerDownload requires a browser document');
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Export pack as zip and download in the browser. */
export async function downloadPackAsZip(
  pack: Pack,
  filename?: string,
  options?: ExportZipOptions
): Promise<void> {
  const blob = await exportPackToZip(pack, options);
  const name =
    filename ??
    `${sanitizeFilename(pack.name || 'backpack-lights')}.zip`;
  triggerDownload(blob, name);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_') || 'pack';
}

// ---------------------------------------------------------------------------
// Stock / fixture helpers
// ---------------------------------------------------------------------------

/** Create an editable pack document from a pattern map (clone of stock, etc.). */
export function createPack(
  name: string,
  patterns: Record<string, Pattern>,
  dirty = false
): Pack {
  // Deep-ish clone so edits don't mutate fixtures
  const cloned: Record<string, Pattern> = {};
  for (const [path, pattern] of Object.entries(patterns)) {
    cloned[path] = structuredClonePattern(pattern);
  }
  return { name, patterns: cloned, dirty };
}

function structuredClonePattern(pattern: Pattern): Pattern {
  return {
    onColors: pattern.onColors.map((c) => [...c] as Pattern['onColors'][0]) as Pattern['onColors'],
    offColors: pattern.offColors.map((c) => [...c] as Pattern['onColors'][0]) as Pattern['offColors'],
    onPeriod_ms: [...pattern.onPeriod_ms] as Pattern['onPeriod_ms'],
    offPeriod_ms: [...pattern.offPeriod_ms] as Pattern['offPeriod_ms'],
    transitionOnPeriod_ms: [
      ...pattern.transitionOnPeriod_ms,
    ] as Pattern['transitionOnPeriod_ms'],
    transitionOffPeriod_ms: [
      ...pattern.transitionOffPeriod_ms,
    ] as Pattern['transitionOffPeriod_ms'],
    offset: [...pattern.offset] as Pattern['offset'],
  };
}

/**
 * Clone an imported pack into a new editable pack ("New pack from stock").
 */
export function clonePackAsEditable(source: Pack, name?: string): Pack {
  return createPack(name ?? `${source.name} (copy)`, source.patterns, true);
}

export type BundledPackId = 'stock' | 'wireos' | 'example-cyan';

/**
 * Load a bundled fixture pack from `/fixtures/packs/<id>/...` via fetch.
 * Tries every expected relative path; 404s become missing-file warnings.
 */
export async function loadBundledPack(
  packId: BundledPackId,
  options?: { name?: string; baseUrl?: string }
): Promise<ImportResult> {
  const base =
    (options?.baseUrl ?? `/fixtures/packs/${packId}`).replace(/\/+$/, '');
  const modes = getAllModes();
  const entries: PackFileEntry[] = [];

  await Promise.all(
    modes.map(async (mode) => {
      const url = `${base}/${mode.relativePath}`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const text = await res.text();
        entries.push({ path: mode.relativePath, text });
      } catch {
        // ignore network / missing
      }
    })
  );

  const names: Record<BundledPackId, string> = {
    stock: 'Stock Anki',
    wireos: 'WireOS',
    'example-cyan': 'Example cyan',
  };

  return importPackFromFiles(entries, {
    name: options?.name ?? names[packId],
  });
}

/**
 * "New pack from stock": load bundled stock and mark dirty for editing.
 */
export async function newPackFromStock(
  name = 'My pack'
): Promise<ImportResult> {
  const result = await loadBundledPack('stock', { name: 'Stock Anki' });
  result.pack = clonePackAsEditable(result.pack, name);
  return result;
}

/** True if both robot sentinels are present in the pack. */
export function hasSentinels(pack: Pack): boolean {
  return SENTINEL_PATHS.every((s) => s in pack.patterns);
}

/** Relative path for LowBattery — must stay badCharger.json (not lowBattery). */
export const LOW_BATTERY_RELATIVE_PATH = 'badCharger.json';
