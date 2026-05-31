import {
  defaultUserPreferences,
  mapUserPreferencesRow,
  mapUserPreferencesUpsert,
  UserPreferencesRow,
} from '@/lib/user-preferences-mappers';
import { supabase } from '@/lib/supabase';
import { UserPreferences } from '@/types/useitup';

export async function getUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapUserPreferencesRow((data as UserPreferencesRow | null) ?? null);
}

export async function saveUserPreferences(userId: string, preferences: UserPreferences) {
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(mapUserPreferencesUpsert(userId, preferences), { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapUserPreferencesRow(data as UserPreferencesRow);
}

export { defaultUserPreferences };
