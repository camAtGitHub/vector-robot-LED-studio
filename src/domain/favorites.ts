/**
 * Favorites library — localStorage key bpld.favorites.v1
 */

import type { Pattern, Rgba } from './types';
import { parsePattern, SchemaError } from './schema';
import {
  clonePattern,
  presetBlink,
  presetChase,
  presetSolid,
} from './presets';

export const FAVORITES_STORAGE_KEY = 'bpld.favorites.v1';

export interface Favorite {
  id: string;
  name: string;
  pattern: Pattern;
  createdAt: string;
}

function isBrowser(): boolean {
  return typeof localStorage !== 'undefined';
}

function uid(): string {
  return `fav_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Stock-inspired seeds (values from stock/example, not invented fields). */
export function defaultSeedFavorites(): Favorite[] {
  const cyan: Rgba = [0, 0.85, 1, 1];
  const green: Rgba = [0, 0.5, 0, 1];
  const red: Rgba = [1, 0, 0, 1];
  // Green charge chase — same timing shape as stock charging offsets
  const greenChase = presetChase(green, 600, 600, 300);
  greenChase.onPeriod_ms = [600, 1200, 1800];
  greenChase.offPeriod_ms = [1200, 600, 0];
  greenChase.offset = [1200, 600, 0];

  // Red rear blink — stock badCharger style (only back LED)
  const redRear = presetBlink(red, 600, 600);
  redRear.onColors = [
    [0, 0, 0, 1],
    [0, 0, 0, 1],
    [1, 0, 0, 1],
  ];
  redRear.offColors = [
    [0, 0, 0, 1],
    [0, 0, 0, 1],
    [0, 0, 0, 1],
  ];
  redRear.onPeriod_ms = [0, 0, 600];
  redRear.offPeriod_ms = [0, 0, 600];
  redRear.transitionOnPeriod_ms = [0, 0, 300];
  redRear.transitionOffPeriod_ms = [0, 0, 300];

  return [
    {
      id: 'seed-solid-cyan',
      name: 'Solid cyan',
      pattern: presetSolid(cyan),
      createdAt: '2020-01-01T00:00:00.000Z',
    },
    {
      id: 'seed-green-charge-chase',
      name: 'Green charge chase',
      pattern: greenChase,
      createdAt: '2020-01-01T00:00:00.000Z',
    },
    {
      id: 'seed-red-rear-blink',
      name: 'Red rear blink',
      pattern: redRear,
      createdAt: '2020-01-01T00:00:00.000Z',
    },
  ];
}

function parseFavorite(raw: unknown): Favorite | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null;
  if (typeof o.createdAt !== 'string') return null;
  try {
    const pattern = parsePattern(o.pattern);
    return {
      id: o.id,
      name: o.name,
      pattern,
      createdAt: o.createdAt,
    };
  } catch {
    return null;
  }
}

/** Load favorites from localStorage; seed defaults if empty / missing. */
export function loadFavorites(): Favorite[] {
  if (!isBrowser()) {
    return defaultSeedFavorites();
  }
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      const seeds = defaultSeedFavorites();
      saveFavorites(seeds);
      return seeds;
    }
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      const seeds = defaultSeedFavorites();
      saveFavorites(seeds);
      return seeds;
    }
    const list = data
      .map(parseFavorite)
      .filter((f): f is Favorite => f !== null);
    if (list.length === 0) {
      const seeds = defaultSeedFavorites();
      saveFavorites(seeds);
      return seeds;
    }
    return list;
  } catch {
    return defaultSeedFavorites();
  }
}

export function saveFavorites(favorites: Favorite[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // quota / private mode
  }
}

export function addFavorite(
  favorites: Favorite[],
  name: string,
  pattern: Pattern
): Favorite[] {
  const fav: Favorite = {
    id: uid(),
    name: name.trim() || 'Favorite',
    pattern: clonePattern(pattern),
    createdAt: new Date().toISOString(),
  };
  const next = [fav, ...favorites];
  saveFavorites(next);
  return next;
}

export function removeFavorite(
  favorites: Favorite[],
  id: string
): Favorite[] {
  const next = favorites.filter((f) => f.id !== id);
  saveFavorites(next);
  return next;
}

export function findFavorite(
  favorites: Favorite[],
  id: string
): Favorite | undefined {
  return favorites.find((f) => f.id === id);
}

/** Validate pattern shape when starring (throws SchemaError-compatible). */
export function assertPattern(pattern: unknown): Pattern {
  try {
    return parsePattern(pattern);
  } catch (e) {
    if (e instanceof SchemaError) throw e;
    throw new SchemaError(
      e instanceof Error ? e.message : 'Invalid pattern'
    );
  }
}
