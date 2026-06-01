import {
  mapShoppingListItemInsert,
  mapShoppingListItemRow,
  ShoppingListItemRow,
  uniqueMissingIngredients,
} from '@/lib/shopping-list-mappers';
import { supabase } from '@/lib/supabase';

export async function getShoppingListItems(userId: string) {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('user_id', userId)
    .order('is_checked', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data as ShoppingListItemRow[]) ?? []).map(mapShoppingListItemRow);
}

export async function addShoppingListItemsFromRecipe({
  ingredients,
  recipeId,
  recipeTitle,
  userId,
}: {
  ingredients: string[];
  recipeId?: string;
  recipeTitle?: string;
  userId: string;
}) {
  const uniqueIngredients = uniqueMissingIngredients(ingredients);

  if (!uniqueIngredients.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('shopping_list_items')
    .upsert(
      uniqueIngredients.map((name) =>
        mapShoppingListItemInsert({
          name,
          recipeId,
          recipeTitle,
          userId,
        }),
      ),
      { onConflict: 'user_id,normalized_name' },
    )
    .select('*');

  if (error) {
    throw error;
  }

  return ((data as ShoppingListItemRow[]) ?? []).map(mapShoppingListItemRow);
}

export async function updateShoppingListItemChecked(userId: string, itemId: string, isChecked: boolean) {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .update({ is_checked: isChecked, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapShoppingListItemRow(data as ShoppingListItemRow);
}

export async function deleteShoppingListItem(userId: string, itemId: string) {
  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('user_id', userId)
    .eq('id', itemId);

  if (error) {
    throw error;
  }
}
