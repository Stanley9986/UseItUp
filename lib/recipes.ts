import { supabase } from '@/lib/supabase';
import {
  mapRecipeIngredientInsert,
  mapRecipeInsert,
  mapRecipeRow,
  RecipeIngredientRow,
  RecipeRow,
} from '@/lib/recipe-persistence-mappers';
import { Recipe } from '@/types/useitup';

export async function getSavedRecipes(userId: string) {
  const { data: recipeRows, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
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

export async function saveGeneratedRecipes(userId: string, recipes: Recipe[]) {
  const savedRecipes: Recipe[] = [];

  for (const recipe of recipes) {
    const { data: recipeRow, error: recipeError } = await supabase
      .from('recipes')
      .insert(mapRecipeInsert(userId, recipe))
      .select('*')
      .single();

    if (recipeError) {
      throw recipeError;
    }

    const ingredientRows = recipe.ingredients.map((ingredient, index) =>
      mapRecipeIngredientInsert((recipeRow as RecipeRow).id, ingredient, index),
    );

    if (ingredientRows.length) {
      const { error: ingredientError } = await supabase.from('recipe_ingredients').insert(ingredientRows);

      if (ingredientError) {
        throw ingredientError;
      }
    }

    savedRecipes.push(await getSavedRecipeById(userId, (recipeRow as RecipeRow).id).then((saved) => saved ?? recipe));
  }

  return savedRecipes;
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
