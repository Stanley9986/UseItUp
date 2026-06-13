import { describe, expect, it } from 'vitest';

import {
  isDuplicatePantryItemError,
  mapPantryItemInput,
  mapPantryItemRow,
  normalizePantryName,
  PantryItemRow,
} from '@/lib/pantry/pantry-mappers';
import { isDepletedPantryItem } from '@/lib/pantry/quantity';

describe('normalizePantryName', () => {
  it('trims, lowercases, and collapses spaces', () => {
    expect(normalizePantryName('  Ribeye   Steak  ')).toBe('ribeye steak');
    expect(normalizePantryName('STEAK')).toBe('steak');
  });
});

describe('isDuplicatePantryItemError', () => {
  it('detects Postgres unique constraint errors', () => {
    expect(isDuplicatePantryItemError({ code: '23505' })).toBe(true);
    expect(isDuplicatePantryItemError({ code: '42501' })).toBe(false);
  });
});

describe('mapPantryItemRow', () => {
  it('maps database rows to app pantry items', () => {
    const row: PantryItemRow = {
      id: 'item-1',
      user_id: 'user-1',
      name: 'Greek Yogurt',
      normalized_name: 'greek yogurt',
      category: 'dairy',
      storage_location: 'fridge',
      quantity_value: null,
      quantity_unit: 'level',
      quantity_label: 'half',
      expiration_date: '2026-06-01',
      notes: null,
      language: 'zh',
      created_at: '2026-05-29T12:00:00Z',
      updated_at: '2026-05-29T12:00:00Z',
    };

    expect(mapPantryItemRow(row)).toEqual({
      id: 'item-1',
      name: 'Greek Yogurt',
      normalizedName: 'greek yogurt',
      category: 'dairy',
      storageLocation: 'fridge',
      quantityValue: undefined,
      quantityUnit: 'level',
      quantityLabel: 'half',
      expirationDate: '2026-06-01',
      notes: undefined,
      language: 'zh',
    });
  });

  it('leaves language undefined for legacy rows', () => {
    const row: PantryItemRow = {
      id: 'item-2',
      user_id: 'user-1',
      name: 'Spinach',
      normalized_name: 'spinach',
      category: null,
      storage_location: 'fridge',
      quantity_value: 1,
      quantity_unit: 'portion',
      quantity_label: null,
      expiration_date: null,
      notes: null,
      language: null,
      created_at: '2026-05-29T12:00:00Z',
      updated_at: '2026-05-29T12:00:00Z',
    };

    expect(mapPantryItemRow(row).language).toBeUndefined();
  });
});

describe('mapPantryItemInput', () => {
  it('maps app input to database insert/update shape', () => {
    expect(
      mapPantryItemInput({
        name: '  spinach   leaves ',
        category: 'Produce',
        storageLocation: 'fridge',
        quantityUnit: 'level',
        quantityLabel: 'medium',
        expirationDate: '2026-06-01',
        notes: '  wash before using  ',
      }),
    ).toEqual({
      name: 'Spinach Leaves',
      normalized_name: 'spinach leaves',
      category: 'produce',
      storage_location: 'fridge',
      quantity_value: null,
      quantity_unit: 'level',
      quantity_label: 'medium',
      expiration_date: '2026-06-01',
      notes: 'wash before using',
      language: null,
    });
  });

  it('passes the entered source language through', () => {
    expect(
      mapPantryItemInput({
        name: '西红柿',
        storageLocation: 'fridge',
        quantityUnit: 'portion',
        quantityValue: 2,
        language: 'zh',
      }).language,
    ).toBe('zh');
  });
});

describe('isDepletedPantryItem', () => {
  it('detects zero numeric quantities and empty levels', () => {
    expect(
      isDepletedPantryItem({
        id: 'zero',
        name: 'Lemon',
        quantityUnit: 'portion',
        quantityValue: 0,
        storageLocation: 'fridge',
      }),
    ).toBe(true);
    expect(
      isDepletedPantryItem({
        id: 'empty',
        name: 'Soy Sauce',
        quantityUnit: 'level',
        quantityLabel: 'empty',
        storageLocation: 'pantry',
      }),
    ).toBe(true);
    expect(
      isDepletedPantryItem({
        id: 'available',
        name: 'Spinach',
        quantityUnit: 'portion',
        quantityValue: 1,
        storageLocation: 'fridge',
      }),
    ).toBe(false);
  });
});
