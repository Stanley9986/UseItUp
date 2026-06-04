import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MockSupabaseClient } from '@/tests/helpers/createMockSupabaseClient';

const supabaseMock = vi.hoisted(() => ({ current: null as MockSupabaseClient | null }));

vi.mock('@/lib/shared/supabase', async () => {
  const { createMockSupabaseClient } = await import('@/tests/helpers/createMockSupabaseClient');
  supabaseMock.current = createMockSupabaseClient();
  return { supabase: supabaseMock.current.supabase };
});

import {
  createPantryItem,
  deletePantryItem,
  getPantryItemById,
  getPantryItems,
} from '@/lib/pantry/pantry';
import type { PantryItemRow } from '@/lib/pantry/pantry-mappers';

const pantryRow: PantryItemRow = {
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
  created_at: '2026-05-29T12:00:00Z',
  updated_at: '2026-05-29T12:00:00Z',
};

function db() {
  if (!supabaseMock.current) {
    throw new Error('Supabase mock was not initialized');
  }

  return supabaseMock.current;
}

describe('pantry data access', () => {
  beforeEach(() => {
    db().reset();
  });

  it('loads pantry items ordered by expiration date and creation date', async () => {
    db().pushQueryResult({ data: [pantryRow], error: null });

    await expect(getPantryItems('user-1')).resolves.toEqual([
      {
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
      },
    ]);

    expect(db().queries[0]).toMatchObject({ table: 'pantry_items' });
    expect(db().queries[0].calls).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'order', args: ['expiration_date', { ascending: true, nullsFirst: false }] },
      { method: 'order', args: ['created_at', { ascending: false }] },
    ]);
  });

  it('hides depleted pantry items from normal pantry reads', async () => {
    db().pushQueryResult({
      data: [
        pantryRow,
        { ...pantryRow, id: 'empty-level', quantity_label: 'empty', quantity_unit: 'level' },
        { ...pantryRow, id: 'zero-count', quantity_label: null, quantity_unit: 'count', quantity_value: 0 },
      ],
      error: null,
    });

    await expect(getPantryItems('user-1')).resolves.toEqual([
      expect.objectContaining({ id: 'item-1' }),
    ]);
  });

  it('treats a depleted pantry item detail lookup as missing', async () => {
    db().pushQueryResult({ data: { ...pantryRow, quantity_label: 'empty' }, error: null });

    await expect(getPantryItemById('user-1', 'item-1')).resolves.toBeNull();
  });

  it('returns null when a pantry item is not found', async () => {
    db().pushQueryResult({ data: null, error: null });

    await expect(getPantryItemById('user-1', 'missing-item')).resolves.toBeNull();

    expect(db().queries[0].calls).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'eq', args: ['id', 'missing-item'] },
      { method: 'maybeSingle', args: [] },
    ]);
  });

  it('inserts mapped pantry item input for the current user', async () => {
    db().pushQueryResult({ data: pantryRow, error: null });

    await createPantryItem('user-1', {
      name: '  greek   yogurt ',
      category: 'Dairy',
      storageLocation: 'fridge',
      quantityUnit: 'level',
      quantityLabel: 'half',
      expirationDate: '2026-06-01',
    });

    expect(db().queries[0].calls).toEqual([
      {
        method: 'insert',
        args: [
          {
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
          },
        ],
      },
      { method: 'select', args: ['*'] },
      { method: 'single', args: [] },
    ]);
  });

  it('throws delete errors from Supabase', async () => {
    const error = new Error('delete failed');
    db().pushQueryResult({ data: null, error });

    await expect(deletePantryItem('user-1', 'item-1')).rejects.toThrow(error);
    expect(db().queries[0].calls).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'eq', args: ['id', 'item-1'] },
    ]);
  });
});
