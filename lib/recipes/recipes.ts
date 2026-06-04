import { supabase } from '@/lib/shared/supabase';
import { buildPaginatedResult, getPageRange, PaginationOptions } from '@/lib/shared/pagination';
import {
  mapRecipeRow,
  mapRecipeIngredientInsert,
  mapRecipeInsert,
  mapSavedRecipeUpdatePayload,
  mapSuggestedRecipesPayload,
  RecipeIngredientRow,
  RecipeRow,
} from '@/lib/recipes/recipe-persistence-mappers';
import { Recipe } from '@/types/useitup';

export async function getSavedRecipes(userId: string) {
  const page = await getSavedRecipesPage(userId);
  return page.items;
}

export async function getSavedRecipesPage(userId: string, options: PaginationOptions = {}) {
  const range = getPageRange(options);
  const { data: recipeRows, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_suggested', true)
    .order('created_at', { ascending: false })
    .range(range.from, range.to);

  if (recipeError) {
    throw recipeError;
  }

  const page = buildPaginatedResult((recipeRows as RecipeRow[]) ?? [], options);
  const ingredients = await getIngredientsForRecipeIds(page.items.map((recipe) => recipe.id));

  return {
    ...page,
    items: page.items.map((recipe) => mapRecipeRow(recipe, ingredients.filter((ingredient) => ingredient.recipe_id === recipe.id))),
  };
}

export async function getSavedRecipeById(userId: string, recipeId: string) {
  const { data: recipeRow, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .eq('id', recipeId)
    .maybeSingle();

  if (recipeError) {
    throw recipeError;
  }

  if (!recipeRow) {
    return null;
  }

  const ingredients = await getIngredientsForRecipeIds([recipeId]);

  return mapRecipeRow(recipeRow as RecipeRow, ingredients);
}

// Suggestions are pantry-derived and replaced on every regenerate. A single
// RPC demotes the previous batch and inserts the new one in one transaction, so
// a failure can never wipe or partially replace the current suggestions.
// Demoting (rather than deleting) keeps rows referenced by cook history alive.
export async function replaceSuggestedRecipes(userId: string, recipes: Recipe[], language?: string) {
  const { error } = await supabase.rpc('replace_suggested_recipes', {
    p_recipes: mapSuggestedRecipesPayload(userId, recipes),
  });

  if (error) {
    throw error;
  }

  // The whole batch was generated in one language. The RPC assigns its own ids,
  // so stamp the language on the freshly inserted suggested rows in one update
  // rather than threading it through the RPC.
  if (language) {
    const { error: languageError } = await supabase
      .from('recipes')
      .update({ language })
      .eq('user_id', userId)
      .eq('is_suggested', true);

    if (languageError) {
      throw languageError;
    }
  }

  return getSavedRecipes(userId);
}

// Removing a suggestion from the list demotes it rather than hard-deleting,
// because cook_sessions.recipe_id cascades on delete and would take the recipe's
// cook history with it. Demoting keeps the row referencable by history.
export async function dismissSuggestedRecipe(userId: string, recipeId: string) {
  const { error } = await supabase
    .from('recipes')
    .update({ is_suggested: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', recipeId);

  if (error) {
    throw error;
  }
}

export async function createSavedRecipeFromSnapshot(userId: string, recipe: Recipe) {
  const { data: recipeRow, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      ...mapRecipeInsert(userId, recipe),
      created_by_ai: false,
      is_suggested: false,
      source: 'user_saved',
    })
    .select('*')
    .single();

  if (recipeError) {
    throw recipeError;
  }

  const savedRecipeRow = recipeRow as RecipeRow;

  if (recipe.ingredients.length) {
    const { error: ingredientError } = await supabase
      .from('recipe_ingredients')
      .insert(recipe.ingredients.map((ingredient, index) => mapRecipeIngredientInsert(savedRecipeRow.id, ingredient, index)));

    if (ingredientError) {
      throw ingredientError;
    }
  }

  return mapRecipeRow(savedRecipeRow, recipe.ingredients.map((ingredient, index) => ({
    id: `${savedRecipeRow.id}-${index}`,
    recipe_id: savedRecipeRow.id,
    pantry_item_id: ingredient.pantryItemId ?? null,
    name: ingredient.name,
    quantity_value: ingredient.quantityValue ?? null,
    quantity_unit: ingredient.quantityUnit ?? null,
    is_available: ingredient.isAvailable,
    is_optional: Boolean(ingredient.isOptional),
    sort_order: index,
    created_at: savedRecipeRow.created_at,
  })));
}

export async function updateSavedRecipe(userId: string, recipeId: string, recipe: Recipe) {
  const { error } = await supabase.rpc('update_saved_recipe', {
    p_recipe_id: recipeId,
    p_recipe: mapSavedRecipeUpdatePayload(userId, recipe),
  });

  if (error) {
    throw error;
  }

  return getSavedRecipeById(userId, recipeId);
}

async function getIngredientsForRecipeIds(recipeIds: string[]) {
  if (!recipeIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .in('recipe_id', recipeIds)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data as RecipeIngredientRow[]) ?? [];
}
