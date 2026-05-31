import { supabase } from '@/lib/supabase';
import {
  mapRecipeRow,
  mapSuggestedRecipesPayload,
  RecipeIngredientRow,
  RecipeRow,
} from '@/lib/recipe-persistence-mappers';
import { Recipe } from '@/types/useitup';

export async function getSavedRecipes(userId: string) {
  const { data: recipeRows, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_suggested', true)
    .order('created_at', { ascending: false })
    .limit(25);

  if (recipeError) {
    throw recipeError;
  }

  const recipes = (recipeRows as RecipeRow[]) ?? [];
  const ingredients = await getIngredientsForRecipeIds(recipes.map((recipe) => recipe.id));

  return recipes.map((recipe) => mapRecipeRow(recipe, ingredients.filter((ingredient) => ingredient.recipe_id === recipe.id)));
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
export async function replaceSuggestedRecipes(userId: string, recipes: Recipe[]) {
  const { error } = await supabase.rpc('replace_suggested_recipes', {
    p_recipes: mapSuggestedRecipesPayload(userId, recipes),
  });

  if (error) {
    throw error;
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
