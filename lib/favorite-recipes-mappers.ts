import { normalizeRecipeTitle } from '@/lib/recipe-list';
import { Recipe, RecipeIngredient } from '@/types/useitup';

export type FavoriteRecipeRow = {
  id: string;
  user_id: string;
  title: string;
  normalized_title: string;
  description: string | null;
  instructions: unknown;
  ingredients: unknown;
  prep_time_minutes: number | null;
  uses_expiring_items: boolean;
  language?: string | null;
  created_at: string;
};

export function mapFavoriteRecipeRow(row: FavoriteRecipeRow): Recipe {
  const ingredients = normalizeIngredients(row.ingredients);

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    prepTimeMinutes: row.prep_time_minutes ?? undefined,
    usesExpiringItems: row.uses_expiring_items,
    isFavorite: true,
    ingredients,
    missingIngredients: ingredients
      .filter((ingredient) => !ingredient.isAvailable)
      .map((ingredient) => ingredient.name),
    instructions: normalizeInstructions(row.instructions),
    language: row.language ?? undefined,
  };
}

export function mapFavoriteRecipeInsert(userId: string, recipe: Recipe) {
  return {
    user_id: userId,
    title: recipe.title.trim(),
    normalized_title: normalizeRecipeTitle(recipe.title),
    description: recipe.description?.trim() || null,
    instructions: recipe.instructions,
    ingredients: recipe.ingredients,
    prep_time_minutes: recipe.prepTimeMinutes ?? null,
    uses_expiring_items: Boolean(recipe.usesExpiringItems),
    language: recipe.language ?? null,
  };
}

function normalizeIngredients(value: unknown): RecipeIngredient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name : '',
      pantryItemId: typeof item.pantryItemId === 'string' ? item.pantryItemId : undefined,
      quantityValue: typeof item.quantityValue === 'number' ? item.quantityValue : undefined,
      quantityUnit: typeof item.quantityUnit === 'string' ? item.quantityUnit : undefined,
      isAvailable: Boolean(item.isAvailable),
      isOptional: Boolean(item.isOptional),
    }))
    .filter((ingredient) => ingredient.name.length > 0);
}

function normalizeInstructions(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
