import { createClientCache } from '@/lib/shared/client-cache';
import { supabase } from '@/lib/shared/supabase';
import { translateTerms } from '@/lib/i18n/term-translation';
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

const translationCache = createClientCache<RecipeTranslation>({
  prefix: 'useitup:recipe-translation-cache:',
  ttlMs: 30 * 24 * 60 * 60 * 1000,
  isValid: (value) => typeof value === 'object' && value !== null && typeof value.title === 'string',
});

function cacheKey(recipeId: string, targetLanguage: string) {
  return `${recipeId}:${targetLanguage}`;
}

// Translate recipes whose stored source language differs from the target. Rows
// with an unknown language (legacy data from before language tracking) are
// assumed to be English and translated when the target is another language, so
// their title/description localize like everything else.
export function shouldTranslateRecipe(recipe: Recipe, targetLanguage: string) {
  if (recipe.language) {
    return recipe.language !== targetLanguage;
  }

  return targetLanguage !== defaultLanguageCode;
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
    const cached = await translationCache.get(cacheKey(recipe.id, targetLanguage));

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
          await translationCache.set(cacheKey(recipe.id, targetLanguage), translation);
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
  translationCache.clear();
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
