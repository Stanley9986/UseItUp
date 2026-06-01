import { describe, expect, it } from 'vitest';

import {
  displayShoppingItemName,
  getSingleSearchParam,
  getShoppingListSourceRecipeId,
  mapShoppingListItemInsert,
  mapShoppingListItemRow,
  mapShoppingItemToAddPantryParams,
  normalizeShoppingItemName,
  uniqueMissingIngredients,
} from '@/lib/shopping-list-mappers';

describe('shopping list mappers', () => {
  it('normalizes and displays ingredient names', () => {
    expect(normalizeShoppingItemName('  Soy   Sauce ')).toBe('soy sauce');
    expect(displayShoppingItemName('soy sauce')).toBe('Soy Sauce');
  });

  it('dedupes missing ingredients by normalized name', () => {
    expect(uniqueMissingIngredients([' Garlic ', 'garlic', '', 'Soy   Sauce'])).toEqual(['garlic', 'soy sauce']);
  });

  it('maps insert payloads', () => {
    expect(
      mapShoppingListItemInsert({
        name: ' garlic ',
        recipeId: 'recipe-1',
        recipeTitle: 'Garlic Pasta',
        userId: 'user-1',
      }),
    ).toMatchObject({
      user_id: 'user-1',
      name: 'Garlic',
      normalized_name: 'garlic',
      source_recipe_id: 'recipe-1',
      source_recipe_title: 'Garlic Pasta',
      is_checked: false,
    });
  });

  it('maps checked shopping items into add-pantry route params', () => {
    expect(mapShoppingItemToAddPantryParams({ id: 'shopping-1', name: 'Soy Sauce' })).toEqual({
      itemName: 'Soy Sauce',
      shoppingItemId: 'shopping-1',
    });
  });

  it('reads the first route search param when expo returns an array', () => {
    expect(getSingleSearchParam(['Garlic', 'Ignored'])).toBe('Garlic');
    expect(getSingleSearchParam('Garlic')).toBe('Garlic');
    expect(getSingleSearchParam()).toBeUndefined();
  });

  it('does not use favorite snapshot ids as recipe foreign keys', () => {
    expect(getShoppingListSourceRecipeId({ isFavoriteSource: true, recipeId: 'favorite-1' })).toBeUndefined();
    expect(getShoppingListSourceRecipeId({ isFavoriteSource: false, recipeId: 'recipe-1' })).toBe('recipe-1');
  });

  it('maps database rows to app items', () => {
    expect(
      mapShoppingListItemRow({
        id: 'item-1',
        user_id: 'user-1',
        name: 'Garlic',
        normalized_name: 'garlic',
        source_recipe_id: null,
        source_recipe_title: null,
        is_checked: false,
        created_at: '2026-05-31T12:00:00Z',
        updated_at: '2026-05-31T12:00:00Z',
      }),
    ).toEqual({
      id: 'item-1',
      name: 'Garlic',
      normalizedName: 'garlic',
      sourceRecipeId: undefined,
      sourceRecipeTitle: undefined,
      isChecked: false,
      createdAt: '2026-05-31T12:00:00Z',
      updatedAt: '2026-05-31T12:00:00Z',
    });
  });
});
