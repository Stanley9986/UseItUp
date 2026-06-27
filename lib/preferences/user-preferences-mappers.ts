import { defaultLanguageCode, normalizeLanguageCode } from '@/lib/i18n/languages';
import { UserPreferences } from '@/types/useitup';

export type UserPreferencesRow = {
  user_id: string;
  dietary_preferences: string[] | null;
  cuisine_preferences: string[] | null;
  avoided_ingredients: string[] | null;
  max_prep_time_minutes: number | null;
  language_code: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPreferencesUpsert = {
  user_id: string;
  dietary_preferences: string[];
  cuisine_preferences: string[];
  avoided_ingredients: string[];
  max_prep_time_minutes: number | null;
  language_code: string;
  updated_at: string;
};

export const defaultUserPreferences: UserPreferences = {
  dietaryPreferences: [],
  cuisinePreferences: [],
  avoidedIngredients: [],
  maxPrepTimeMinutes: 30,
  languageCode: defaultLanguageCode,
};

export type UserPreferencesSummaryOptions = {
  avoidIngredientsLabel?: string;
  avoidedIngredients?: string[];
  dietaryPreferenceLabels?: Record<string, string>;
  cuisinePreferenceLabels?: Record<string, string>;
  emptyLabel?: string;
  formatMaxPrepTime?: (minutes: number) => string;
};

export function mapUserPreferencesRow(row: UserPreferencesRow | null): UserPreferences {
  if (!row) {
    return defaultUserPreferences;
  }

  return {
    dietaryPreferences: cleanStringList(row.dietary_preferences),
    cuisinePreferences: cleanStringList(row.cuisine_preferences),
    avoidedIngredients: cleanStringList(row.avoided_ingredients),
    maxPrepTimeMinutes: typeof row.max_prep_time_minutes === 'number' ? row.max_prep_time_minutes : 30,
    languageCode: normalizeLanguageCode(row.language_code),
  };
}

export function mapUserPreferencesUpsert(userId: string, preferences: UserPreferences): UserPreferencesUpsert {
  return {
    user_id: userId,
    dietary_preferences: cleanStringList(preferences.dietaryPreferences),
    cuisine_preferences: cleanStringList(preferences.cuisinePreferences),
    avoided_ingredients: cleanStringList(preferences.avoidedIngredients).map(normalizeAvoidedIngredient),
    max_prep_time_minutes:
      typeof preferences.maxPrepTimeMinutes === 'number' ? preferences.maxPrepTimeMinutes : null,
    language_code: normalizeLanguageCode(preferences.languageCode),
    updated_at: new Date().toISOString(),
  };
}

export function summarizeUserPreferences(
  preferences: UserPreferences,
  options: UserPreferencesSummaryOptions = {},
) {
  const dietaryPreferences = preferences.dietaryPreferences.map(
    (preference) => options.dietaryPreferenceLabels?.[preference] ?? preference,
  );
  const cuisinePreferences = preferences.cuisinePreferences.map(
    (preference) => options.cuisinePreferenceLabels?.[preference] ?? preference,
  );
  const avoidedIngredients = options.avoidedIngredients ?? preferences.avoidedIngredients;
  const parts = [
    dietaryPreferences.length ? dietaryPreferences.join(', ') : '',
    cuisinePreferences.length ? cuisinePreferences.join(', ') : '',
    avoidedIngredients.length ? `${options.avoidIngredientsLabel ?? 'Avoids'} ${avoidedIngredients.join(', ')}` : '',
    preferences.maxPrepTimeMinutes
      ? options.formatMaxPrepTime?.(preferences.maxPrepTimeMinutes) ?? `${preferences.maxPrepTimeMinutes} min meals`
      : '',
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : options.emptyLabel ?? 'No preferences set';
}

export function normalizeAvoidedIngredient(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function addAvoidedIngredient(preferences: UserPreferences, ingredient: string): UserPreferences {
  const normalizedIngredient = normalizeAvoidedIngredient(ingredient);

  if (!normalizedIngredient || preferences.avoidedIngredients.includes(normalizedIngredient)) {
    return preferences;
  }

  return {
    ...preferences,
    avoidedIngredients: [...preferences.avoidedIngredients, normalizedIngredient],
  };
}

export function removeAvoidedIngredient(preferences: UserPreferences, ingredient: string): UserPreferences {
  const normalizedIngredient = normalizeAvoidedIngredient(ingredient);

  return {
    ...preferences,
    avoidedIngredients: preferences.avoidedIngredients.filter((item) => item !== normalizedIngredient),
  };
}

function cleanStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}
