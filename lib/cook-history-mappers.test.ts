import { describe, expect, it } from 'vitest';

import { mapCookHistoryRow } from '@/lib/cook-history-mappers';

describe('mapCookHistoryRow', () => {
  it('maps joined cook session rows to history items', () => {
    expect(
      mapCookHistoryRow({
        cooked_at: '2026-05-30T15:00:00Z',
        id: 'cook-1',
        recipe_id: 'recipe-1',
        recipes: { title: 'Garlic Soy Steak Bites' },
      }),
    ).toEqual({
      cookedAt: '2026-05-30T15:00:00Z',
      id: 'cook-1',
      recipeId: 'recipe-1',
      recipeTitle: 'Garlic Soy Steak Bites',
    });
  });

  it('falls back when recipe title is missing', () => {
    expect(
      mapCookHistoryRow({
        cooked_at: '2026-05-30T15:00:00Z',
        id: 'cook-1',
        recipe_id: 'recipe-1',
        recipes: null,
      }).recipeTitle,
    ).toBe('Saved recipe');
  });
});
