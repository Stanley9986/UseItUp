import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import {
  isDuplicatePantryItemError,
  mapPantryItemInput,
  mapPantryItemRow,
  normalizePantryName,
  PantryItemInput,
  PantryItemRow,
} from '@/lib/pantry-mappers';

export {
  getErrorMessage,
  isDuplicatePantryItemError,
  mapPantryItemInput,
  mapPantryItemRow,
  normalizePantryName,
};

export type CreatePantryItemInput = PantryItemInput;

export type UpdatePantryItemInput = CreatePantryItemInput;

export async function getPantryItems(userId: string) {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
    .order('expiration_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as PantryItemRow[]).map(mapPantryItemRow);
}

export async function getPantryItemById(userId: string, itemId: string) {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPantryItemRow(data as PantryItemRow) : null;
}

export async function createPantryItem(userId: string, input: CreatePantryItemInput) {
  const normalizedName = normalizePantryName(input.name);

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({ user_id: userId, ...mapPantryItemInput(input) })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapPantryItemRow(data as PantryItemRow);
}

export async function updatePantryItem(userId: string, itemId: string, input: UpdatePantryItemInput) {
  const { data, error } = await supabase
    .from('pantry_items')
    .update({
      ...mapPantryItemInput(input),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapPantryItemRow(data as PantryItemRow);
}

export async function deletePantryItem(userId: string, itemId: string) {
  const { error } = await supabase.from('pantry_items').delete().eq('user_id', userId).eq('id', itemId);

  if (error) {
    throw error;
  }
}
