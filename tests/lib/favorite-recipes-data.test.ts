import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MockSupabaseClient } from '@/tests/helpers/createMockSupabaseClient';

const supabaseMock = vi.hoisted(() => ({ current: null as MockSupabaseClient | null }));

vi.mock('@/lib/shared/supabase', async () => {
  const { createMockSupabaseClient } = await import('@/tests/helpers/createMockSupabaseClient');
  supabaseMock.current = createMockSupabaseClient();
  return { supabase: supabaseMock.current.supabase };
});

import {
  addFavoriteRecipe,
  getFavoriteRecipesPage,
  getFavoriteRecipes,
  isTitleFavorited,
  removeFavoriteRecipeByTitle,
  updateFavoriteRecipe,
} from '@/lib/recipes/favorite-recipes';
import type { FavoriteRecipeRow } from '@/lib/recipes/favorite-recipes-mappers';
import type { Recipe } from '@/types/useitup';

const favoriteRow: FavoriteRecipeRow = {
  id: 'favorite-1',
  user_id: 'user-1',
  title: 'Garlic Soy Steak Bites',
  normalized_title: 'garlic soy steak bites',
  description: 'Quick seared steak.',
  instructions: ['Sear steak.'],
  ingredients: [{ name: 'Steak', pantryItemId: 'pantry-1', quantityValue: 1, quantityUnit: 'portion', isAvailable: true }],
  prep_time_minutes: 15,
  uses_expiring_items: true,
  created_at: '2026-05-30T12:00:00Z',
};

const recipe: Recipe = {
  id: 'recipe-1',
  title: '  Garlic Soy-Glazed  Steak! ',
  description: '  Savory and quick.  ',
  prepTimeMinutes: 20,
  usesExpiringItems: true,
  ingredients: [{ name: 'Steak', isAvailable: true }],
  missingIngredients: [],
  instructions: ['Cook.'],
};

function db() {
  if (!supabaseMock.current) {
    throw new Error('Supabase mock was not initialized');
  }

  return supabaseMock.current;
}

describe('favorite recipe data access', () => {
  beforeEach(() => {
    db().reset();
  });

  it('loads favorite recipes newest first with pagination', async () => {
    db().pushQueryResult({ data: [favoriteRow, { ...favoriteRow, id: 'favorite-2' }], error: null });

    const page = await getFavoriteRecipesPage('user-1', { page: 1, pageSize: 1 });

    expect(page).toMatchObject({
      hasMore: true,
      items: [{ id: 'favorite-1', title: 'Garlic Soy Steak Bites', isFavorite: true }],
      nextPage: 2,
    });
    expect(db().queries[0].calls).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'order', args: ['created_at', { ascending: false }] },
      { method: 'range', args: [1, 2] },
    ]);
  });

  it('keeps the legacy favorite list helper returning only items', async () => {
    db().pushQueryResult({ data: [favoriteRow], error: null });

    await expect(getFavoriteRecipes('user-1')).resolves.toMatchObject([{ id: 'favorite-1' }]);
  });

  it('checks favorites by normalized title', async () => {
    db().pushQueryResult({ data: { id: 'favorite-1' }, error: null });

    await expect(isTitleFavorited('user-1', '  Garlic Soy-Glazed  Steak! ')).resolves.toBe(true);

    expect(db().queries[0].calls).toEqual([
      { method: 'select', args: ['id'] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'eq', args: ['normalized_title', 'garlic soy glazed steak'] },
      { method: 'maybeSingle', args: [] },
    ]);
  });

  it('upserts a favorite recipe snapshot by normalized title', async () => {
    db().pushQueryResult({ data: favoriteRow, error: null });

    await addFavoriteRecipe('user-1', recipe);

    expect(db().queries[0].calls).toEqual([
      {
        method: 'upsert',
        args: [
          {
            user_id: 'user-1',
            title: 'Garlic Soy-Glazed  Steak!',
            normalized_title: 'garlic soy glazed steak',
            description: 'Savory and quick.',
            instructions: ['Cook.'],
            ingredients: [{ name: 'Steak', isAvailable: true }],
            prep_time_minutes: 20,
            uses_expiring_items: true,
            language: null,
          },
          { onConflict: 'user_id,normalized_title' },
        ],
      },
      { method: 'select', args: ['*'] },
      { method: 'single', args: [] },
    ]);
  });

  it('updates a favorite recipe snapshot by id', async () => {
    db().pushQueryResult({ data: favoriteRow, error: null });

    await updateFavoriteRecipe('user-1', 'favorite-1', recipe);

    expect(db().queries[0].calls).toEqual([
      {
        method: 'update',
        args: [
          {
            user_id: 'user-1',
            title: 'Garlic Soy-Glazed  Steak!',
            normalized_title: 'garlic soy glazed steak',
            description: 'Savory and quick.',
            instructions: ['Cook.'],
            ingredients: [{ name: 'Steak', isAvailable: true }],
            prep_time_minutes: 20,
            uses_expiring_items: true,
            language: null,
          },
        ],
      },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'eq', args: ['id', 'favorite-1'] },
      { method: 'select', args: ['*'] },
      { method: 'single', args: [] },
    ]);
  });

  it('removes favorites by normalized title', async () => {
    db().pushQueryResult({ data: null, error: null });

    await removeFavoriteRecipeByTitle('user-1', 'Garlic Soy-Glazed Steak!');

    expect(db().queries[0].calls).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'eq', args: ['normalized_title', 'garlic soy glazed steak'] },
    ]);
  });
});
