import { describe, expect, it, vi } from 'vitest';

const supabaseFunctionsMock = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@/lib/shared/supabase', () => ({
  supabase: {
    functions: supabaseFunctionsMock,
  },
}));

import { parseIntakeText, sanitizeIntakeDraft } from '@/lib/pantry/pantry-intake';

const today = new Date(2026, 5, 17, 12, 0, 0, 0); // 2026-06-17

describe('sanitizeIntakeDraft', () => {
  it('keeps a well-formed item and derives an expiration date from shelf life', () => {
    const draft = sanitizeIntakeDraft(
      {
        name: '  Greek Yogurt ',
        quantityValue: 2,
        quantityUnit: 'count',
        category: 'dairy',
        storageLocation: 'fridge',
        shelfLifeDays: 14,
        notes: ' on sale ',
      },
      today,
    );

    expect(draft).toEqual({
      name: 'Greek Yogurt',
      category: 'dairy',
      storageLocation: 'fridge',
      quantityUnit: 'count',
      quantityValue: 2,
      expirationDate: '2026-07-01',
      notes: 'on sale',
    });
  });

  it('clamps unknown enum values to safe defaults', () => {
    const draft = sanitizeIntakeDraft(
      {
        name: 'Mystery Item',
        quantityValue: 0,
        quantityUnit: 'kilograms',
        category: 'snacks',
        storageLocation: 'cupboard',
        shelfLifeDays: -3,
      },
      today,
    );

    expect(draft).toEqual({
      name: 'Mystery Item',
      category: 'other',
      storageLocation: 'pantry',
      quantityUnit: 'count',
      quantityValue: 1,
    });
  });

  it('uses a quantity label instead of a value for level items', () => {
    const draft = sanitizeIntakeDraft(
      { name: 'Olive Oil', quantityUnit: 'level', quantityLabel: 'half', category: 'condiment', storageLocation: 'pantry', shelfLifeDays: null },
      today,
    );

    expect(draft).toMatchObject({ quantityUnit: 'level', quantityLabel: 'half' });
    expect(draft).not.toHaveProperty('quantityValue');
    expect(draft).not.toHaveProperty('expirationDate');
  });

  it('defaults an invalid level label to medium', () => {
    const draft = sanitizeIntakeDraft(
      { name: 'Flour', quantityUnit: 'level', quantityLabel: 'mostly', category: 'grain', storageLocation: 'pantry', shelfLifeDays: 0 },
      today,
    );

    expect(draft?.quantityLabel).toBe('medium');
  });

  it('drops items without a usable name', () => {
    expect(sanitizeIntakeDraft({ name: '   ' }, today)).toBeNull();
    expect(sanitizeIntakeDraft(null, today)).toBeNull();
    expect(sanitizeIntakeDraft({ quantityUnit: 'count' }, today)).toBeNull();
  });

  it('caps an outlier shelf life', () => {
    const draft = sanitizeIntakeDraft(
      { name: 'Salt', quantityUnit: 'count', quantityValue: 1, category: 'condiment', storageLocation: 'pantry', shelfLifeDays: 999999 },
      today,
    );

    // 3650 days from 2026-06-17.
    expect(draft?.expirationDate).toBe('2036-06-14');
  });
});

describe('parseIntakeText', () => {
  it('returns nothing and skips the call for empty input', async () => {
    supabaseFunctionsMock.invoke.mockReset();

    expect(await parseIntakeText('   ', 'en')).toEqual([]);
    expect(supabaseFunctionsMock.invoke).not.toHaveBeenCalled();
  });

  it('sends the description to the intake action and returns sanitized drafts with ids', async () => {
    supabaseFunctionsMock.invoke.mockReset().mockResolvedValue({
      data: {
        items: [
          { name: 'Spinach', quantityValue: 1, quantityUnit: 'count', category: 'produce', storageLocation: 'fridge', shelfLifeDays: 5 },
          { name: '', quantityUnit: 'count' },
        ],
      },
      error: null,
    });

    const drafts = await parseIntakeText('a bag of spinach', 'en');

    expect(supabaseFunctionsMock.invoke).toHaveBeenCalledWith('generate-recipes', {
      body: { intake: { text: 'a bag of spinach', targetLanguage: 'en' } },
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ id: 'intake-0', name: 'Spinach', category: 'produce' });
  });

  it('throws when the function returns an error', async () => {
    supabaseFunctionsMock.invoke.mockReset().mockResolvedValue({
      data: null,
      error: new Error('boom'),
    });

    await expect(parseIntakeText('milk', 'en')).rejects.toThrow('boom');
  });
});
