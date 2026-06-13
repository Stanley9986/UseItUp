import { dedupeGeneratedRecipes } from '@/lib/recipes/recipe-dedupe';
import { Recipe, RecipeIngredient } from '@/types/useitup';

export function normalizeGeneratedRecipes(data: unknown): Recipe[] {
  if (!isRecord(data) || !Array.isArray(data.recipes)) {
    return [];
  }

  // The generator occasionally returns near-identical recipes in one batch;
  // drop duplicates so the user sees distinct suggestions.
  return dedupeGeneratedRecipes(data.recipes.map(normalizeRecipe).filter(isRecipe));
}

function normalizeRecipe(value: unknown, index: number): Recipe | null {
  if (!isRecord(value) || typeof value.title !== 'string') {
    return null;
  }

  const ingredients = Array.isArray(value.ingredients)
    ? value.ingredients.map(normalizeIngredient).filter(isRecipeIngredient)
    : [];
  const missingIngredients = Array.isArray(value.missingIngredients)
    ? value.missingIngredients.filter((item): item is string => typeof item === 'string')
    : [];
  const instructions = Array.isArray(value.instructions)
    ? value.instructions.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    id: typeof value.id === 'string' && value.id ? value.id : `generated-${Date.now()}-${index}`,
    title: value.title,
    description: typeof value.description === 'string' ? value.description : undefined,
    prepTimeMinutes: typeof value.prepTimeMinutes === 'number' ? value.prepTimeMinutes : undefined,
    usesExpiringItems: typeof value.usesExpiringItems === 'boolean' ? value.usesExpiringItems : false,
    ingredients,
    missingIngredients,
    instructions,
  };
}

function normalizeIngredient(value: unknown): RecipeIngredient | null {
  if (!isRecord(value) || typeof value.name !== 'string') {
    return null;
  }

  return {
    name: value.name,
    pantryItemId: typeof value.pantryItemId === 'string' ? value.pantryItemId : undefined,
    quantityValue: typeof value.quantityValue === 'number' ? value.quantityValue : undefined,
    quantityUnit: typeof value.quantityUnit === 'string' ? value.quantityUnit : undefined,
    isAvailable: typeof value.isAvailable === 'boolean' ? value.isAvailable : false,
    isOptional: typeof value.isOptional === 'boolean' ? value.isOptional : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRecipe(value: Recipe | null): value is Recipe {
  return Boolean(value);
}

function isRecipeIngredient(value: RecipeIngredient | null): value is RecipeIngredient {
  return Boolean(value);
}
