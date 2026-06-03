import { describe, expect, it } from 'vitest';

import { summarizeWasteReductionStats } from '@/lib/preferences/waste-stats-mappers';

describe('summarizeWasteReductionStats', () => {
  it('summarizes recent cooking sessions and pantry updates', () => {
    expect(
      summarizeWasteReductionStats([
        {
          cooked_at: '2026-05-30T15:00:00Z',
          id: 'cook-2',
          pantry_updates: [
            { amount_used: '1.5', pantry_item_id: 'item-1', update_action: 'suggested_amount' },
            { amount_used: null, pantry_item_id: 'item-2', update_action: 'set_level' },
            { amount_used: 1, pantry_item_id: 'item-3', update_action: 'skipped' },
          ],
        },
        {
          cooked_at: '2026-05-29T15:00:00Z',
          id: 'cook-1',
          pantry_updates: { amount_used: 2, pantry_item_id: 'item-4', update_action: 'used_all' },
        },
      ]),
    ).toEqual({
      mealsCooked: 2,
      pantryItemsUsed: 3,
      portionsUsed: 3.5,
      latestCookedAt: '2026-05-30T15:00:00Z',
    });
  });

  it('returns empty stats when there is no cook history', () => {
    expect(summarizeWasteReductionStats([])).toEqual({
      mealsCooked: 0,
      pantryItemsUsed: 0,
      portionsUsed: 0,
      latestCookedAt: undefined,
    });
  });
});
