import { describe, expect, it } from 'vitest';

import { isRecipeFavorited, normalizeRecipeTitle } from '@/lib/recipe-list';
import { Recipe } from '@/types/useitup';

const baseRecipe: Recipe = {
  id: 'recipe-1',
  title: 'Recipe',
  ingredients: [],
  missingIngredients: [],
  instructions: [],
};

describe('normalizeRecipeTitle', () => {
  it('lowercases, trims, and collapses non-alphanumeric runs', () => {
    expect(normalizeRecipeTitle('  Garlic Soy-Glazed  Steak! ')).toBe('garlic soy glazed steak');
  });
});

describe('isRecipeFavorited', () => {
  const favorites = [
    { ...baseRecipe, id: 'favorite-1', title: 'Creamy Asparagus Pasta' },
    { ...baseRecipe, id: 'favorite-2', title: 'Garlic Soy Steak Bites' },
  ];

  it('matches a suggested title against favorites ignoring case and punctuation', () => {
    expect(isRecipeFavorited(favorites, 'creamy asparagus pasta')).toBe(true);
    expect(isRecipeFavorited(favorites, 'Garlic Soy-Steak Bites')).toBe(true);
  });

  it('returns false when no favorite shares the title', () => {
    expect(isRecipeFavorited(favorites, 'Easy Soy-Glazed Steak')).toBe(false);
  });
});
