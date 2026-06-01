import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { PantryItem } from '@/types/useitup';

export type ExpiryReminderSettings = {
  daysAhead: number;
  enabled: boolean;
  hour: number;
  minute: number;
};

export type ExpiryReminderPlanItem = {
  body: string;
  daysUntilExpiration: number;
  identifier: string;
  itemId: string;
  itemName: string;
  reminderDate: Date;
  title: string;
};

export type ExpiryReminderNotificationSummary = {
  body: string;
  identifier: string;
  reminderDate: Date;
  title: string;
};

export type ExpiringReminderItemGroup = {
  key: string;
  title: string;
  items: PantryItem[];
};

export const defaultExpiryReminderSettings: ExpiryReminderSettings = {
  daysAhead: 3,
  enabled: false,
  hour: 9,
  minute: 0,
};

export const expiryReminderStorageKey = 'useitup.expiryReminderSettings';
export const expiryReminderIdentifierPrefix = 'useitup-expiry-';
export const expiryReminderSummaryIdentifier = `${expiryReminderIdentifierPrefix}summary`;

const reminderChannelId = 'expiry-reminders';
const dayMs = 24 * 60 * 60 * 1000;

export async function getExpiryReminderSettings() {
  const rawSettings = await AsyncStorage.getItem(expiryReminderStorageKey);

  if (!rawSettings) {
    return defaultExpiryReminderSettings;
  }

  try {
    return normalizeSettings(JSON.parse(rawSettings));
  } catch {
    return defaultExpiryReminderSettings;
  }
}

export async function saveExpiryReminderSettings(settings: ExpiryReminderSettings) {
  const nextSettings = normalizeSettings(settings);
  await AsyncStorage.setItem(expiryReminderStorageKey, JSON.stringify(nextSettings));
  return nextSettings;
}

export async function getExpiryReminderPermissionStatus() {
  if (Platform.OS === 'web') {
    return 'unsupported';
  }

  const permissions = await Notifications.getPermissionsAsync();
  return permissions.status;
}

export async function requestExpiryReminderPermission() {
  if (Platform.OS === 'web') {
    return 'unsupported';
  }

  const existingPermissions = await Notifications.getPermissionsAsync();

  if (existingPermissions.granted) {
    return existingPermissions.status;
  }

  const nextPermissions = await Notifications.requestPermissionsAsync();
  return nextPermissions.status;
}

export async function syncExpiryReminders(
  items: PantryItem[],
  settings: ExpiryReminderSettings,
  now = new Date(),
) {
  if (Platform.OS === 'web') {
    return [];
  }

  await cancelExpiryReminders();

  const nextSettings = normalizeSettings(settings);

  if (!nextSettings.enabled) {
    return [];
  }

  await ensureReminderChannel();

  const plan = buildExpiryReminderPlan(items, nextSettings, now);
  const summary = buildExpiryReminderNotificationSummary(plan);

  if (summary) {
    await Notifications.scheduleNotificationAsync({
      content: {
        body: summary.body,
        data: {
          url: '/expiring-soon',
        },
        sound: false,
        title: summary.title,
      },
      identifier: summary.identifier,
      trigger: {
        channelId: reminderChannelId,
        date: summary.reminderDate,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      },
    });
  }

  return plan;
}

