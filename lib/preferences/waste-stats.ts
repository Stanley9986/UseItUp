import { supabase } from '@/lib/shared/supabase';
import { CookSessionStatsRow, summarizeWasteReductionStats } from '@/lib/preferences/waste-stats-mappers';
export type { WasteReductionStats } from '@/lib/preferences/waste-stats-mappers';

const RECENT_DAYS = 30;

export async function getWasteReductionStats(userId: string, now = new Date()) {
  const since = new Date(now);
  since.setDate(since.getDate() - RECENT_DAYS);

  const { data, error } = await supabase
    .from('cook_sessions')
    .select('id, cooked_at, pantry_updates(amount_used, pantry_item_id, update_action)')
    .eq('user_id', userId)
    .gte('cooked_at', since.toISOString())
    .order('cooked_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return summarizeWasteReductionStats((data as CookSessionStatsRow[]) ?? []);
}
