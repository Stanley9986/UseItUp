import { normalizeRecipeTitle } from '@/lib/recipes/recipe-list';
import { Recipe, RecipeIngredient } from '@/types/useitup';

export type FavoriteRecipeEditInput = {
  availableIngredientsText: string;
  description: string;
  instructionsText: string;
  missingIngredientsText: string;
  prepTimeMinutes: string;
  title: string;
  usesExpiringItems: boolean;
};

export function getFavoriteRecipeEditInput(recipe: Recipe): FavoriteRecipeEditInput {
  return {
    availableIngredientsText: recipe.ingredients
      .filter((ingredient) => ingredient.isAvailable)
      .map((ingredient) => ingredient.name)
      .join('\n'),
    description: recipe.description ?? '',
    instructionsText: recipe.instructions.join('\n'),
    missingIngredientsText: recipe.ingredients
      .filter((ingredient) => !ingredient.isAvailable)
      .map((ingredient) => ingredient.name)
      .join('\n'),
    prepTimeMinutes: recipe.prepTimeMinutes ? String(recipe.prepTimeMinutes) : '',
    title: recipe.title,
    usesExpiringItems: Boolean(recipe.usesExpiringItems),
  };
}

export function buildEditedFavoriteRecipe(originalRecipe: Recipe, input: FavoriteRecipeEditInput): Recipe {
  const title = input.title.trim();
  const instructions = parseRecipeLines(input.instructionsText);
  const availableIngredients = buildEditedIngredients(originalRecipe, input.availableIngredientsText, true);
  const missingIngredients = buildEditedIngredients(originalRecipe, input.missingIngredientsText, false);
  const prepTimeMinutes = parsePrepTime(input.prepTimeMinutes);

  return {
    ...originalRecipe,
    title,
    description: input.description.trim() || undefined,
    prepTimeMinutes,
    usesExpiringItems: input.usesExpiringItems,
    ingredients: [...availableIngredients, ...missingIngredients],
    missingIngredients: missingIngredients.map((ingredient) => ingredient.name),
    instructions,
  };
}

export function validateFavoriteRecipeEditInput(input: FavoriteRecipeEditInput) {
  if (!input.title.trim()) {
    return 'Add a recipe title before saving.';
  }

  if (!parseRecipeLines(input.availableIngredientsText).length && !parseRecipeLines(input.missingIngredientsText).length) {
    return 'Add at least one ingredient before saving.';
  }

  if (!parseRecipeLines(input.instructionsText).length) {
    return 'Add at least one instruction before saving.';
  }

  if (input.prepTimeMinutes.trim()) {
    const prepTime = Number(input.prepTimeMinutes);

    if (!Number.isInteger(prepTime) || prepTime < 1) {
      return 'Prep time must be a whole number of minutes.';
    }
  }

  return '';
}

export function parseRecipeLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildEditedIngredients(recipe: Recipe, value: string, isAvailable: boolean): RecipeIngredient[] {
  const originalIngredients = new Map(
    recipe.ingredients.map((ingredient) => [normalizeRecipeTitle(ingredient.name), ingredient]),
  );

  return parseRecipeLines(value).map((name) => {
    const originalIngredient = originalIngredients.get(normalizeRecipeTitle(name));

    return {
      ...originalIngredient,
      name,
      isAvailable,
    };
  });
}

function parsePrepTime(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  return Number(value);
}
