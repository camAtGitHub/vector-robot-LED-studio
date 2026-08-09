/**
 * App project file (*.bpld.json) — not for robot upload.
 */

import type { Pack, Pattern } from './types';
import { parsePattern, SchemaError } from './schema';
import { clonePattern } from './presets';

export const PROJECT_FORMAT = 'vector-backpack-lights-designer';
export const PROJECT_VERSION = 1;

export interface ProjectFile {
  format: typeof PROJECT_FORMAT;
  version: number;
  name: string;
  createdAt: string;
  patterns: Record<string, Pattern>;
}

export function packToProject(pack: Pack, createdAt?: string): ProjectFile {
  const patterns: Record<string, Pattern> = {};
  for (const [path, pattern] of Object.entries(pack.patterns)) {
    patterns[path] = clonePattern(pattern);
  }
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    name: pack.name,
    createdAt: createdAt ?? new Date().toISOString(),
    patterns,
  };
}

export function stringifyProject(project: ProjectFile, pretty = true): string {
  return JSON.stringify(project, null, pretty ? 2 : undefined);
}

/**
 * Parse and validate a project JSON document into an editable Pack.
 */
export function projectToPack(json: unknown): Pack {
  if (typeof json !== 'object' || json === null) {
    throw new SchemaError('Project must be a JSON object');
  }
  const o = json as Record<string, unknown>;
  if (o.format !== PROJECT_FORMAT) {
    throw new SchemaError(
      `Unknown project format (expected "${PROJECT_FORMAT}")`
    );
  }
  if (typeof o.version !== 'number') {
    throw new SchemaError('Project missing version');
  }
  if (typeof o.name !== 'string') {
    throw new SchemaError('Project missing name');
  }
  if (typeof o.patterns !== 'object' || o.patterns === null) {
    throw new SchemaError('Project missing patterns');
  }

  const patterns: Record<string, Pattern> = {};
  for (const [path, raw] of Object.entries(
    o.patterns as Record<string, unknown>
  )) {
    try {
      patterns[path] = parsePattern(raw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new SchemaError(`Invalid pattern "${path}": ${msg}`, path);
    }
  }

  return { name: o.name, patterns, dirty: false };
}

export function parseProjectJson(text: string): Pack {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new SchemaError(
      `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  return projectToPack(data);
}

export function downloadProject(pack: Pack, filename?: string): void {
  const project = packToProject(pack);
  const blob = new Blob([stringifyProject(project) + '\n'], {
    type: 'application/json',
  });
  const name =
    filename ??
    `${(pack.name || 'pack').replace(/[^\w.\-]+/g, '_')}.bpld.json`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
