import { describe, expect, it } from 'vitest';

import { getRecipeArtwork, getRecipeImageSearchQuery } from '@/lib/recipe-artwork';
import type { Recipe } from '@/types/useitup';

function recipeWith(parts: Partial<Recipe>): Recipe {
  return {
    id: 'recipe-1',
    title: 'Vegetable Bowl',
    ingredients: [],
    instructions: [],
    missingIngredients: [],
    ...parts,
  };
}

describe('getRecipeArtwork', () => {
  it('selects beef artwork from recipe title', () => {
    expect(getRecipeArtwork(recipeWith({ title: 'Steak and Asparagus Stir-Fry' })).category).toBe('beef');
  });

  it('selects egg artwork from ingredients', () => {
    expect(getRecipeArtwork(recipeWith({ ingredients: [{ name: 'Eggs', isAvailable: true }] })).category).toBe('egg');
  });

  it('prioritizes stronger protein matches before vegetable matches', () => {
    expect(
      getRecipeArtwork(
        recipeWith({
          title: 'Spinach Salmon Bowl',
          ingredients: [
            { name: 'Spinach', isAvailable: true },
            { name: 'Salmon', isAvailable: true },
          ],
        }),
      ).category,
    ).toBe('seafood');
  });

  it('falls back to vegetable artwork', () => {
    expect(getRecipeArtwork(recipeWith({ title: 'Pantry Mix' })).category).toBe('vegetable');
  });

  it('does not include a remote image for category fallbacks', () => {
    expect(getRecipeArtwork(recipeWith({ title: 'Pantry Mix' })).imageUrl).toBeUndefined();
  });
});

describe('getRecipeImageSearchQuery', () => {
  it('builds a stock image search query for the finished cooked dish', () => {
    expect(
      getRecipeImageSearchQuery(
        recipeWith({
          title: 'Steak Rice Bowl',
          ingredients: [
            { name: 'Steak', isAvailable: true },
            { name: 'Rice', isAvailable: true },
            { name: 'Soy Sauce', isAvailable: false },
            { name: 'Salt', isAvailable: false },
          ],
        }),
      ),
    ).toBe('Steak Rice Bowl beef cooked plated finished dish recipe food photography');
  });

  it('does not include ingredient-only terms that can bias results toward raw ingredients', () => {
    expect(
      getRecipeImageSearchQuery(
        recipeWith({
          title: 'Pan-Seared Steak with Spinach',
          ingredients: [
            { name: 'Olive Oil', isAvailable: true },
            { name: 'Raw Steak', isAvailable: true },
          ],
        }),
      ),
    ).not.toContain('Olive Oil');
  });
});