export async function cancelExpiryReminders() {
  if (Platform.OS === 'web') {
    return;
  }

  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduledNotifications
      .filter((notification) => notification.identifier.startsWith(expiryReminderIdentifierPrefix))
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

export function buildExpiryReminderPlan(
  items: PantryItem[],
  settings: ExpiryReminderSettings,
  now = new Date(),
) {
  const nextSettings = normalizeSettings(settings);

  if (!nextSettings.enabled) {
    return [];
  }

  return items
    .flatMap((item) => {
      if (!item.expirationDate) {
        return [];
      }

      const daysUntilExpiration = getDaysUntilExpiration(item.expirationDate, now);

      if (daysUntilExpiration < 0 || daysUntilExpiration > nextSettings.daysAhead) {
        return [];
      }

      const reminderDate = getReminderDate(item.expirationDate, nextSettings, now);
      const expirationLabel = formatExpirationDistance(daysUntilExpiration);

      return [
        {
          body: `${item.name} expires ${expirationLabel}. Plan a meal before it goes to waste.`,
          daysUntilExpiration,
          identifier: `${expiryReminderIdentifierPrefix}${item.id}`,
          itemId: item.id,
          itemName: item.name,
          reminderDate,
          title: `Use ${item.name} soon`,
        },
      ];
    })
    .sort((first, second) => first.daysUntilExpiration - second.daysUntilExpiration || first.itemName.localeCompare(second.itemName));
}

export function countReminderCandidates(
  items: PantryItem[],
  settings: ExpiryReminderSettings,
  now = new Date(),
) {
  return buildExpiryReminderPlan(items, { ...settings, enabled: true }, now).length;
}

export function getExpiringReminderItems(
  items: PantryItem[],
  settings: ExpiryReminderSettings,
  now = new Date(),
) {
  const nextSettings = normalizeSettings(settings);

  return items
    .filter((item) => {
      if (!item.expirationDate) {
        return false;
      }

      const daysUntilExpiration = getDaysUntilExpiration(item.expirationDate, now);
      return daysUntilExpiration >= 0 && daysUntilExpiration <= nextSettings.daysAhead;
    })
    .sort((first, second) => {
      const firstDays = first.expirationDate ? getDaysUntilExpiration(first.expirationDate, now) : Number.MAX_SAFE_INTEGER;
      const secondDays = second.expirationDate ? getDaysUntilExpiration(second.expirationDate, now) : Number.MAX_SAFE_INTEGER;

      return firstDays - secondDays || first.name.localeCompare(second.name);
    });
}

export function groupExpiringReminderItems(
  items: PantryItem[],
  now = new Date(),
): ExpiringReminderItemGroup[] {
  const groupedItems = new Map<number, PantryItem[]>();

  items.forEach((item) => {
    if (!item.expirationDate) {
      return;
    }

    const daysUntilExpiration = getDaysUntilExpiration(item.expirationDate, now);

    if (daysUntilExpiration < 0) {
      return;
    }

    const currentItems = groupedItems.get(daysUntilExpiration) ?? [];
    groupedItems.set(daysUntilExpiration, [...currentItems, item]);
  });

  return [...groupedItems.entries()]
    .sort(([firstDays], [secondDays]) => firstDays - secondDays)
    .map(([daysUntilExpiration, groupItems]) => ({
      items: [...groupItems].sort((first, second) => first.name.localeCompare(second.name)),
      key: `expires-${daysUntilExpiration}`,
      title: formatExpirationGroupTitle(daysUntilExpiration),
    }));
}

export function buildExpiryReminderNotificationSummary(
  plan: ExpiryReminderPlanItem[],
): ExpiryReminderNotificationSummary | undefined {
  if (!plan.length) {
    return undefined;
  }

  const sortedPlan = [...plan].sort(
    (first, second) => first.reminderDate.getTime() - second.reminderDate.getTime(),
  );
  const [firstReminder, secondReminder] = sortedPlan;

  return {
    body: buildSummaryBody(sortedPlan),
    identifier: expiryReminderSummaryIdentifier,
    reminderDate: firstReminder.reminderDate,
    title: 'Food expiring soon',
  };

  function buildSummaryBody(reminders: ExpiryReminderPlanItem[]) {
    if (reminders.length === 1) {
      return `${firstReminder.itemName} expires ${formatExpirationDistance(firstReminder.daysUntilExpiration)}. Plan a meal before it goes to waste!`;
    }

    if (reminders.length === 2 && secondReminder) {
      return `${firstReminder.itemName} and ${secondReminder.itemName} expire soon. Plan a meal before they go to waste!`;
    }

    const remainingCount = reminders.length - 2;
    return `${firstReminder.itemName}, ${secondReminder.itemName}, and ${remainingCount} more food items expire soon. Plan a meal before they go to waste!`;
  }
}

export function getDaysUntilExpiration(expirationDate: string, now = new Date()) {
  const expiry = startOfDay(parseDate(expirationDate));
  const today = startOfDay(now);
  return Math.round((expiry.getTime() - today.getTime()) / dayMs);
}

export function summarizeExpiryReminderSettings(settings: ExpiryReminderSettings) {
  const nextSettings = normalizeSettings(settings);

  if (!nextSettings.enabled) {
    return 'Off';
  }

  const dayLabel = nextSettings.daysAhead === 1 ? '1 day before' : `${nextSettings.daysAhead} days before`;
  return `On · ${dayLabel} at ${formatReminderTime(nextSettings.hour, nextSettings.minute)}`;
}

function getReminderDate(expirationDate: string, settings: ExpiryReminderSettings, now: Date) {
  const expiry = startOfDay(parseDate(expirationDate));
  const reminderDate = new Date(expiry);
  reminderDate.setDate(expiry.getDate() - settings.daysAhead);
  reminderDate.setHours(settings.hour, settings.minute, 0, 0);

  if (reminderDate <= now) {
    return new Date(now.getTime() + 5 * 60 * 1000);
  }

  return reminderDate;
}

function formatExpirationDistance(daysUntilExpiration: number) {
  if (daysUntilExpiration <= 0) {
    return 'today';
  }

  if (daysUntilExpiration === 1) {
    return 'tomorrow';
  }

  return `in ${daysUntilExpiration} days`;
}

function formatExpirationGroupTitle(daysUntilExpiration: number) {
  if (daysUntilExpiration <= 0) {
    return 'Expires today';
  }

  if (daysUntilExpiration === 1) {
    return 'Expires tomorrow';
  }

  return `Expires in ${daysUntilExpiration} days`;
}

function formatReminderTime(hour: number, minute: number) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2026, 0, 1, hour, minute));
}

async function ensureReminderChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(reminderChannelId, {
    importance: Notifications.AndroidImportance.DEFAULT,
    name: 'Expiry reminders',
  });
}

function normalizeSettings(value: Partial<ExpiryReminderSettings>): ExpiryReminderSettings {
  const daysAhead = Number(value.daysAhead);
  const hour = Number(value.hour);
  const minute = Number(value.minute);

  return {
    daysAhead: Number.isFinite(daysAhead) ? Math.min(Math.max(Math.round(daysAhead), 1), 14) : defaultExpiryReminderSettings.daysAhead,
    enabled: Boolean(value.enabled),
    hour: Number.isFinite(hour) ? Math.min(Math.max(Math.round(hour), 0), 23) : defaultExpiryReminderSettings.hour,
    minute: Number.isFinite(minute) ? Math.min(Math.max(Math.round(minute), 0), 59) : defaultExpiryReminderSettings.minute,
  };
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}
