import { describe, expect, it } from 'vitest';

import { buildPantryUpdate } from '@/lib/cooking-mappers';
import { choiceToKey, getRemainingText, keyToChoice } from '@/lib/update-pantry-ui';
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

describe('update pantry choice helpers', () => {
  it('maps update choice objects to chip keys', () => {
    expect(choiceToKey({ type: 'suggested' })).toBe('suggested');
    expect(choiceToKey({ level: 'low', type: 'setLevel' })).toBe('low');
  });

  it('maps chip keys back to update choices', () => {
    expect(keyToChoice('skip')).toEqual({ type: 'skip' });
    expect(keyToChoice('less')).toEqual({ amount: 0.5, type: 'less' });
    expect(keyToChoice('empty')).toEqual({ level: 'empty', type: 'setLevel' });
  });
});

describe('getRemainingText', () => {
  it('formats numeric remaining quantities', () => {
    expect(getRemainingText(steak, buildPantryUpdate(steak, { type: 'suggested' }))).toBe('Remaining: 1 portion');
    expect(getRemainingText(steak, buildPantryUpdate(steak, { type: 'all' }))).toBe('Remaining: 0 portions');
  });

  it('formats level remaining quantities', () => {
    expect(getRemainingText(rice, buildPantryUpdate(rice, { level: 'low', type: 'setLevel' }))).toBe(
      'Remaining: low',
    );
  });

  it('formats skipped updates', () => {
    expect(getRemainingText(steak, buildPantryUpdate(steak, { type: 'skip' }))).toBe('No pantry change');
  });
});
