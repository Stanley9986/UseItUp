import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MockSupabaseClient } from '@/tests/helpers/createMockSupabaseClient';

const supabaseMock = vi.hoisted(() => ({ current: null as MockSupabaseClient | null }));

vi.mock('@/lib/supabase', async () => {
  const { createMockSupabaseClient } = await import('@/tests/helpers/createMockSupabaseClient');
  supabaseMock.current = createMockSupabaseClient();
  return { supabase: supabaseMock.current.supabase };
});

import {
  createSavedRecipeFromSnapshot,
  dismissSuggestedRecipe,
  getSavedRecipeById,
  getSavedRecipesPage,
  getSavedRecipes,
  replaceSuggestedRecipes,
  updateSavedRecipe,
} from '@/lib/recipes';
import type { RecipeIngredientRow, RecipeRow } from '@/lib/recipe-persistence-mappers';
import type { Recipe } from '@/types/useitup';

const recipeRow: RecipeRow = {
  id: 'recipe-1',
  user_id: 'user-1',
  title: 'Spinach Omelet',
  description: 'Fast eggs with greens.',
  instructions: ['Whisk eggs.', 'Cook spinach.'],
  prep_time_minutes: 12,
  uses_expiring_items: true,
  is_suggested: true,
  created_by_ai: true,
  source: 'ai',
  created_at: '2026-05-30T12:00:00Z',
  updated_at: '2026-05-30T12:00:00Z',
};

const ingredientRow: RecipeIngredientRow = {
  id: 'ingredient-1',
  recipe_id: 'recipe-1',
  pantry_item_id: 'pantry-1',
  name: 'Spinach',
  quantity_value: 1,
  quantity_unit: 'portion',
  is_available: true,
  is_optional: false,
  sort_order: 0,
  created_at: '2026-05-30T12:00:00Z',
};

const generatedRecipe: Recipe = {
  id: 'generated-1',
  title: '  Rice Bowl ',
  description: '',
  prepTimeMinutes: 20,
  usesExpiringItems: true,
  ingredients: [{ name: 'Eggs', pantryItemId: 'pantry-1', quantityValue: 2, quantityUnit: 'count', isAvailable: true }],
  missingIngredients: [],
  instructions: ['Cook rice.'],
};

function db() {
  if (!supabaseMock.current) {
    throw new Error('Supabase mock was not initialized');
  }

  return supabaseMock.current;
}

