import { describe, expect, it } from 'vitest';

import { createRecipePrompt, createTranslationPrompt } from './prompt';

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
        languageCode: 'es',
      },
    });

    expect(prompt.systemInstruction).toContain('Respect dietary preferences');
    expect(prompt.systemInstruction).toContain('requested language');
    expect(prompt.systemInstruction).toContain('Keep JSON property names in English');
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
        languageCode: 'es',
        languageName: 'Spanish',
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
          languageCode: 'unsupported',
        },
      }).userPayload.preferences,
    ).toEqual({
      dietaryPreferences: ['Vegetarian'],
      avoidedIngredients: [],
      maxPrepTimeMinutes: undefined,
      prioritizeExpiringSoon: undefined,
      languageCode: 'en',
      languageName: 'English',
    });
  });
});

describe('createTranslationPrompt', () => {
  it('builds a payload targeting the requested language and trims content', () => {
    const prompt = createTranslationPrompt({
      targetLanguage: 'zh',
      title: '  Lemon Herb Chicken  ',
      description: 'Juicy grilled chicken.',
      instructions: ['Season the chicken.', 123, 'Grill until done.'],
      ingredientNames: ['Chicken', 'Lemon', ''],
    });

    expect(prompt.systemInstruction).toContain('Translate every string into Chinese');
    expect(prompt.systemInstruction).toContain('Keep JSON property names in English');
    expect(prompt.systemInstruction).toContain('same order and the same count');
    expect(prompt.userPayload).toEqual({
      targetLanguage: 'zh',
      targetLanguageName: 'Chinese',
      title: 'Lemon Herb Chicken',
      description: 'Juicy grilled chicken.',
      instructions: ['Season the chicken.', 'Grill until done.'],
      ingredientNames: ['Chicken', 'Lemon'],
    });
  });

  it('falls back to English for an unsupported target language', () => {
    const prompt = createTranslationPrompt({
      targetLanguage: 'klingon',
      title: 'Toast',
    });

    expect(prompt.userPayload.targetLanguage).toBe('en');
    expect(prompt.userPayload.targetLanguageName).toBe('English');
    expect(prompt.userPayload.instructions).toEqual([]);
    expect(prompt.userPayload.ingredientNames).toEqual([]);
  });
});
