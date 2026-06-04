import { describe, expect, it } from 'vitest';

import { buildPantryUpdate, defaultChoiceForItem } from '@/lib/cooking/cooking-mappers';
import type { PantryItem } from '@/types/useitup';

const steak: PantryItem = {
  id: 'steak',
  name: 'Steak',
  quantityUnit: 'portion',
  quantityValue: 2,
  storageLocation: 'fridge',
};

const rice: PantryItem = {
  id: 'rice',
  name: 'Rice',
  quantityLabel: 'medium',
  quantityUnit: 'level',
  storageLocation: 'pantry',
};

const soySauce: PantryItem = {
  id: 'soy-sauce',
  category: 'condiment',
  name: 'Soy Sauce',
  quantityLabel: 'full',
  quantityUnit: 'level',
  storageLocation: 'pantry',
};

describe('buildPantryUpdate', () => {
  it('subtracts suggested amount from count and portion items', () => {
    expect(buildPantryUpdate(steak, { type: 'suggested' })).toMatchObject({
      amount_used: 1,
      new_quantity_value: 1,
      pantry_item_id: 'steak',
      previous_quantity_value: 2,
      update_action: 'suggested_amount',
    });
  });

  it('handles used all for numeric quantities', () => {
    expect(buildPantryUpdate(steak, { type: 'all' })).toMatchObject({
      amount_used: 2,
      new_quantity_value: 0,
      update_action: 'used_all',
    });
  });

  it('sets lower labels for level quantities', () => {
    expect(buildPantryUpdate(rice, { level: 'low', type: 'setLevel' })).toMatchObject({
      new_quantity_label: 'low',
      previous_quantity_label: 'medium',
      update_action: 'set_level',
    });
  });

  it('skips updates when selected', () => {
    expect(buildPantryUpdate(steak, { type: 'skip' })).toBeNull();
  });
});

describe('defaultChoiceForItem', () => {
  it('uses suggested amount for numeric quantities', () => {
    expect(defaultChoiceForItem(steak)).toEqual({ type: 'suggested' });
  });

  it('uses a lower level for level quantities', () => {
    expect(defaultChoiceForItem(rice)).toEqual({ level: 'low', type: 'setLevel' });
  });

  it('defaults condiment levels to no change', () => {
    expect(defaultChoiceForItem(soySauce)).toEqual({ type: 'skip' });
  });
});
