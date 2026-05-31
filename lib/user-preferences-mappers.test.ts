import { describe, expect, it } from 'vitest';

import {
  addAvoidedIngredient,
  defaultUserPreferences,
  mapUserPreferencesRow,
  mapUserPreferencesUpsert,
  normalizeAvoidedIngredient,
  removeAvoidedIngredient,
  summarizeUserPreferences,
} from '@/lib/user-preferences-mappers';

describe('mapUserPreferencesRow', () => {
  it('returns defaults when no row exists yet', () => {
    expect(mapUserPreferencesRow(null)).toEqual(defaultUserPreferences);
  });

  it('maps stored preference arrays into app preferences', () => {
    expect(
      mapUserPreferencesRow({
        user_id: 'user-1',
        dietary_preferences: ['Vegetarian', '  ', 'Dairy-free'],
        avoided_ingredients: ['Peanuts', 'Peanuts', 'cilantro'],
        max_prep_time_minutes: 45,
        created_at: '2026-05-31T12:00:00Z',
        updated_at: '2026-05-31T12:00:00Z',
      }),
    ).toEqual({
      dietaryPreferences: ['Vegetarian', 'Dairy-free'],
      avoidedIngredients: ['Peanuts', 'cilantro'],
      maxPrepTimeMinutes: 45,
    });
  });
});

describe('mapUserPreferencesUpsert', () => {
  it('normalizes lists before saving', () => {
    const mapped = mapUserPreferencesUpsert('user-1', {
      dietaryPreferences: ['Vegetarian', 'Vegetarian', ''],
      avoidedIngredients: [' Peanuts ', 'Cilantro'],
      maxPrepTimeMinutes: 30,
    });

    expect(mapped).toMatchObject({
      user_id: 'user-1',
      dietary_preferences: ['Vegetarian'],
      avoided_ingredients: ['peanuts', 'cilantro'],
      max_prep_time_minutes: 30,
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
        avoidedIngredients: ['peanuts'],
        maxPrepTimeMinutes: 15,
      }),
    ).toBe('Vegetarian · Avoids peanuts · 15 min meals');
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
          avoidedIngredients: ['peanuts'],
          maxPrepTimeMinutes: 30,
        },
        '  Soy   Sauce ',
      ),
    ).toEqual({
      dietaryPreferences: [],
      avoidedIngredients: ['peanuts', 'soy sauce'],
      maxPrepTimeMinutes: 30,
    });
  });

  it('does not add empty or duplicate avoided ingredients', () => {
    const preferences = {
      dietaryPreferences: [],
      avoidedIngredients: ['peanuts'],
      maxPrepTimeMinutes: 30,
    };

    expect(addAvoidedIngredient(preferences, 'peanuts')).toBe(preferences);
    expect(addAvoidedIngredient(preferences, '   ')).toBe(preferences);
  });

  it('removes an avoided ingredient', () => {
    expect(
      removeAvoidedIngredient(
        {
          dietaryPreferences: [],
          avoidedIngredients: ['peanuts', 'soy sauce'],
          maxPrepTimeMinutes: 30,
        },
        ' Soy Sauce ',
      ),
    ).toEqual({
      dietaryPreferences: [],
      avoidedIngredients: ['peanuts'],
      maxPrepTimeMinutes: 30,
    });
  });
});
