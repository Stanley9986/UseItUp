import { describe, expect, it } from 'vitest';

import { FavoriteRecipeRow, mapFavoriteRecipeInsert, mapFavoriteRecipeRow } from '@/lib/recipes/favorite-recipes-mappers';
import { Recipe } from '@/types/useitup';

const baseRow: FavoriteRecipeRow = {
  id: 'favorite-1',
  user_id: 'user-1',
  title: 'Garlic Soy Steak Bites',
  normalized_title: 'garlic soy steak bites',
  description: 'Quick seared steak.',
  instructions: ['Sear steak.', 'Add sauce.'],
  ingredients: [
    { name: 'Steak', pantryItemId: 'pantry-1', quantityValue: 1, quantityUnit: 'portion', isAvailable: true },
    { name: 'Soy Sauce', isAvailable: false, isOptional: true },
  ],
  prep_time_minutes: 15,
  uses_expiring_items: true,
  created_at: '2026-05-30T12:00:00Z',
};

describe('mapFavoriteRecipeRow', () => {
  it('maps a snapshot row to a favorited recipe with missing ingredients derived', () => {
    expect(mapFavoriteRecipeRow(baseRow)).toEqual({
      id: 'favorite-1',
      title: 'Garlic Soy Steak Bites',
      description: 'Quick seared steak.',
      prepTimeMinutes: 15,
      usesExpiringItems: true,
      isFavorite: true,
      ingredients: [
        {
          name: 'Steak',
          pantryItemId: 'pantry-1',
          quantityValue: 1,
          quantityUnit: 'portion',
          isAvailable: true,
          isOptional: false,
        },
        {
          name: 'Soy Sauce',
          pantryItemId: undefined,
          quantityValue: undefined,
          quantityUnit: undefined,
          isAvailable: false,
          isOptional: true,
        },
      ],
      missingIngredients: ['Soy Sauce'],
      instructions: ['Sear steak.', 'Add sauce.'],
    });
  });

  it('falls back to empty arrays when instructions and ingredients are not arrays', () => {
    const result = mapFavoriteRecipeRow({ ...baseRow, instructions: 'Sear steak.', ingredients: null });

    expect(result.instructions).toEqual([]);
    expect(result.ingredients).toEqual([]);
    expect(result.missingIngredients).toEqual([]);
  });

  it('drops malformed ingredient entries and non-string instructions', () => {
    const result = mapFavoriteRecipeRow({
      ...baseRow,
      instructions: ['Sear steak.', 42, null, 'Plate.'],
      ingredients: [
        null,
        'not-an-object',
        { name: 123 },
        { isAvailable: true },
        { name: 'Onion', quantityValue: '2', isAvailable: false },
      ],
    });

    expect(result.instructions).toEqual(['Sear steak.', 'Plate.']);
    expect(result.ingredients).toEqual([
      { name: 'Onion', pantryItemId: undefined, quantityValue: undefined, quantityUnit: undefined, isAvailable: false, isOptional: false },
    ]);
    expect(result.missingIngredients).toEqual(['Onion']);
  });

  it('maps null description and prep time to undefined', () => {
    const result = mapFavoriteRecipeRow({ ...baseRow, description: null, prep_time_minutes: null });

    expect(result.description).toBeUndefined();
    expect(result.prepTimeMinutes).toBeUndefined();
  });
});

describe('mapFavoriteRecipeInsert', () => {
  it('trims fields, normalizes the title, and passes snapshot arrays through', () => {
    const recipe: Recipe = {
      id: 'generated-1',
      title: '  Garlic Soy-Glazed  Steak! ',
      description: '  Savory and quick.  ',
      prepTimeMinutes: 20,
      usesExpiringItems: true,
      ingredients: [{ name: 'Steak', isAvailable: true }],
      missingIngredients: [],
      instructions: ['Cook.'],
    };

    expect(mapFavoriteRecipeInsert('user-1', recipe)).toEqual({
      user_id: 'user-1',
      title: 'Garlic Soy-Glazed  Steak!',
      normalized_title: 'garlic soy glazed steak',
      description: 'Savory and quick.',
      instructions: ['Cook.'],
      ingredients: [{ name: 'Steak', isAvailable: true }],
      prep_time_minutes: 20,
      uses_expiring_items: true,
      language: null,
    });
  });

  it('maps empty description and missing prep time to null', () => {
    const recipe: Recipe = {
      id: 'generated-2',
      title: 'Rice Bowl',
      description: '   ',
      ingredients: [],
      missingIngredients: [],
      instructions: [],
    };

    const result = mapFavoriteRecipeInsert('user-1', recipe);

    expect(result.description).toBeNull();
    expect(result.prep_time_minutes).toBeNull();
    expect(result.uses_expiring_items).toBe(false);
  });
});
