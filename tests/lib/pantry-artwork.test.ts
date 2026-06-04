import { describe, expect, it } from 'vitest';

import { getPantryArtwork, getPantryImageSearchQuery } from '@/lib/pantry/pantry-artwork';
import type { PantryItem } from '@/types/useitup';

function pantryItemWith(parts: Partial<PantryItem>): PantryItem {
  return {
    id: 'item-1',
    name: 'Spinach',
    storageLocation: 'fridge',
    quantityUnit: 'count',
    quantityValue: 1,
    ...parts,
  };
}

describe('getPantryArtwork', () => {
  it('selects produce artwork from item names', () => {
    expect(getPantryArtwork(pantryItemWith({ name: 'Broccoli' })).category).toBe('produce');
  });

  it('selects dairy artwork from item categories', () => {
    expect(getPantryArtwork(pantryItemWith({ category: 'dairy', name: 'Half and half' })).category).toBe('dairy');
  });

  it('prioritizes specific ingredient matches over generic categories', () => {
    expect(getPantryArtwork(pantryItemWith({ category: 'produce', name: 'Steak strips' })).category).toBe('meat');
  });

  it('falls back to pantry artwork', () => {
    expect(getPantryArtwork(pantryItemWith({ name: 'Mystery jar' })).category).toBe('pantry');
  });

  it('does not include a remote image for category fallbacks', () => {
    expect(getPantryArtwork(pantryItemWith({ name: 'Mystery jar' })).imageUrl).toBeUndefined();
  });
});

describe('getPantryImageSearchQuery', () => {
  it('builds a stock image query from the item name and category', () => {
    expect(getPantryImageSearchQuery(pantryItemWith({ category: 'produce', name: 'Baby Spinach' }))).toBe(
      'Baby Spinach produce food ingredient',
    );
  });
});
