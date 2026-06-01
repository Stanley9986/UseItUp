import {
  FavoriteRecipeRow,
  mapFavoriteRecipeInsert,
  mapFavoriteRecipeRow,
} from '@/lib/favorite-recipes-mappers';
import { buildPaginatedResult, getPageRange, PaginationOptions } from '@/lib/pagination';
import { normalizeRecipeTitle } from '@/lib/recipe-list';
import { supabase } from '@/lib/supabase';
import { Recipe } from '@/types/useitup';

export async function getFavoriteRecipes(userId: string) {
  const page = await getFavoriteRecipesPage(userId);
  return page.items;
}

export async function getFavoriteRecipesPage(userId: string, options: PaginationOptions = {}) {
  const range = getPageRange(options);
  const { data, error } = await supabase
    .from('favorite_recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(range.from, range.to);

  if (error) {
    throw error;
  }

  const page = buildPaginatedResult((data as FavoriteRecipeRow[]) ?? [], options);

  return {
    ...page,
    items: page.items.map(mapFavoriteRecipeRow),
  };
}

export async function getFavoriteRecipeById(userId: string, favoriteId: string) {
  const { data, error } = await supabase
    .from('favorite_recipes')
    .select('*')
    .eq('user_id', userId)
    .eq('id', favoriteId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapFavoriteRecipeRow(data as FavoriteRecipeRow) : null;
}

export async function isTitleFavorited(userId: string, title: string) {
  const { data, error } = await supabase
    .from('favorite_recipes')
    .select('id')
    .eq('user_id', userId)
    .eq('normalized_title', normalizeRecipeTitle(title))
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function addFavoriteRecipe(userId: string, recipe: Recipe) {
  const { data, error } = await supabase
    .from('favorite_recipes')
    .upsert(mapFavoriteRecipeInsert(userId, recipe), { onConflict: 'user_id,normalized_title' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapFavoriteRecipeRow(data as FavoriteRecipeRow);
}

export async function updateFavoriteRecipe(userId: string, favoriteId: string, recipe: Recipe) {
  const { data, error } = await supabase
    .from('favorite_recipes')
    .update(mapFavoriteRecipeInsert(userId, recipe))
    .eq('user_id', userId)
    .eq('id', favoriteId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapFavoriteRecipeRow(data as FavoriteRecipeRow);
}

export async function removeFavoriteRecipeByTitle(userId: string, title: string) {
  const { error } = await supabase
    .from('favorite_recipes')
    .delete()
    .eq('user_id', userId)
    .eq('normalized_title', normalizeRecipeTitle(title));

  if (error) {
    throw error;
  }
}
