/**
 * User favorites — localStorage key bpld.favorites.v1
 * Built-in recipes live in libraryPresets.ts and are not stored here.
 */

import type { Pattern } from './types';
import { parsePattern, SchemaError } from './schema';
import { clonePattern } from './presets';

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

/** Former seed ids and built-in preset ids are not user favorites. */
export function isUserFavoriteId(id: string): boolean {
  return !id.startsWith('seed-') && !id.startsWith('preset-');
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

/** Load user favorites only. Empty until the user stars something. */
export function loadFavorites(): Favorite[] {
  if (!isBrowser()) {
    return [];
  }
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const parsed = data
      .map(parseFavorite)
      .filter((f): f is Favorite => f !== null);
    const list = parsed.filter((f) => isUserFavoriteId(f.id));
    if (list.length !== parsed.length) {
      saveFavorites(list);
    }
    return list;
  } catch {
    return [];
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
