import { describe, expect, it } from 'vitest';

import {
  buildEditedFavoriteRecipe,
  getFavoriteRecipeEditInput,
  parseRecipeLines,
  validateFavoriteRecipeEditInput,
} from '@/lib/recipe-editing';
import type { Recipe } from '@/types/useitup';

const recipe: Recipe = {
  id: 'favorite-1',
  title: 'Garlic Soy Steak',
  description: 'Quick dinner.',
  prepTimeMinutes: 20,
  usesExpiringItems: true,
  ingredients: [
    { name: 'Steak', pantryItemId: 'pantry-1', quantityValue: 1, quantityUnit: 'portion', isAvailable: true },
    { name: 'Soy Sauce', isAvailable: false, isOptional: true },
  ],
  missingIngredients: ['Soy Sauce'],
  instructions: ['Sear steak.', 'Add sauce.'],
};

describe('getFavoriteRecipeEditInput', () => {
  it('serializes a favorite recipe into editable text fields', () => {
    expect(getFavoriteRecipeEditInput(recipe)).toEqual({
      availableIngredientsText: 'Steak',
      description: 'Quick dinner.',
      instructionsText: 'Sear steak.\nAdd sauce.',
      missingIngredientsText: 'Soy Sauce',
      prepTimeMinutes: '20',
      title: 'Garlic Soy Steak',
      usesExpiringItems: true,
    });
  });
});

describe('buildEditedFavoriteRecipe', () => {
  it('builds a recipe snapshot and preserves metadata for unchanged ingredient names', () => {
    expect(
      buildEditedFavoriteRecipe(recipe, {
        availableIngredientsText: 'Steak\nRice',
        description: '  Updated dinner. ',
        instructionsText: 'Cook rice.\nSear steak.',
        missingIngredientsText: 'Green Onion',
        prepTimeMinutes: '25',
        title: '  Steak Rice Bowl ',
        usesExpiringItems: false,
      }),
    ).toMatchObject({
      id: 'favorite-1',
      title: 'Steak Rice Bowl',
      description: 'Updated dinner.',
      prepTimeMinutes: 25,
      usesExpiringItems: false,
      ingredients: [
        { name: 'Steak', pantryItemId: 'pantry-1', quantityValue: 1, quantityUnit: 'portion', isAvailable: true },
        { name: 'Rice', isAvailable: true },
        { name: 'Green Onion', isAvailable: false },
      ],
      missingIngredients: ['Green Onion'],
      instructions: ['Cook rice.', 'Sear steak.'],
    });
  });
});

describe('validateFavoriteRecipeEditInput', () => {
  const validInput = getFavoriteRecipeEditInput(recipe);

  it('returns no message for valid input', () => {
    expect(validateFavoriteRecipeEditInput(validInput)).toBe('');
  });

  it('requires a title, ingredient, instruction, and valid prep time', () => {
    expect(validateFavoriteRecipeEditInput({ ...validInput, title: ' ' })).toBe('Add a recipe title before saving.');
    expect(validateFavoriteRecipeEditInput({ ...validInput, availableIngredientsText: '', missingIngredientsText: '' })).toBe(
      'Add at least one ingredient before saving.',
    );
    expect(validateFavoriteRecipeEditInput({ ...validInput, instructionsText: '' })).toBe(
      'Add at least one instruction before saving.',
    );
    expect(validateFavoriteRecipeEditInput({ ...validInput, prepTimeMinutes: '1.5' })).toBe(
      'Prep time must be a whole number of minutes.',
    );
  });
});

describe('parseRecipeLines', () => {
  it('supports newline and comma separated entries', () => {
    expect(parseRecipeLines('Rice, Steak\nSoy Sauce')).toEqual(['Rice', 'Steak', 'Soy Sauce']);
  });
});
