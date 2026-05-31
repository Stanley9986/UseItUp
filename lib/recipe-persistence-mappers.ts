import { Recipe, RecipeIngredient } from '@/types/useitup';

export type RecipeRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  instructions: unknown;
  prep_time_minutes: number | null;
  uses_expiring_items: boolean;
  is_suggested: boolean;
  created_by_ai: boolean;
  source: string;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredientRow = {
  id: string;
  recipe_id: string;
  pantry_item_id: string | null;
  name: string;
  quantity_value: number | null;
  quantity_unit: string | null;
  is_available: boolean;
  is_optional: boolean;
  sort_order: number;
  created_at: string;
};

export function mapRecipeRow(row: RecipeRow, ingredientRows: RecipeIngredientRow[] = []): Recipe {
  const ingredients = ingredientRows
    .sort((left, right) => left.sort_order - right.sort_order)
    .map(mapRecipeIngredientRow);

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    prepTimeMinutes: row.prep_time_minutes ?? undefined,
    usesExpiringItems: row.uses_expiring_items,
    ingredients,
    missingIngredients: ingredients.filter((ingredient) => !ingredient.isAvailable).map((ingredient) => ingredient.name),
    instructions: normalizeInstructions(row.instructions),
  };
}

export function mapRecipeInsert(userId: string, recipe: Recipe) {
  return {
    user_id: userId,
    title: recipe.title.trim(),
    description: recipe.description?.trim() || null,
    instructions: recipe.instructions,
    prep_time_minutes: recipe.prepTimeMinutes ?? null,
    uses_expiring_items: Boolean(recipe.usesExpiringItems),
    is_suggested: true,
    created_by_ai: true,
    source: 'ai',
  };
}

export function mapRecipeIngredientInsert(recipeId: string, ingredient: RecipeIngredient, index: number) {
  return {
    recipe_id: recipeId,
    pantry_item_id: ingredient.pantryItemId ?? null,
    name: ingredient.name.trim(),
    quantity_value: ingredient.quantityValue ?? null,
    quantity_unit: ingredient.quantityUnit ?? null,
    is_available: ingredient.isAvailable,
    is_optional: Boolean(ingredient.isOptional),
    sort_order: index,
  };
}

// Payload for the replace_suggested_recipes RPC. The function assigns its own
// user_id (from auth.uid()) and recipe_id, so those keys are omitted here.
export function mapSuggestedRecipesPayload(userId: string, recipes: Recipe[]) {
  return recipes.map((recipe) => {
    const { user_id, ...recipeInsert } = mapRecipeInsert(userId, recipe);
    void user_id;

    return {
      ...recipeInsert,
      ingredients: recipe.ingredients.map((ingredient, index) => {
        const { recipe_id, ...ingredientInsert } = mapRecipeIngredientInsert('', ingredient, index);
        void recipe_id;

        return ingredientInsert;
      }),
    };
  });
}

function mapRecipeIngredientRow(row: RecipeIngredientRow): RecipeIngredient {
  return {
    name: row.name,
    pantryItemId: row.pantry_item_id ?? undefined,
    quantityValue: row.quantity_value ?? undefined,
    quantityUnit: row.quantity_unit ?? undefined,
    isAvailable: row.is_available,
    isOptional: row.is_optional,
  };
}

function normalizeInstructions(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
