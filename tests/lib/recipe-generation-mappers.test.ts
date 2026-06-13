import { describe, expect, it } from 'vitest';

import { normalizeGeneratedRecipes } from '@/lib/recipes/recipe-generation-mappers';

describe('normalizeGeneratedRecipes', () => {
  it('normalizes generated recipe responses', () => {
    expect(
      normalizeGeneratedRecipes({
        recipes: [
          {
            id: 'generated-1',
            title: 'Spinach Rice Bowl',
            description: 'A fast bowl using fridge greens.',
            prepTimeMinutes: 20,
            usesExpiringItems: true,
            ingredients: [
              {
                name: 'Spinach',
                pantryItemId: 'spinach',
                quantityValue: null,
                quantityUnit: 'handful',
                isAvailable: true,
                isOptional: false,
              },
            ],
            missingIngredients: ['Garlic'],
            instructions: ['Cook rice.', 'Wilt spinach.', 'Serve together.'],
          },
        ],
      }),
    ).toEqual([
      {
        id: 'generated-1',
        title: 'Spinach Rice Bowl',
        description: 'A fast bowl using fridge greens.',
        prepTimeMinutes: 20,
        usesExpiringItems: true,
        ingredients: [
          {
            name: 'Spinach',
            pantryItemId: 'spinach',
            quantityValue: undefined,
            quantityUnit: 'handful',
            isAvailable: true,
            isOptional: false,
          },
        ],
        missingIngredients: ['Garlic'],
        instructions: ['Cook rice.', 'Wilt spinach.', 'Serve together.'],
      },
    ]);
  });

  it('filters invalid recipes and ingredients', () => {
    expect(
      normalizeGeneratedRecipes({
        recipes: [
          { description: 'missing title' },
          {
            title: 'Egg Rice',
            ingredients: [{ quantityUnit: 'count' }, { name: 'Eggs', isAvailable: true }],
            missingIngredients: [null, 'Scallions'],
            instructions: [1, 'Scramble eggs.'],
          },
        ],
      }),
    ).toMatchObject([
      {
        title: 'Egg Rice',
        ingredients: [{ name: 'Eggs', isAvailable: true }],
        missingIngredients: ['Scallions'],
        instructions: ['Scramble eggs.'],
      },
    ]);
  });

  it('drops near-duplicate recipes within a batch', () => {
    const result = normalizeGeneratedRecipes({
      recipes: [
        { title: 'Tomato Pasta', ingredients: [{ name: 'Pasta', isAvailable: true }] },
        { title: 'Pasta with Tomatoes', ingredients: [{ name: 'Pasta', isAvailable: true }] },
      ],
    });

    expect(result.map((item) => item.title)).toEqual(['Tomato Pasta']);
  });

  it('returns an empty array for invalid payloads', () => {
    expect(normalizeGeneratedRecipes({ recipes: null })).toEqual([]);
    expect(normalizeGeneratedRecipes(null)).toEqual([]);
  });
});
