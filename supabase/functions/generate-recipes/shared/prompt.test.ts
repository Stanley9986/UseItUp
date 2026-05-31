import { describe, expect, it } from 'vitest';

import { createRecipePrompt } from './prompt';

describe('createRecipePrompt', () => {
  it('includes user preferences in the payload', () => {
    const prompt = createRecipePrompt({
      pantryItems: [
        {
          id: 'item-1',
          name: 'Steak',
          storageLocation: 'fridge',
          quantityValue: 2,
          quantityUnit: 'portion',
          expirationDate: '2026-06-01',
          ignored: 'not sent',
        },
      ],
      preferences: {
        dietaryPreferences: ['Dairy-free'],
        avoidedIngredients: ['peanuts'],
        maxPrepTimeMinutes: 20,
        prioritizeExpiringSoon: true,
      },
    });

    expect(prompt.systemInstruction).toContain('Respect dietary preferences');
    expect(prompt.systemInstruction).toContain('make instruction 1 inspect those ingredients');
    expect(prompt.systemInstruction).toContain('Never put the freshness inspection step at the end');
    expect(prompt.userPayload).toEqual({
      pantryItems: [
        {
          id: 'item-1',
          name: 'Steak',
          category: undefined,
          storageLocation: 'fridge',
          quantityValue: 2,
          quantityUnit: 'portion',
          quantityLabel: undefined,
          expirationDate: '2026-06-01',
          notes: undefined,
        },
      ],
      preferences: {
        dietaryPreferences: ['Dairy-free'],
        avoidedIngredients: ['peanuts'],
        maxPrepTimeMinutes: 20,
        prioritizeExpiringSoon: true,
      },
    });
  });

  it('drops invalid preference fields', () => {
    expect(
      createRecipePrompt({
        pantryItems: [],
        preferences: {
          dietaryPreferences: ['Vegetarian', 123],
          avoidedIngredients: 'peanuts',
          maxPrepTimeMinutes: 'fast',
        },
      }).userPayload.preferences,
    ).toEqual({
      dietaryPreferences: ['Vegetarian'],
      avoidedIngredients: [],
      maxPrepTimeMinutes: undefined,
      prioritizeExpiringSoon: undefined,
    });
  });
});
