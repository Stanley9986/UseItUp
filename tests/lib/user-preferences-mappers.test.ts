import { describe, expect, it } from 'vitest';

import {
  addAvoidedIngredient,
  defaultUserPreferences,
  mapUserPreferencesRow,
  mapUserPreferencesUpsert,
  normalizeAvoidedIngredient,
  removeAvoidedIngredient,
  summarizeUserPreferences,
} from '@/lib/preferences/user-preferences-mappers';

describe('mapUserPreferencesRow', () => {
  it('returns defaults when no row exists yet', () => {
    expect(mapUserPreferencesRow(null)).toEqual(defaultUserPreferences);
  });

  it('maps stored preference arrays into app preferences', () => {
    expect(
      mapUserPreferencesRow({
        user_id: 'user-1',
        dietary_preferences: ['Vegetarian', '  ', 'Dairy-free'],
        cuisine_preferences: ['Italian', 'Italian', 'Thai'],
        avoided_ingredients: ['Peanuts', 'Peanuts', 'cilantro'],
        max_prep_time_minutes: 45,
        language_code: 'es',
        created_at: '2026-05-31T12:00:00Z',
        updated_at: '2026-05-31T12:00:00Z',
      }),
    ).toEqual({
      dietaryPreferences: ['Vegetarian', 'Dairy-free'],
      cuisinePreferences: ['Italian', 'Thai'],
      avoidedIngredients: ['Peanuts', 'cilantro'],
      maxPrepTimeMinutes: 45,
      languageCode: 'es',
    });
  });
});

describe('mapUserPreferencesUpsert', () => {
  it('normalizes lists before saving', () => {
    const mapped = mapUserPreferencesUpsert('user-1', {
      dietaryPreferences: ['Vegetarian', 'Vegetarian', ''],
      cuisinePreferences: ['Italian', 'Italian', ''],
      avoidedIngredients: [' Peanuts ', 'Cilantro'],
      maxPrepTimeMinutes: 30,
      languageCode: 'fr',
    });

    expect(mapped).toMatchObject({
      user_id: 'user-1',
      dietary_preferences: ['Vegetarian'],
      cuisine_preferences: ['Italian'],
      avoided_ingredients: ['peanuts', 'cilantro'],
      max_prep_time_minutes: 30,
      language_code: 'fr',
    });
    expect(mapped.updated_at).toEqual(expect.any(String));
  });
});

describe('summarizeUserPreferences', () => {
  it('summarizes empty and filled preferences', () => {
    expect(summarizeUserPreferences(defaultUserPreferences)).toBe('30 min meals');
    expect(
      summarizeUserPreferences({
        dietaryPreferences: ['Vegetarian'],
        cuisinePreferences: ['Italian'],
        avoidedIngredients: ['peanuts'],
        maxPrepTimeMinutes: 15,
        languageCode: 'es',
      }),
    ).toBe('Vegetarian · Italian · Avoids peanuts · 15 min meals');
  });

  it('summarizes preferences with localized display labels', () => {
    expect(
      summarizeUserPreferences(
        {
          dietaryPreferences: ['Nut-free'],
          cuisinePreferences: ['Japanese'],
          avoidedIngredients: ['garlic', 'peanuts'],
          maxPrepTimeMinutes: 30,
          languageCode: 'ja',
        },
        {
          avoidIngredientsLabel: '避ける食材:',
          avoidedIngredients: ['ニンニク', 'ピーナッツ'],
          dietaryPreferenceLabels: {
            'Nut-free': 'ナッツ不使用',
          },
          cuisinePreferenceLabels: {
            Japanese: '日本料理',
          },
          formatMaxPrepTime: (minutes) => `${minutes}分`,
        },
      ),
    ).toBe('ナッツ不使用 · 日本料理 · 避ける食材: ニンニク, ピーナッツ · 30分');
  });
});

describe('avoided ingredient helpers', () => {
  it('normalizes ingredient names for preference storage', () => {
    expect(normalizeAvoidedIngredient('  Soy   Sauce ')).toBe('soy sauce');
  });

  it('adds a unique avoided ingredient', () => {
    expect(
      addAvoidedIngredient(
        {
          dietaryPreferences: [],
          cuisinePreferences: [],
          avoidedIngredients: ['peanuts'],
          maxPrepTimeMinutes: 30,
          languageCode: 'en',
        },
        '  Soy   Sauce ',
      ),
    ).toEqual({
      dietaryPreferences: [],
      cuisinePreferences: [],
      avoidedIngredients: ['peanuts', 'soy sauce'],
      maxPrepTimeMinutes: 30,
      languageCode: 'en',
    });
  });

  it('does not add empty or duplicate avoided ingredients', () => {
    const preferences = {
      dietaryPreferences: [],
      cuisinePreferences: [],
      avoidedIngredients: ['peanuts'],
      maxPrepTimeMinutes: 30,
      languageCode: 'en',
    };

    expect(addAvoidedIngredient(preferences, 'peanuts')).toBe(preferences);
    expect(addAvoidedIngredient(preferences, '   ')).toBe(preferences);
  });

  it('removes an avoided ingredient', () => {
    expect(
      removeAvoidedIngredient(
        {
          dietaryPreferences: [],
          cuisinePreferences: [],
          avoidedIngredients: ['peanuts', 'soy sauce'],
          maxPrepTimeMinutes: 30,
          languageCode: 'en',
        },
        ' Soy Sauce ',
      ),
    ).toEqual({
      dietaryPreferences: [],
      cuisinePreferences: [],
      avoidedIngredients: ['peanuts'],
      maxPrepTimeMinutes: 30,
      languageCode: 'en',
    });
  });
});
