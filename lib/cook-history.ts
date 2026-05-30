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
