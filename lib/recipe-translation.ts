import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { translateTerms } from '@/lib/term-translation';
import { Recipe } from '@/types/useitup';

const defaultLanguageCode = 'en';

export type RecipeTranslation = {
  title: string;
  description: string;
  instructions: string[];
  // Map of original ingredient name -> translated name.
  ingredientNames: Record<string, string>;
};

type TranslateResponse = {
  translations?: unknown;
  cache?: { hits?: number; misses?: number };
};

type ClientTranslationCacheEntry = {
  translation: RecipeTranslation;
  expiresAt: string;
};

const translationCachePrefix = 'useitup:recipe-translation-cache:';
const translationCacheTtlMs = 30 * 24 * 60 * 60 * 1000;
const memoryTranslationCache = new Map<string, ClientTranslationCacheEntry>();

// Only translate recipes whose stored source language differs from the target.
// Recipes with an unknown language (legacy rows from before language tracking)
// are left as-is rather than spending a translation call guessing.
export function shouldTranslateRecipe(recipe: Recipe, targetLanguage: string) {
  return Boolean(recipe.language) && recipe.language !== targetLanguage;
}

// Resolve translations for the recipes that need them, keyed by recipe id.
// Cache hits are served locally; every cache-miss is sent in a single batched
// request so a language switch costs at most one provider call.
export async function translateRecipes(
  recipes: Recipe[],
  targetLanguage: string,
): Promise<Record<string, RecipeTranslation>> {
  const needing = recipes.filter((recipe) => shouldTranslateRecipe(recipe, targetLanguage));

  if (!needing.length) {
    return {};
  }

  const result: Record<string, RecipeTranslation> = {};
  const uncached: Recipe[] = [];

  for (const recipe of needing) {
    const cached = await getCachedTranslation(recipe.id, targetLanguage);

    if (cached) {
      result[recipe.id] = cached;
    } else {
      uncached.push(recipe);
    }
  }

  if (uncached.length) {
    const fetched = await fetchTranslations(uncached, targetLanguage);

    await Promise.all(
      uncached.map(async (recipe) => {
        const translation = fetched[recipe.id];

        if (translation) {
          result[recipe.id] = translation;
          await setCachedTranslation(recipe.id, targetLanguage, translation);
        }
      }),
    );
  }

  return result;
}

// Produce a display copy of a recipe with translated text applied. Any field the
// translation is missing falls back to the original, so partial results never
// blank out content.
export function applyRecipeTranslation(recipe: Recipe, translation?: RecipeTranslation): Recipe {
  if (!translation) {
    return recipe;
  }

  return {
    ...recipe,
    title: translation.title || recipe.title,
    description: translation.description || recipe.description,
    instructions: translation.instructions.length ? translation.instructions : recipe.instructions,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      name: translation.ingredientNames[ingredient.name] ?? ingredient.name,
    })),
    missingIngredients: recipe.missingIngredients.map(
      (name) => translation.ingredientNames[name] ?? name,
    ),
  };
}

// Returns display-ready recipes: recipe prose translated when the source
// language differs, and ingredient/missing names translated into the active
// language via the term service. The term pass fixes names even when the recipe
// itself is already in the active language -- e.g. a recipe generated in Chinese
// that echoed English pantry names for its ingredients.
export async function prepareTranslatedRecipes(
  recipes: Recipe[],
  targetLanguage: string,
): Promise<Recipe[]> {
  const translations = await translateRecipes(recipes, targetLanguage);
  let display = recipes.map((recipe) => applyRecipeTranslation(recipe, translations[recipe.id]));

  // English is the assumed source language for item names, so only term-translate
  // for other languages to avoid needless calls in the common case.
  if (targetLanguage !== defaultLanguageCode) {
    const names = new Set<string>();
    display.forEach((recipe) => {
      recipe.ingredients.forEach((ingredient) => names.add(ingredient.name));
      recipe.missingIngredients.forEach((name) => names.add(name));
    });

    if (names.size) {
      const termMap = await translateTerms(Array.from(names), targetLanguage);
      display = display.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) => ({
          ...ingredient,
          name: termMap[ingredient.name] ?? ingredient.name,
        })),
        missingIngredients: recipe.missingIngredients.map((name) => termMap[name] ?? name),
      }));
    }
  }

  return display;
}

