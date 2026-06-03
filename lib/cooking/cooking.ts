import { supabase } from '@/lib/shared/supabase';
import { buildPantryUpdate, defaultChoiceForItem } from '@/lib/cooking/cooking-mappers';
import type { PantryUpdateChoice } from '@/lib/cooking/cooking-mappers';
import type { PantryItem, Recipe } from '@/types/useitup';

export { buildPantryUpdate, defaultChoiceForItem };
export type { PantryUpdateChoice } from '@/lib/cooking/cooking-mappers';

type CookRecipeInput = {
  pantryItems: PantryItem[];
  recipe: Recipe;
  choices: Record<string, PantryUpdateChoice>;
  userId: string;
};

export async function cookRecipeAndUpdatePantry({ choices, pantryItems, recipe, userId }: CookRecipeInput) {
  const updates = pantryItems
    .map((item) => buildPantryUpdate(item, choices[item.id]))
    .filter((update): update is NonNullable<typeof update> => Boolean(update));

  const { data: cookSession, error: cookSessionError } = await supabase
    .from('cook_sessions')
    .insert({ recipe_id: recipe.id, user_id: userId })
    .select('id')
    .single();

  if (cookSessionError) {
    throw cookSessionError;
  }

  for (const update of updates) {
    const { error: pantryError } = await supabase
      .from('pantry_items')
      .update({
        quantity_label: update.new_quantity_label,
        quantity_value: update.new_quantity_value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', update.pantry_item_id)
      .eq('user_id', userId);

    if (pantryError) {
      throw pantryError;
    }
  }

  if (updates.length) {
    const { error: updateError } = await supabase.from('pantry_updates').insert(
      updates.map((update) => ({
        ...update,
        cook_session_id: cookSession.id,
      })),
    );

    if (updateError) {
      throw updateError;
    }
  }

  return { cookSessionId: cookSession.id, updateCount: updates.length };
}
