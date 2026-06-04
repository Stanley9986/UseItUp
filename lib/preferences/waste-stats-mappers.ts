export type PantryUpdateStatsRow = {
  amount_used: number | string | null;
  pantry_item_id: string | null;
  update_action: string | null;
};

export type CookSessionStatsRow = {
  cooked_at: string;
  id: string;
  pantry_updates: PantryUpdateStatsRow[] | PantryUpdateStatsRow | null;
};

export type WasteReductionStats = {
  mealsCooked: number;
  pantryItemsUsed: number;
  portionsUsed: number;
  latestCookedAt?: string;
};

export function summarizeWasteReductionStats(rows: CookSessionStatsRow[]): WasteReductionStats {
  const pantryUpdates = rows.flatMap((row) => normalizePantryUpdates(row.pantry_updates));
  const usedUpdates = pantryUpdates.filter((update) => update.update_action !== 'skipped');
  const portionsUsed = usedUpdates.reduce((total, update) => total + getAmountUsed(update.amount_used), 0);

  return {
    mealsCooked: rows.length,
    pantryItemsUsed: usedUpdates.length,
    portionsUsed,
    latestCookedAt: rows[0]?.cooked_at,
  };
}

function normalizePantryUpdates(updates: CookSessionStatsRow['pantry_updates']) {
  if (!updates) {
    return [];
  }

  return Array.isArray(updates) ? updates : [updates];
}

function getAmountUsed(value: PantryUpdateStatsRow['amount_used']) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
