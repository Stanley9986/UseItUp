import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, ConfirmDialog, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useRefresh } from '@/hooks/use-refresh';
import {
  buildExpiryReminderPlan,
  cancelExpiryReminders,
  defaultExpiryReminderSettings,
  ExpiryReminderSettings,
  getExpiryReminderPermissionStatus,
  getExpiryReminderSettings,
  requestExpiryReminderPermission,
  saveExpiryReminderSettings,
  summarizeExpiryReminderSettings,
  syncExpiryReminders,
} from '@/lib/expiry-reminders';
import { getErrorMessage } from '@/lib/errors';
import { safeBack } from '@/lib/navigation';
import { getPantryItems } from '@/lib/pantry';
import { PantryItem } from '@/types/useitup';

const dayOptions = [1, 2, 3, 5, 7] as const;
const timeOptions = [
  { label: '8 AM', hour: 8, minute: 0 },
  { label: '9 AM', hour: 9, minute: 0 },
  { label: '6 PM', hour: 18, minute: 0 },
] as const;

export default function ExpirationRemindersScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ focus?: string }>();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [settings, setSettings] = useState<ExpiryReminderSettings>(defaultExpiryReminderSettings);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('success');

  const loadReminders = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (!user) {
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }

        const [nextSettings, nextPermissionStatus, nextItems] = await Promise.all([
          getExpiryReminderSettings(),
          getExpiryReminderPermissionStatus(),
          getPantryItems(user.id),
        ]);

        setSettings(nextSettings);
        setPermissionStatus(nextPermissionStatus);
        setItems(nextItems);
      } catch (error) {
        setMessageType('error');
        setMessage(getErrorMessage(error, 'Unable to load reminder settings.'));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [user],
  );

  const { isRefreshing, refresh } = useRefresh(() => loadReminders({ showLoading: false }));

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const previewPlan = useMemo(
    () => buildExpiryReminderPlan(items, { ...settings, enabled: true }),
    [items, settings],
  );
  const previewAlerts = previewPlan.slice(0, 3);
  const showAlertsFirst = params.focus === 'alerts';

  async function handleConfirmEnableReminders() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const nextPermissionStatus = await requestExpiryReminderPermission();
      setPermissionStatus(nextPermissionStatus);

      if (nextPermissionStatus !== 'granted') {
        setShowEnableDialog(false);
        setMessageType('error');
        setMessage('Notifications are not enabled for UseItUp on this device.');
        return;
      }

      const nextSettings = await saveExpiryReminderSettings({ ...settings, enabled: true });
      const plan = await syncExpiryReminders(items, nextSettings);
      setSettings(nextSettings);
      setShowEnableDialog(false);
      setMessageType('success');
      setMessage(plan.length ? `${plan.length} expiry reminders scheduled.` : 'Reminders are on. Add expiring items to schedule alerts.');
    } catch (error) {
      setShowEnableDialog(false);
      setMessageType('error');
      setMessage(getErrorMessage(error, 'Unable to enable reminders.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisableReminders() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const nextSettings = await saveExpiryReminderSettings({ ...settings, enabled: false });
      await cancelExpiryReminders();
      setSettings(nextSettings);
      setMessageType('success');
      setMessage('Expiry reminders turned off.');
    } catch (error) {
      setMessageType('error');
      setMessage(getErrorMessage(error, 'Unable to disable reminders.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleChangeSettings(nextSettings: ExpiryReminderSettings) {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const savedSettings = await saveExpiryReminderSettings(nextSettings);
      let scheduledCount = 0;

      if (savedSettings.enabled) {
        const plan = await syncExpiryReminders(items, savedSettings);
        scheduledCount = plan.length;
      }

      setSettings(savedSettings);
      setMessageType('success');
      setMessage(savedSettings.enabled ? `${scheduledCount} expiry reminders scheduled.` : 'Reminder preference saved.');
    } catch (error) {
      setMessageType('error');
      setMessage(getErrorMessage(error, 'Unable to update reminders.'));
    } finally {
      setIsSaving(false);
    }
  }

  const alertsSection = (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <SectionTitle>Expiring Soon</SectionTitle>
        <Link asChild href="/expiring-soon">
          <Pressable hitSlop={10}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </Link>
      </View>
      <Card style={styles.listCard}>
        {previewAlerts.length ? (
          previewAlerts.map((reminder, index) => (
            <View key={reminder.identifier} style={[styles.alertRow, index > 0 && styles.withDivider]}>
              <View style={styles.alertIcon}>
                <Ionicons color={palette.green} name="leaf-outline" size={20} />
              </View>
              <View style={styles.alertCopy}>
                <Text style={styles.alertTitle}>{reminder.itemName}</Text>
                <Text style={styles.alertDetail}>
                  {formatReminderDate(reminder.reminderDate)} · expires {formatExpirationDistance(reminder.daysUntilExpiration)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No expiring items in range</Text>
            <Text style={styles.emptyCopy}>Add expiration dates or widen the reminder window to schedule alerts.</Text>
          </View>
        )}
      </Card>
    </View>
  );

  const settingsSections = (
    <>
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusIcon}>
            <Ionicons color={settings.enabled ? palette.green : palette.muted} name="notifications-outline" size={24} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>{settings.enabled ? 'Reminders are on' : 'Reminders are off'}</Text>
            <Text style={styles.statusDetail}>{summarizeExpiryReminderSettings(settings)}</Text>
            <Text style={styles.permissionText}>Permission: {formatPermissionStatus(permissionStatus)}</Text>
          </View>
        </View>

        {message ? (
          <Text style={[styles.message, messageType === 'error' ? styles.errorText : styles.successText]}>
            {message}
          </Text>
        ) : null}

        {settings.enabled ? (
          <Button disabled={isSaving || isLoading} icon="notifications-off-outline" onPress={handleDisableReminders} secondary>
            {isSaving ? 'Updating...' : 'Turn Off Reminders'}
          </Button>
        ) : (
          <Button disabled={isSaving || isLoading} icon="notifications-outline" onPress={() => setShowEnableDialog(true)}>
            {isSaving ? 'Updating...' : 'Turn On Reminders'}
          </Button>
        )}
      </Card>

      <View style={styles.section}>
        <SectionTitle>Reminder Window</SectionTitle>
        <Card>
          <Text style={styles.cardCopy}>Send reminders for food expiring within this many days.</Text>
          <View style={styles.chipWrap}>
            {dayOptions.map((daysAhead) => (
              <Chip
                key={daysAhead}
                label={daysAhead === 1 ? '1 day' : `${daysAhead} days`}
                onPress={() => handleChangeSettings({ ...settings, daysAhead })}
                selected={settings.daysAhead === daysAhead}
              />
            ))}
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Reminder Time</SectionTitle>
        <Card>
          <Text style={styles.cardCopy}>Use a simple daily reminder time for now. We can add custom times later.</Text>
          <View style={styles.chipWrap}>
            {timeOptions.map((option) => (
              <Chip
                key={option.label}
                label={option.label}
                onPress={() => handleChangeSettings({ ...settings, hour: option.hour, minute: option.minute })}
                selected={settings.hour === option.hour && settings.minute === option.minute}
              />
            ))}
          </View>
        </Card>
      </View>
    </>
  );

  return (
    <Screen
      onRefresh={refresh}
      refreshing={isRefreshing}
      title="Expiration Reminders"
      subtitle="Get local alerts before food slips past its best day."
      headerAction={<Button compact onPress={() => safeBack('/(tabs)/profile')} secondary icon="arrow-back">Back</Button>}>
      {showAlertsFirst ? alertsSection : null}
      {settingsSections}
      {!showAlertsFirst ? alertsSection : null}
      <ConfirmDialog
        busy={isSaving}
        confirmIcon="notifications-outline"
        confirmLabel="Allow Reminders"
        message="UseItUp will ask your device for notification permission, then schedule local alerts for pantry items expiring within your reminder window."
        onCancel={() => setShowEnableDialog(false)}
        onConfirm={handleConfirmEnableReminders}
        title="Turn on expiry reminders?"
        visible={showEnableDialog}
      />
    </Screen>
  );
}

function formatPermissionStatus(status: string) {
  if (status === 'granted') {
    return 'Allowed';
  }

  if (status === 'denied') {
    return 'Blocked';
  }

  if (status === 'unsupported') {
    return 'Mobile only';
  }

  return 'Not requested';
}

function formatReminderDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(date);
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

const styles = StyleSheet.create({
  statusCard: {
    backgroundColor: palette.surface,
  },
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  statusIcon: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  statusCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  statusTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 20,
    fontWeight: '900',
  },
  statusDetail: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  permissionText: {
    color: palette.muted,
    fontSize: 13,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewAll: {
    color: palette.blue,
    fontSize: 13,
    fontWeight: '900',
  },
  cardCopy: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  errorText: {
    color: palette.red,
  },
  successText: {
    color: palette.green,
  },
  listCard: {
    gap: 0,
    padding: 0,
  },
  alertRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  withDivider: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
  },
  alertIcon: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  alertCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  alertTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 16,
    fontWeight: '900',
  },
  alertDetail: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    gap: 5,
    padding: 14,
  },
  emptyTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyCopy: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
