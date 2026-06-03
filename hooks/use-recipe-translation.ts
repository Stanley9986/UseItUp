import { useEffect, useMemo, useState } from 'react';

import { useAppLanguage } from '@/contexts/language-context';
import {
  applyRecipeTranslation,
  RecipeTranslation,
  shouldTranslateRecipe,
  translateRecipes,
} from '@/lib/recipe-translation';
import { Recipe } from '@/types/useitup';

// Returns the recipes with translations applied for the active app language,
// plus a flag while a translation request is in flight. Recipes already in the
// active language (or with unknown source language) pass through untouched.
export function useTranslatedRecipes(recipes: Recipe[]): { recipes: Recipe[]; isTranslating: boolean } {
  const { languageCode } = useAppLanguage();
  const [translations, setTranslations] = useState<Record<string, RecipeTranslation>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  const recipeKey = useMemo(() => recipes.map((recipe) => recipe.id).join(','), [recipes]);
  const needsTranslation = useMemo(
    () => recipes.some((recipe) => shouldTranslateRecipe(recipe, languageCode)),
    [recipes, languageCode],
  );

  useEffect(() => {
    if (!needsTranslation) {
      setTranslations({});
      setIsTranslating(false);
      return;
    }

    let cancelled = false;
    setIsTranslating(true);

    translateRecipes(recipes, languageCode)
      .then((result) => {
        if (!cancelled) {
          setTranslations(result);
        }
      })
      .catch(() => {
        // On failure, fall back to the original language rather than blanking.
        if (!cancelled) {
          setTranslations({});
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsTranslating(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // recipeKey captures recipe identity; recipes is intentionally read fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeKey, languageCode, needsTranslation]);

  const translated = useMemo(
    () => recipes.map((recipe) => applyRecipeTranslation(recipe, translations[recipe.id])),
    [recipes, translations],
  );

  return { recipes: translated, isTranslating };
}

export function useTranslatedRecipe(recipe: Recipe | null): { recipe: Recipe | null; isTranslating: boolean } {
  const list = useMemo(() => (recipe ? [recipe] : []), [recipe]);
  const { recipes, isTranslating } = useTranslatedRecipes(list);

  return { recipe: recipes[0] ?? null, isTranslating };
}
