import { describe, expect, it } from 'vitest';
import { presetSolid } from './presets';
import {
  addFavorite,
  isUserFavoriteId,
  loadFavorites,
  type Favorite,
} from './favorites';

describe('user favorites', () => {
  it('starts empty (built-ins are presets, not stored)', () => {
    expect(loadFavorites()).toEqual([]);
  });

  it('treats seed and preset ids as non-user', () => {
    expect(isUserFavoriteId('seed-knight-rider')).toBe(false);
    expect(isUserFavoriteId('preset-wink')).toBe(false);
    expect(isUserFavoriteId('fav_abc')).toBe(true);
  });

  it('adds a user star without mixing in the library catalog', () => {
    const pattern = presetSolid([0, 0.85, 1, 1]);
    const next = addFavorite([], 'My star', pattern);
    expect(next).toHaveLength(1);
    expect(isUserFavoriteId(next[0].id)).toBe(true);
    expect(next[0].name).toBe('My star');
  });

  it('does not treat a leftover seed row as a user favorite', () => {
    const leftover: Favorite = {
      id: 'seed-solid-cyan',
      name: 'Solid cyan',
      pattern: presetSolid([0, 0.85, 1, 1]),
      createdAt: '2020-01-01T00:00:00.000Z',
    };
    expect(isUserFavoriteId(leftover.id)).toBe(false);
  });
});
