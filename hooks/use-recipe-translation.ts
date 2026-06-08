import { useEffect, useMemo, useState } from 'react';

import { useAppLanguage } from '@/contexts/language-context';
import { getRecipeTranslationSignature, prepareTranslatedRecipesWithStatus } from '@/lib/recipes/recipe-translation';
import { Recipe } from '@/types/useitup';

// Returns the recipes prepared for display in the active app language (recipe
// prose translated when needed, plus ingredient names translated via the term
// service), with a flag while a translation request is in flight.
export function useTranslatedRecipes(
  recipes: Recipe[],
): { recipes: Recipe[]; isTranslating: boolean; recipeTranslationFailed: boolean } {
  const { languageCode } = useAppLanguage();
  const [display, setDisplay] = useState<Recipe[]>(recipes);
  const [isTranslating, setIsTranslating] = useState(false);
  const [recipeTranslationFailed, setRecipeTranslationFailed] = useState(false);

  const recipeKey = useMemo(
    () => recipes.map(getRecipeTranslationSignature).join('|'),
    [recipes],
  );

  useEffect(() => {
    let cancelled = false;
    setIsTranslating(true);

    prepareTranslatedRecipesWithStatus(recipes, languageCode)
      .then((result) => {
        if (!cancelled) {
          setDisplay(result.recipes);
          setRecipeTranslationFailed(result.recipeTranslationFailed);
        }
      })
      .catch(() => {
        // On failure, fall back to the originals rather than blanking.
        if (!cancelled) {
          setDisplay(recipes);
          setRecipeTranslationFailed(true);
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
  }, [recipeKey, languageCode]);

  // Only use the prepared set when it matches the current recipes; otherwise show
  // the originals until the new translation resolves.
  const aligned = useMemo(() => {
    if (display.length === recipes.length && display.every((item, index) => item.id === recipes[index].id)) {
      return display;
    }

    return recipes;
  }, [display, recipes]);

  return { recipes: aligned, isTranslating, recipeTranslationFailed };
}

export function useTranslatedRecipe(
  recipe: Recipe | null,
): { recipe: Recipe | null; isTranslating: boolean; recipeTranslationFailed: boolean } {
  const list = useMemo(() => (recipe ? [recipe] : []), [recipe]);
  const { recipes, isTranslating, recipeTranslationFailed } = useTranslatedRecipes(list);

  return { recipe: recipes[0] ?? null, isTranslating, recipeTranslationFailed };
}
