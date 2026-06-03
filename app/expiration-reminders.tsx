import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, ConfirmDialog, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useAppLanguage } from '@/contexts/language-context';
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
  syncExpiryReminders,
} from '@/lib/reminders/expiry-reminders';
import { getErrorMessage } from '@/lib/shared/errors';
import { safeBack } from '@/lib/shared/navigation';
import { getPantryItems } from '@/lib/pantry/pantry';
import { PantryItem } from '@/types/useitup';

const dayOptions = [1, 2, 3, 5, 7] as const;
const timeOptions = [
  { label: '8 AM', hour: 8, minute: 0 },
  { label: '9 AM', hour: 9, minute: 0 },
  { label: '6 PM', hour: 18, minute: 0 },
] as const;

export default function ExpirationRemindersScreen() {
  const { user } = useAuth();
  const { languageCode, t } = useAppLanguage();
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
        setMessage(getErrorMessage(error, t('unableToUpdateReminders')));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [t, user],
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
        setMessage(t('remindersNotEnabled'));
        return;
      }

      const nextSettings = await saveExpiryReminderSettings({ ...settings, enabled: true });
      const plan = await syncExpiryReminders(items, nextSettings);
      setSettings(nextSettings);
      setShowEnableDialog(false);
      setMessageType('success');
      setMessage(plan.length ? t('remindersScheduled', { count: plan.length }) : t('remindersOnNoItems'));
    } catch (error) {
      setShowEnableDialog(false);
      setMessageType('error');
      setMessage(getErrorMessage(error, t('unableToEnableReminders')));
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
      setMessage(t('remindersTurnedOff'));
    } catch (error) {
      setMessageType('error');
      setMessage(getErrorMessage(error, t('unableToDisableReminders')));
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
      setMessage(savedSettings.enabled ? t('remindersScheduled', { count: scheduledCount }) : t('reminderPreferenceSaved'));
    } catch (error) {
      setMessageType('error');
      setMessage(getErrorMessage(error, t('unableToUpdateReminders')));
    } finally {
      setIsSaving(false);
    }
  }

  const alertsSection = (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <SectionTitle>{t('expiringSoon')}</SectionTitle>
        <Link asChild href="/expiring-soon">
          <Pressable hitSlop={10}>
              <Text style={styles.viewAll}>{t('viewAll')}</Text>
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
                  {formatReminderDate(reminder.reminderDate, languageCode)} · {t('expiresLower', { label: formatExpirationDistance(reminder.daysUntilExpiration, t) })}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('noExpiringItemsInRange')}</Text>
            <Text style={styles.emptyCopy}>{t('addExpirationDatesForPriority')}</Text>
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
            <Text style={styles.statusTitle}>{settings.enabled ? t('remindersAreOn') : t('remindersAreOff')}</Text>
            <Text style={styles.statusDetail}>{formatReminderSettingsStatus(settings, t, languageCode)}</Text>
            <Text style={styles.permissionText}>{t('permission')}: {formatPermissionStatus(permissionStatus, t)}</Text>
          </View>
        </View>

        {message ? (
          <Text style={[styles.message, messageType === 'error' ? styles.errorText : styles.successText]}>
            {message}
          </Text>
        ) : null}

        {settings.enabled ? (
          <Button disabled={isSaving || isLoading} icon="notifications-off-outline" onPress={handleDisableReminders} secondary>
            {isSaving ? t('updating') : t('turnOffReminders')}
          </Button>
        ) : (
          <Button disabled={isSaving || isLoading} icon="notifications-outline" onPress={() => setShowEnableDialog(true)}>
            {isSaving ? t('updating') : t('turnOnReminders')}
          </Button>
        )}
      </Card>

      <View style={styles.section}>
        <SectionTitle>{t('reminderWindow')}</SectionTitle>
        <Card>
          <Text style={styles.cardCopy}>{t('reminderWindowCopy')}</Text>
          <View style={styles.chipWrap}>
            {dayOptions.map((daysAhead) => (
              <Chip
                key={daysAhead}
                label={t('withinDays', { days: daysAhead, plural: daysAhead === 1 ? '' : 's' })}
                onPress={() => handleChangeSettings({ ...settings, daysAhead })}
                selected={settings.daysAhead === daysAhead}
              />
            ))}
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>{t('reminderTime')}</SectionTitle>
        <Card>
          <Text style={styles.cardCopy}>{t('reminderTimeCopy')}</Text>
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
      title={t('expirationReminders')}
      subtitle={t('expirationRemindersSubtitle')}
      headerAction={<Button compact onPress={() => safeBack('/(tabs)/profile')} secondary icon="arrow-back">{t('back')}</Button>}>
      {showAlertsFirst ? alertsSection : null}
      {settingsSections}
      {!showAlertsFirst ? alertsSection : null}
      <ConfirmDialog
        busy={isSaving}
        confirmIcon="notifications-outline"
        confirmLabel={t('allowReminders')}
        message={t('reminderPermissionMessage')}
        onCancel={() => setShowEnableDialog(false)}
        onConfirm={handleConfirmEnableReminders}
        title={t('turnOnExpiryRemindersQuestion')}
        visible={showEnableDialog}
      />
    </Screen>
  );
}

function formatPermissionStatus(status: string, t: ReturnType<typeof useAppLanguage>['t']) {
  if (status === 'granted') {
    return t('allowed');
  }

  if (status === 'denied') {
    return t('blocked');
  }

  if (status === 'unsupported') {
    return t('unsupported');
  }

  return t('notRequested');
}

function formatReminderDate(date: Date, languageCode: string) {
  return new Intl.DateTimeFormat(languageCode, {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatExpirationDistance(daysUntilExpiration: number, t: ReturnType<typeof useAppLanguage>['t']) {
  if (daysUntilExpiration <= 0) {
    return t('today');
  }

  if (daysUntilExpiration === 1) {
    return t('tomorrow');
  }

  return t('inDays', { days: daysUntilExpiration });
}

function formatReminderSettingsStatus(
  settings: ExpiryReminderSettings,
  t: ReturnType<typeof useAppLanguage>['t'],
  languageCode: string,
) {
  if (!settings.enabled) {
    return t('remindersAreOff');
  }

  return `${t('remindersAreOn')} · ${t('withinDays', { days: settings.daysAhead, plural: settings.daysAhead === 1 ? '' : 's' })} · ${formatReminderTime(settings.hour, settings.minute, languageCode)}`;
}

function formatReminderTime(hour: number, minute: number, languageCode: string) {
  return new Intl.DateTimeFormat(languageCode, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2026, 0, 1, hour, minute));
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