describe('recipe data access', () => {
  beforeEach(() => {
    db().reset();
  });

  it('loads suggested recipes with their ordered ingredients and pagination', async () => {
    db().pushQueryResult({ data: [recipeRow, { ...recipeRow, id: 'recipe-2' }], error: null });
    db().pushQueryResult({ data: [ingredientRow], error: null });

    const page = await getSavedRecipesPage('user-1', { pageSize: 1 });

    expect(page).toMatchObject({
      hasMore: true,
      items: [{ id: 'recipe-1', title: 'Spinach Omelet', ingredients: [{ name: 'Spinach', pantryItemId: 'pantry-1' }] }],
      nextPage: 1,
    });
    expect(db().queries[0].calls).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'eq', args: ['is_suggested', true] },
      { method: 'order', args: ['created_at', { ascending: false }] },
      { method: 'range', args: [0, 1] },
    ]);
    expect(db().queries[1]).toMatchObject({ table: 'recipe_ingredients' });
    expect(db().queries[1].calls).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'in', args: ['recipe_id', ['recipe-1']] },
      { method: 'order', args: ['sort_order', { ascending: true }] },
    ]);
  });

  it('keeps the legacy saved recipe helper returning only items', async () => {
    db().pushQueryResult({ data: [recipeRow], error: null });
    db().pushQueryResult({ data: [ingredientRow], error: null });

    await expect(getSavedRecipes('user-1')).resolves.toMatchObject([{ id: 'recipe-1' }]);
  });

  it('does not fetch ingredients when a recipe lookup misses', async () => {
    db().pushQueryResult({ data: null, error: null });

    await expect(getSavedRecipeById('user-1', 'missing-recipe')).resolves.toBeNull();
    expect(db().queries).toHaveLength(1);
    expect(db().queries[0].calls).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'eq', args: ['id', 'missing-recipe'] },
      { method: 'maybeSingle', args: [] },
    ]);
  });

  it('replaces suggestions through the RPC and reloads saved recipes', async () => {
    db().pushRpcResult({ data: null, error: null });
    db().pushQueryResult({ data: [], error: null });

    await expect(replaceSuggestedRecipes('user-1', [generatedRecipe])).resolves.toEqual([]);

    expect(db().rpcCalls).toEqual([
      {
        functionName: 'replace_suggested_recipes',
        args: {
          p_recipes: [
            {
              title: 'Rice Bowl',
              description: null,
              instructions: ['Cook rice.'],
              prep_time_minutes: 20,
              uses_expiring_items: true,
              is_suggested: true,
              created_by_ai: true,
              source: 'ai',
              ingredients: [
                {
                  pantry_item_id: 'pantry-1',
                  name: 'Eggs',
                  quantity_value: 2,
                  quantity_unit: 'count',
                  is_available: true,
                  is_optional: false,
                  sort_order: 0,
                },
              ],
            },
          ],
        },
      },
    ]);
  });

  it('demotes dismissed suggested recipes instead of deleting them', async () => {
    db().pushQueryResult({ data: null, error: null });

    await dismissSuggestedRecipe('user-1', 'recipe-1');

    expect(db().queries[0]).toMatchObject({ table: 'recipes' });
    expect(db().queries[0].calls).toEqual([
      { method: 'update', args: [{ is_suggested: false, updated_at: expect.any(String) }] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'eq', args: ['id', 'recipe-1'] },
    ]);
  });

  it('creates a non-suggested saved recipe from a favorite snapshot', async () => {
    db().pushQueryResult({
      data: {
        ...recipeRow,
        id: 'recipe-copy-1',
        title: 'Rice Bowl',
        description: null,
        instructions: ['Cook rice.'],
        prep_time_minutes: 20,
        is_suggested: false,
        created_by_ai: false,
        source: 'user_saved',
      },
      error: null,
    });
    db().pushQueryResult({ data: null, error: null });

    await expect(createSavedRecipeFromSnapshot('user-1', generatedRecipe)).resolves.toMatchObject({
      id: 'recipe-copy-1',
      title: 'Rice Bowl',
    });

    expect(db().queries[0].calls).toEqual([
      {
        method: 'insert',
        args: [
          {
            user_id: 'user-1',
            title: 'Rice Bowl',
            description: null,
            instructions: ['Cook rice.'],
            prep_time_minutes: 20,
            uses_expiring_items: true,
            is_suggested: false,
            created_by_ai: false,
            source: 'user_saved',
          },
        ],
      },
      { method: 'select', args: ['*'] },
      { method: 'single', args: [] },
    ]);
    expect(db().queries[1].calls).toEqual([
      {
        method: 'insert',
        args: [
          [
            {
              recipe_id: 'recipe-copy-1',
              pantry_item_id: 'pantry-1',
              name: 'Eggs',
              quantity_value: 2,
              quantity_unit: 'count',
              is_available: true,
              is_optional: false,
              sort_order: 0,
            },
          ],
        ],
      },
    ]);
  });

  it('updates a saved recipe through the transactional RPC and reloads it', async () => {
    db().pushRpcResult({ data: null, error: null });
    db().pushQueryResult({ data: recipeRow, error: null });
    db().pushQueryResult({ data: [ingredientRow], error: null });

    await expect(updateSavedRecipe('user-1', 'recipe-1', generatedRecipe)).resolves.toMatchObject({
      id: 'recipe-1',
      title: 'Spinach Omelet',
    });

    expect(db().rpcCalls).toEqual([
      {
        functionName: 'update_saved_recipe',
        args: {
          p_recipe_id: 'recipe-1',
          p_recipe: {
            title: 'Rice Bowl',
            description: null,
            instructions: ['Cook rice.'],
            prep_time_minutes: 20,
            uses_expiring_items: true,
            ingredients: [
              {
                pantry_item_id: 'pantry-1',
                name: 'Eggs',
                quantity_value: 2,
                quantity_unit: 'count',
                is_available: true,
                is_optional: false,
                sort_order: 0,
              },
            ],
          },
        },
      },
    ]);
  });

  it('throws recipe query errors before loading ingredients', async () => {
    const error = new Error('recipes unavailable');
    db().pushQueryResult({ data: null, error });

    await expect(getSavedRecipes('user-1')).rejects.toThrow(error);
    expect(db().queries).toHaveLength(1);
  });
});
