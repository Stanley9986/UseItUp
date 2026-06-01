import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

vi.mock('expo-notifications', () => ({
  AndroidImportance: {
    DEFAULT: 'default',
  },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
}));

vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

import {
  buildExpiryReminderPlan,
  buildExpiryReminderNotificationSummary,
  countReminderCandidates,
  defaultExpiryReminderSettings,
  getDaysUntilExpiration,
  getExpiringReminderItems,
  groupExpiringReminderItems,
  summarizeExpiryReminderSettings,
} from '@/lib/expiry-reminders';
import { PantryItem } from '@/types/useitup';

describe('expiry reminder helpers', () => {
  const now = new Date('2026-06-01T10:00:00');

  it('builds reminders for items expiring within the selected window', () => {
    const plan = buildExpiryReminderPlan(
      [
        pantryItem({ id: '1', name: 'Spinach', expirationDate: '2026-06-02' }),
        pantryItem({ id: '2', name: 'Milk', expirationDate: '2026-06-04' }),
        pantryItem({ id: '3', name: 'Rice', expirationDate: '2026-06-12' }),
        pantryItem({ id: '4', name: 'Old Yogurt', expirationDate: '2026-05-31' }),
        pantryItem({ id: '5', name: 'Salt', expirationDate: undefined }),
      ],
      {
        ...defaultExpiryReminderSettings,
        enabled: true,
        daysAhead: 3,
      },
      now,
    );

    expect(plan.map((reminder) => reminder.itemName)).toEqual(['Spinach', 'Milk']);
    expect(plan[0]).toMatchObject({
      body: 'Spinach expires tomorrow. Plan a meal before it goes to waste.',
      daysUntilExpiration: 1,
      identifier: 'useitup-expiry-1',
      title: 'Use Spinach soon',
    });
  });

  it('returns no reminders when reminders are disabled', () => {
    const plan = buildExpiryReminderPlan(
      [pantryItem({ id: '1', name: 'Spinach', expirationDate: '2026-06-02' })],
      defaultExpiryReminderSettings,
      now,
    );

    expect(plan).toEqual([]);
  });

  it('uses a near-future reminder date when the configured time already passed', () => {
    const [reminder] = buildExpiryReminderPlan(
      [pantryItem({ id: '1', name: 'Spinach', expirationDate: '2026-06-02' })],
      {
        daysAhead: 3,
        enabled: true,
        hour: 9,
        minute: 0,
      },
      now,
    );

    expect(reminder.reminderDate.getTime() - now.getTime()).toBe(5 * 60 * 1000);
  });

  it('counts reminder candidates without requiring settings to already be enabled', () => {
    const count = countReminderCandidates(
      [
        pantryItem({ id: '1', name: 'Spinach', expirationDate: '2026-06-02' }),
        pantryItem({ id: '2', name: 'Milk', expirationDate: '2026-06-05' }),
      ],
      {
        ...defaultExpiryReminderSettings,
        enabled: false,
        daysAhead: 3,
      },
      now,
    );

    expect(count).toBe(1);
  });

  it('returns expiring items within the reminder window sorted by urgency', () => {
    const items = [
      pantryItem({ id: '1', name: 'Milk', expirationDate: '2026-06-04' }),
      pantryItem({ id: '2', name: 'Steak', expirationDate: '2026-06-01' }),
      pantryItem({ id: '3', name: 'Rice', expirationDate: '2026-06-09' }),
      pantryItem({ id: '4', name: 'Spinach', expirationDate: '2026-06-02' }),
      pantryItem({ id: '5', name: 'Salt' }),
    ];

    const expiringItems = getExpiringReminderItems(
      items,
      {
        ...defaultExpiryReminderSettings,
        enabled: false,
        daysAhead: 3,
      },
      now,
    );

    expect(expiringItems.map((item) => item.name)).toEqual(['Steak', 'Spinach', 'Milk']);
  });

  it('groups expiring items by their actual expiration day', () => {
    const groups = groupExpiringReminderItems(
      [
        pantryItem({ id: '1', name: 'Milk', expirationDate: '2026-06-04' }),
        pantryItem({ id: '2', name: 'Steak', expirationDate: '2026-06-01' }),
        pantryItem({ id: '3', name: 'Spinach', expirationDate: '2026-06-02' }),
        pantryItem({ id: '4', name: 'Apple', expirationDate: '2026-06-02' }),
        pantryItem({ id: '5', name: 'Rice' }),
      ],
      now,
    );

    expect(groups).toEqual([
      {
        items: [expect.objectContaining({ name: 'Steak' })],
        key: 'expires-0',
        title: 'Expires today',
      },
      {
        items: [
          expect.objectContaining({ name: 'Apple' }),
          expect.objectContaining({ name: 'Spinach' }),
        ],
        key: 'expires-1',
        title: 'Expires tomorrow',
      },
      {
        items: [expect.objectContaining({ name: 'Milk' })],
        key: 'expires-3',
        title: 'Expires in 3 days',
      },
    ]);
  });

  it('does not create empty expiration day groups', () => {
    const groups = groupExpiringReminderItems(
      [
        pantryItem({ id: '1', name: 'Milk', expirationDate: '2026-06-08' }),
        pantryItem({ id: '2', name: 'Spinach', expirationDate: '2026-06-02' }),
      ],
      now,
    );

    expect(groups.map((group) => group.title)).toEqual(['Expires tomorrow', 'Expires in 7 days']);
  });

  it('summarizes disabled and enabled settings', () => {
    expect(summarizeExpiryReminderSettings(defaultExpiryReminderSettings)).toBe('Off');
    expect(
      summarizeExpiryReminderSettings({
        daysAhead: 1,
        enabled: true,
        hour: 18,
        minute: 30,
      }),
    ).toBe('On · 1 day before at 6:30 PM');
  });

  it('calculates days until expiration from local calendar days', () => {
    expect(getDaysUntilExpiration('2026-06-01', now)).toBe(0);
    expect(getDaysUntilExpiration('2026-06-04', now)).toBe(3);
  });

  it('summarizes many reminder items into one notification', () => {
    const plan = buildExpiryReminderPlan(
      [
        pantryItem({ id: '1', name: 'Olive Oil', expirationDate: '2026-06-02' }),
        pantryItem({ id: '2', name: 'Garlic', expirationDate: '2026-06-02' }),
        pantryItem({ id: '3', name: 'Butter', expirationDate: '2026-06-02' }),
        pantryItem({ id: '4', name: 'Steak', expirationDate: '2026-06-02' }),
      ],
      {
        ...defaultExpiryReminderSettings,
        enabled: true,
        daysAhead: 3,
      },
      now,
    );

    expect(buildExpiryReminderNotificationSummary(plan)).toMatchObject({
      body: 'Butter, Garlic, and 2 more food items expire soon. Plan a meal before they go to waste!',
      identifier: 'useitup-expiry-summary',
      title: 'Food expiring soon',
    });
  });

  it('summarizes one reminder item with its expiration timing', () => {
    const plan = buildExpiryReminderPlan(
      [pantryItem({ id: '1', name: 'Steak', expirationDate: '2026-06-01' })],
      {
        ...defaultExpiryReminderSettings,
        enabled: true,
        daysAhead: 3,
      },
      now,
    );

    expect(buildExpiryReminderNotificationSummary(plan)?.body).toBe(
      'Steak expires today. Plan a meal before it goes to waste!',
    );
  });
});

function pantryItem(overrides: Partial<PantryItem>): PantryItem {
  return {
    id: 'item-id',
    name: 'Item',
    quantityUnit: 'count',
    storageLocation: 'fridge',
    ...overrides,
  };
}