export function clearRecipeTranslationClientCache() {
  memoryTranslationCache.clear();
}

async function fetchTranslations(recipes: Recipe[], targetLanguage: string) {
  const { data, error } = await supabase.functions.invoke<TranslateResponse>('generate-recipes', {
    body: {
      translate: {
        targetLanguage,
        recipes: recipes.map((recipe) => ({
          title: recipe.title,
          description: recipe.description ?? '',
          instructions: recipe.instructions,
          ingredientNames: recipe.ingredients.map((ingredient) => ingredient.name),
        })),
      },
    },
  });

  if (error || !Array.isArray(data?.translations)) {
    return {} as Record<string, RecipeTranslation>;
  }

  const translations = data.translations;
  const byRecipeId: Record<string, RecipeTranslation> = {};

  recipes.forEach((recipe, index) => {
    const normalized = normalizeTranslation(translations[index]);

    if (normalized) {
      byRecipeId[recipe.id] = normalized;
    }
  });

  return byRecipeId;
}

function normalizeTranslation(value: unknown): RecipeTranslation | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const ingredientNames =
    typeof record.ingredientNames === 'object' && record.ingredientNames !== null
      ? (record.ingredientNames as Record<string, string>)
      : {};

  return {
    title: typeof record.title === 'string' ? record.title : '',
    description: typeof record.description === 'string' ? record.description : '',
    instructions: Array.isArray(record.instructions)
      ? record.instructions.filter((item): item is string => typeof item === 'string')
      : [],
    ingredientNames,
  };
}

async function getCachedTranslation(recipeId: string, targetLanguage: string) {
  const key = getCacheKey(recipeId, targetLanguage);
  const memoryEntry = memoryTranslationCache.get(key);

  if (memoryEntry && isFreshCacheEntry(memoryEntry)) {
    return memoryEntry.translation;
  }

  if (memoryEntry) {
    memoryTranslationCache.delete(key);
  }

  try {
    const storageEntry = parseCacheEntry(await AsyncStorage.getItem(getStorageKey(recipeId, targetLanguage)));

    if (!storageEntry) {
      return null;
    }

    if (!isFreshCacheEntry(storageEntry)) {
      await AsyncStorage.removeItem(getStorageKey(recipeId, targetLanguage));
      return null;
    }

    memoryTranslationCache.set(key, storageEntry);

    return storageEntry.translation;
  } catch {
    return null;
  }
}

async function setCachedTranslation(recipeId: string, targetLanguage: string, translation: RecipeTranslation) {
  const entry: ClientTranslationCacheEntry = {
    translation,
    expiresAt: new Date(Date.now() + translationCacheTtlMs).toISOString(),
  };

  memoryTranslationCache.set(getCacheKey(recipeId, targetLanguage), entry);

  try {
    await AsyncStorage.setItem(getStorageKey(recipeId, targetLanguage), JSON.stringify(entry));
  } catch {
    // Local cache writes should not block rendering translated recipes.
  }
}

function getCacheKey(recipeId: string, targetLanguage: string) {
  return `${recipeId}:${targetLanguage}`;
}

function getStorageKey(recipeId: string, targetLanguage: string) {
  return `${translationCachePrefix}${encodeURIComponent(getCacheKey(recipeId, targetLanguage))}`;
}

function isFreshCacheEntry(entry: ClientTranslationCacheEntry) {
  return new Date(entry.expiresAt).getTime() > Date.now();
}

function parseCacheEntry(rawEntry: string | null): ClientTranslationCacheEntry | null {
  if (!rawEntry) {
    return null;
  }

  try {
    const entry = JSON.parse(rawEntry) as Partial<ClientTranslationCacheEntry>;

    if (!entry.expiresAt || !entry.translation) {
      return null;
    }

    return {
      translation: entry.translation,
      expiresAt: entry.expiresAt,
    };
  } catch {
    return null;
  }
}
