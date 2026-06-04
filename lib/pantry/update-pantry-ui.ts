import { PantryUpdateChoice } from '@/lib/cooking/cooking-mappers';
import { QuantityLabel } from '@/types/useitup';

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
