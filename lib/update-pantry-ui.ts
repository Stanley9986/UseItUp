import { buildPantryUpdate, PantryUpdateChoice } from '@/lib/cooking-mappers';
import { PantryItem, QuantityLabel } from '@/types/useitup';

export type UpdateChoiceKey = 'suggested' | 'all' | 'less' | 'skip' | QuantityLabel;

export function choiceToKey(choice: PantryUpdateChoice): UpdateChoiceKey {
  if (choice.type === 'setLevel') {
    return choice.level;
  }

  return choice.type;
}

export function keyToChoice(value: UpdateChoiceKey): PantryUpdateChoice {
  if (value === 'all' || value === 'less' || value === 'skip' || value === 'suggested') {
    return value === 'less' ? { amount: 0.5, type: 'less' } : { type: value };
  }

  return { level: value, type: 'setLevel' };
}

export function getRemainingText(item: PantryItem, update: ReturnType<typeof buildPantryUpdate>) {
  if (!update) {
    return 'No pantry change';
  }

  if (item.quantityUnit === 'level') {
    return `Remaining: ${update.new_quantity_label}`;
  }

  return `Remaining: ${update.new_quantity_value ?? 0} ${item.quantityUnit}${update.new_quantity_value === 1 ? '' : 's'}`;
}
