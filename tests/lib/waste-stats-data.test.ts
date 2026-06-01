import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MockSupabaseClient } from '@/tests/helpers/createMockSupabaseClient';

const supabaseMock = vi.hoisted(() => ({ current: null as MockSupabaseClient | null }));

vi.mock('@/lib/supabase', async () => {
  const { createMockSupabaseClient } = await import('@/tests/helpers/createMockSupabaseClient');
  supabaseMock.current = createMockSupabaseClient();
  return { supabase: supabaseMock.current.supabase };
});

import { getWasteReductionStats } from '@/lib/waste-stats';

function db() {
  if (!supabaseMock.current) {
    throw new Error('Supabase mock was not initialized');
  }

  return supabaseMock.current;
}

describe('waste stats data access', () => {
  beforeEach(() => {
    db().reset();
  });

  it('loads recent cook sessions with pantry update rows', async () => {
    db().pushQueryResult({
      data: [
        {
          cooked_at: '2026-05-30T15:00:00Z',
          id: 'cook-1',
          pantry_updates: [{ amount_used: 1, pantry_item_id: 'item-1', update_action: 'suggested_amount' }],
        },
      ],
      error: null,
    });

    await expect(getWasteReductionStats('user-1', new Date('2026-06-01T12:00:00Z'))).resolves.toEqual({
      mealsCooked: 1,
      pantryItemsUsed: 1,
      portionsUsed: 1,
      latestCookedAt: '2026-05-30T15:00:00Z',
    });

    expect(db().queries[0]).toMatchObject({ table: 'cook_sessions' });
    expect(db().queries[0].calls).toEqual([
      { method: 'select', args: ['id, cooked_at, pantry_updates(amount_used, pantry_item_id, update_action)'] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'gte', args: ['cooked_at', '2026-05-02T12:00:00.000Z'] },
      { method: 'order', args: ['cooked_at', { ascending: false }] },
      { method: 'limit', args: [50] },
    ]);
  });

  it('throws Supabase errors', async () => {
    const error = new Error('stats unavailable');
    db().pushQueryResult({ data: null, error });

    await expect(getWasteReductionStats('user-1')).rejects.toThrow(error);
  });
});
