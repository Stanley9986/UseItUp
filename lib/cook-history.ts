import { mapCookHistoryRow, CookSessionWithRecipeRow } from '@/lib/cook-history-mappers';
import { supabase } from '@/lib/supabase';

export async function getCookHistory(userId: string) {
  const { data, error } = await supabase
    .from('cook_sessions')
    .select('id, recipe_id, cooked_at, recipes(title)')
    .eq('user_id', userId)
    .order('cooked_at', { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return ((data as CookSessionWithRecipeRow[]) ?? []).map(mapCookHistoryRow);
}

// Removes a single cooked-history entry. pantry_updates rows cascade on delete,
// and the recipe row is left intact.
export async function deleteCookSession(userId: string, sessionId: string) {
  const { error } = await supabase
    .from('cook_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('id', sessionId);

  if (error) {
    throw error;
  }
}
