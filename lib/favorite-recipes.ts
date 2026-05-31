import {
  FavoriteRecipeRow,
  mapFavoriteRecipeInsert,
  mapFavoriteRecipeRow,
} from '@/lib/favorite-recipes-mappers';
import { normalizeRecipeTitle } from '@/lib/recipe-list';
import { supabase } from '@/lib/supabase';
import { Recipe } from '@/types/useitup';

export async function getFavoriteRecipes(userId: string) {
  const { data, error } = await supabase
    .from('favorite_recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data as FavoriteRecipeRow[]) ?? []).map(mapFavoriteRecipeRow);
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
