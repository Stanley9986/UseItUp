import { describe, expect, it } from 'vitest';

import {
  mapRecipeIngredientInsert,
  mapRecipeInsert,
  mapRecipeRow,
  mapSavedRecipeUpdatePayload,
  mapSuggestedRecipesPayload,
  RecipeIngredientRow,
  RecipeRow,
} from '@/lib/recipes/recipe-persistence-mappers';

const recipeRow: RecipeRow = {
  id: 'recipe-1',
  user_id: 'user-1',
  title: 'Spinach Omelet',
  description: 'Fast eggs with greens.',
  instructions: ['Whisk eggs.', 'Cook spinach.', 'Fold together.'],
  prep_time_minutes: 12,
  uses_expiring_items: true,
  is_suggested: true,
  created_by_ai: true,
  source: 'ai',
  created_at: '2026-05-30T12:00:00Z',
  updated_at: '2026-05-30T12:00:00Z',
};

const ingredientRows: RecipeIngredientRow[] = [
  {
    id: 'ingredient-2',
    recipe_id: 'recipe-1',
    pantry_item_id: null,
    name: 'Garlic',
    quantity_value: null,
    quantity_unit: null,
    is_available: false,
    is_optional: true,
    sort_order: 1,
    created_at: '2026-05-30T12:00:00Z',
  },
  {
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
  },
];

describe('mapRecipeRow', () => {
  it('maps saved recipe rows and ordered ingredients to app recipes', () => {
    expect(mapRecipeRow(recipeRow, ingredientRows)).toEqual({
      id: 'recipe-1',
      title: 'Spinach Omelet',
      description: 'Fast eggs with greens.',
      prepTimeMinutes: 12,
      usesExpiringItems: true,
      ingredients: [
        {
          name: 'Spinach',
          pantryItemId: 'pantry-1',
          quantityValue: 1,
          quantityUnit: 'portion',
          isAvailable: true,
          isOptional: false,
        },
        {
          name: 'Garlic',
          pantryItemId: undefined,
          quantityValue: undefined,
          quantityUnit: undefined,
          isAvailable: false,
          isOptional: true,
        },
      ],
      missingIngredients: ['Garlic'],
      instructions: ['Whisk eggs.', 'Cook spinach.', 'Fold together.'],
    });
  });
});

describe('mapRecipeInsert', () => {
  it('maps generated recipes to database insert rows', () => {
    expect(
      mapRecipeInsert('user-1', {
        id: 'generated-1',
        title: '  Rice Bowl ',
        description: '',
        prepTimeMinutes: 20,
        usesExpiringItems: true,
        ingredients: [],
        missingIngredients: [],
        instructions: ['Cook rice.'],
      }),
    ).toEqual({
      user_id: 'user-1',
      title: 'Rice Bowl',
      description: null,
      instructions: ['Cook rice.'],
      prep_time_minutes: 20,
      uses_expiring_items: true,
      is_suggested: true,
      created_by_ai: true,
      source: 'ai',
      language: null,
    });
  });
});

describe('mapRecipeIngredientInsert', () => {
  it('maps generated ingredients to database insert rows', () => {
    expect(
      mapRecipeIngredientInsert(
        'recipe-1',
        {
          name: '  Eggs ',
          pantryItemId: 'pantry-1',
          quantityValue: 2,
          quantityUnit: 'count',
          isAvailable: true,
        },
        3,
      ),
    ).toEqual({
      recipe_id: 'recipe-1',
      pantry_item_id: 'pantry-1',
      name: 'Eggs',
      quantity_value: 2,
      quantity_unit: 'count',
      is_available: true,
      is_optional: false,
      sort_order: 3,
    });
  });
});

describe('mapSuggestedRecipesPayload', () => {
  it('builds an RPC payload with nested ingredients and no user_id or recipe_id', () => {
    expect(
      mapSuggestedRecipesPayload('user-1', [
        {
          id: 'generated-1',
          title: '  Rice Bowl ',
          description: '',
          prepTimeMinutes: 20,
          usesExpiringItems: true,
          ingredients: [
            { name: '  Eggs ', pantryItemId: 'pantry-1', quantityValue: 2, quantityUnit: 'count', isAvailable: true },
            { name: 'Garlic', isAvailable: false, isOptional: true },
          ],
          missingIngredients: [],
          instructions: ['Cook rice.'],
        },
      ]),
    ).toEqual([
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
          {
            pantry_item_id: null,
            name: 'Garlic',
            quantity_value: null,
            quantity_unit: null,
            is_available: false,
            is_optional: true,
            sort_order: 1,
          },
        ],
      },
    ]);
  });
});

describe('mapSavedRecipeUpdatePayload', () => {
  it('builds an RPC update payload without insert-only recipe keys', () => {
    expect(
      mapSavedRecipeUpdatePayload('user-1', {
        id: 'recipe-1',
        title: 'Rice Bowl',
        description: '  Quick lunch. ',
        prepTimeMinutes: 18,
        usesExpiringItems: true,
        ingredients: [{ name: 'Rice', isAvailable: true }],
        missingIngredients: [],
        instructions: ['Warm rice.'],
      }),
    ).toEqual({
      title: 'Rice Bowl',
      description: 'Quick lunch.',
      instructions: ['Warm rice.'],
      prep_time_minutes: 18,
      uses_expiring_items: true,
      ingredients: [
        {
          pantry_item_id: null,
          name: 'Rice',
          quantity_value: null,
          quantity_unit: null,
          is_available: true,
          is_optional: false,
          sort_order: 0,
        },
      ],
    });
  });
});
