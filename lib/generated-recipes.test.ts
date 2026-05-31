import { beforeEach, describe, expect, it } from 'vitest';

import {
  getGeneratedRecipes,
  removeGeneratedRecipe,
  setGeneratedRecipes,
} from '@/lib/generated-recipes';
import { Recipe } from '@/types/useitup';

const recipe: Recipe = {
  id: 'recipe-1',
  title: 'Garlic Pasta',
  ingredients: [],
  missingIngredients: [],
  instructions: [],
};

describe('generated recipe cache', () => {
  beforeEach(() => {
    setGeneratedRecipes([]);
  });

  it('removes a cached recipe by id', () => {
    setGeneratedRecipes([recipe, { ...recipe, id: 'recipe-2' }]);

    removeGeneratedRecipe('recipe-1');

    expect(getGeneratedRecipes()).toEqual([{ ...recipe, id: 'recipe-2' }]);
  });
});
