import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MockSupabaseClient } from '@/tests/helpers/createMockSupabaseClient';

const supabaseMock = vi.hoisted(() => ({ current: null as MockSupabaseClient | null }));

vi.mock('@/lib/shared/supabase', async () => {
  const { createMockSupabaseClient } = await import('@/tests/helpers/createMockSupabaseClient');
  supabaseMock.current = createMockSupabaseClient();
  return { supabase: supabaseMock.current.supabase };
});

import { cookRecipeAndUpdatePantry } from '@/lib/cooking/cooking';
import type { PantryItem, Recipe } from '@/types/useitup';

const recipe: Recipe = {
  id: 'recipe-1',
  title: 'Steak Bowl',
  ingredients: [],
  missingIngredients: [],
  instructions: [],
};

const steak: PantryItem = {
  id: 'steak',
  name: 'Steak',
  quantityUnit: 'portion',
  quantityValue: 2,
  storageLocation: 'fridge',
};

const rice: PantryItem = {
  id: 'rice',
  name: 'Rice',
  quantityLabel: 'medium',
  quantityUnit: 'level',
  storageLocation: 'pantry',
};

function db() {
  if (!supabaseMock.current) {
    throw new Error('Supabase mock was not initialized');
  }

  return supabaseMock.current;
}

describe('cooking data access', () => {
  beforeEach(() => {
    db().reset();
  });

  it('creates a cook session, updates pantry, and records pantry updates', async () => {
    db().pushQueryResult({ data: { id: 'cook-1' }, error: null });
    db().pushQueryResult({ data: null, error: null });
    db().pushQueryResult({ data: null, error: null });

    await expect(
      cookRecipeAndUpdatePantry({
        choices: { rice: { type: 'skip' }, steak: { type: 'suggested' } },
        pantryItems: [steak, rice],
        recipe,
        userId: 'user-1',
      }),
    ).resolves.toEqual({ cookSessionId: 'cook-1', updateCount: 1 });

    expect(db().queries.map((query) => query.table)).toEqual(['cook_sessions', 'pantry_items', 'pantry_updates']);
    expect(db().queries[0].calls).toEqual([
      { method: 'insert', args: [{ recipe_id: 'recipe-1', user_id: 'user-1' }] },
      { method: 'select', args: ['id'] },
      { method: 'single', args: [] },
    ]);
    expect(db().queries[1].calls).toEqual([
      {
        method: 'update',
        args: [{ quantity_label: null, quantity_value: 1, updated_at: expect.any(String) }],
      },
      { method: 'eq', args: ['id', 'steak'] },
      { method: 'eq', args: ['user_id', 'user-1'] },
    ]);
    expect(db().queries[2].calls).toEqual([
      {
        method: 'insert',
        args: [
          [
            {
              pantry_item_id: 'steak',
              previous_quantity_value: 2,
              new_quantity_value: 1,
              previous_quantity_label: null,
              new_quantity_label: null,
              unit_used: 'portion',
              amount_used: 1,
              update_action: 'suggested_amount',
              user_confirmed: true,
              cook_session_id: 'cook-1',
            },
          ],
        ],
      },
    ]);
  });

  it('skips pantry update inserts when no pantry items change', async () => {
    db().pushQueryResult({ data: { id: 'cook-1' }, error: null });

    await expect(
      cookRecipeAndUpdatePantry({
        choices: { steak: { type: 'skip' } },
        pantryItems: [steak],
        recipe,
        userId: 'user-1',
      }),
    ).resolves.toEqual({ cookSessionId: 'cook-1', updateCount: 0 });

    expect(db().queries.map((query) => query.table)).toEqual(['cook_sessions']);
  });

  it('throws pantry update errors before recording pantry update history', async () => {
    const error = new Error('pantry update failed');
    db().pushQueryResult({ data: { id: 'cook-1' }, error: null });
    db().pushQueryResult({ data: null, error });

    await expect(
      cookRecipeAndUpdatePantry({
        choices: { steak: { type: 'suggested' } },
        pantryItems: [steak],
        recipe,
        userId: 'user-1',
      }),
    ).rejects.toThrow(error);

    expect(db().queries.map((query) => query.table)).toEqual(['cook_sessions', 'pantry_items']);
  });
});
