import type { PantryItem, QuantityLabel } from '@/types/useitup';

export type PantryUpdateChoice =
  | { type: 'suggested' }
  | { type: 'all' }
  | { type: 'less'; amount: number }
  | { type: 'skip' }
  | { type: 'setLevel'; level: QuantityLabel };

export function buildPantryUpdate(item: PantryItem, choice: PantryUpdateChoice | undefined) {
  const nextChoice = choice ?? defaultChoiceForItem(item);

  if (nextChoice.type === 'skip') {
    return null;
  }

  const previousValue = item.quantityValue ?? null;
  const previousLabel = item.quantityLabel ?? null;

  if (item.quantityUnit === 'level') {
    const nextLabel = nextChoice.type === 'setLevel' ? nextChoice.level : getNextLowerLevel(previousLabel);

    return {
      amount_used: null,
      new_quantity_label: nextLabel,
      new_quantity_value: null,
      pantry_item_id: item.id,
      previous_quantity_label: previousLabel,
      previous_quantity_value: previousValue,
      unit_used: item.quantityUnit,
      update_action: nextChoice.type === 'setLevel' ? 'set_level' : 'suggested_amount',
      user_confirmed: true,
    };
  }

  const previousNumber = previousValue ?? 0;
  const amountUsed = getAmountUsed(nextChoice, previousNumber);
  const nextValue = Math.max(previousNumber - amountUsed, 0);

  return {
    amount_used: amountUsed,
    new_quantity_label: null,
    new_quantity_value: nextValue,
    pantry_item_id: item.id,
    previous_quantity_label: previousLabel,
    previous_quantity_value: previousValue,
    unit_used: item.quantityUnit,
    update_action: getUpdateAction(nextChoice),
    user_confirmed: true,
  };
}

export function defaultChoiceForItem(item: PantryItem): PantryUpdateChoice {
  if (isSlowUseLevelItem(item)) {
    return { type: 'skip' };
  }

  if (item.quantityUnit === 'level') {
    return { level: getNextLowerLevel(item.quantityLabel ?? null), type: 'setLevel' };
  }

  return { type: 'suggested' };
}

export function isSlowUseLevelItem(item: PantryItem) {
  return item.quantityUnit === 'level' && item.category?.toLowerCase() === 'condiment';
}

function getAmountUsed(choice: PantryUpdateChoice, previousNumber: number) {
  if (choice.type === 'all') {
    return previousNumber;
  }

  if (choice.type === 'less') {
    return Math.min(choice.amount, previousNumber);
  }

  return Math.min(1, previousNumber);
}

function getUpdateAction(choice: PantryUpdateChoice) {
  if (choice.type === 'all') {
    return 'used_all';
  }

  if (choice.type === 'less') {
    return 'used_less';
  }

  return 'suggested_amount';
}

function getNextLowerLevel(label: QuantityLabel | null): QuantityLabel {
  if (label === 'full') {
    return 'half';
  }

  if (label === 'half' || label === 'medium') {
    return 'low';
  }

  if (label === 'low') {
    return 'empty';
  }

  return 'low';
}
