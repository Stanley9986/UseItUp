import { TranslationKey } from '@/lib/i18n/translations';
import type { PantryItem } from '@/types/useitup';

// Units that map to a translation key. Recipe ingredients can also carry
// free-text units from the generator (e.g. "cups"), which are left as-is.
const translatableUnits = new Set<TranslationKey>(['count', 'portion', 'level']);

export function formatIngredientQuantity(
  value: number | null | undefined,
  unit: string | null | undefined,
  translate: (key: TranslationKey) => string,
): string {
  const unitText =
    unit && translatableUnits.has(unit as TranslationKey) ? translate(unit as TranslationKey) : unit ?? '';

  return [value, unitText].filter(Boolean).join(' ');
}

export function isDepletedPantryItem(item: PantryItem) {
  if (item.quantityUnit === 'level') {
    return item.quantityLabel === 'empty';
  }

  return (item.quantityValue ?? 0) <= 0;
}
