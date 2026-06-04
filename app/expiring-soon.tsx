import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, palette, PantryArtworkImage, QuantityText, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useAppLanguage } from '@/contexts/language-context';
import { useRefresh } from '@/hooks/use-refresh';
import { useTranslatedNames } from '@/hooks/use-term-translation';
import {
  defaultExpiryReminderSettings,
  ExpiryReminderSettings,
  groupExpiringReminderItems,
  getExpiryReminderSettings,
  getExpiringReminderItems,
} from '@/lib/reminders/expiry-reminders';
import { getErrorMessage } from '@/lib/shared/errors';
import { safeBack } from '@/lib/shared/navigation';
import { buildVisibleItemsPage, defaultPageSize } from '@/lib/shared/pagination';
import { getPantryItems } from '@/lib/pantry/pantry';
import { PantryItem } from '@/types/useitup';

export default function ExpiringSoonScreen() {
  const { user } = useAuth();
  const { languageCode, t } = useAppLanguage();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [settings, setSettings] = useState<ExpiryReminderSettings>(defaultExpiryReminderSettings);
  const [expiringPage, setExpiringPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadExpiringSoon = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (!user) {
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setErrorMessage('');

        const [nextSettings, nextItems] = await Promise.all([
          getExpiryReminderSettings(),
          getPantryItems(user.id),
        ]);

        setSettings(nextSettings);
        setItems(nextItems);
        setExpiringPage(0);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, t('unableToLoadExpiringItems')));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [t, user],
  );

  const { isRefreshing, refresh } = useRefresh(() => loadExpiringSoon({ showLoading: false }));

  useFocusEffect(
    useCallback(() => {
      loadExpiringSoon();
    }, [loadExpiringSoon]),
  );

  const expiringItems = useMemo(
    () => getExpiringReminderItems(items, settings),
    [items, settings],
  );
  const visibleExpiringPage = useMemo(
    () => buildVisibleItemsPage(expiringItems, { page: expiringPage, pageSize: defaultPageSize }),
    [expiringItems, expiringPage],
  );
  const visibleExpiringNames = useMemo(
    () => visibleExpiringPage.items.map((item) => item.name),
    [visibleExpiringPage.items],
  );
  const expiringNameMap = useTranslatedNames(visibleExpiringNames);
  const expiringGroups = useMemo(
    () => groupExpiringReminderItems(visibleExpiringPage.items),
    [visibleExpiringPage.items],
  );

  return (
    <Screen
      onRefresh={refresh}
      refreshing={isRefreshing}
      title={t('expiringSoon')}
      subtitle={t('foodExpiringWithinDays', { days: settings.daysAhead, plural: settings.daysAhead === 1 ? '' : 's' })}
      headerAction={<Button compact onPress={() => safeBack('/(tabs)')} secondary icon="arrow-back">{t('back')}</Button>}>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons color={palette.red} name="alert" size={22} />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>
            {t('itemsNeedAttention', {
              count: expiringItems.length,
              plural: expiringItems.length === 1 ? '' : 's',
              verb: expiringItems.length === 1 ? 'requiere' : 'requieren',
            })}
          </Text>
          <Text style={styles.summaryText}>{t('sameWindowAsReminders')}</Text>
        </View>
      </Card>

      {errorMessage ? (
        <Card style={styles.listCard}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('couldNotLoadPantry')}</Text>
            <Text style={styles.emptyCopy}>{errorMessage}</Text>
          </View>
        </Card>
      ) : isLoading ? (
        <Card style={styles.listCard}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('loadingExpiringItems')}</Text>
          </View>
        </Card>
      ) : expiringGroups.length ? (
        <View style={styles.groups}>
          {expiringGroups.map((group) => (
            <View key={group.key} style={styles.section}>
              <SectionTitle>{formatExpirationGroupTitle(group.key, t)}</SectionTitle>
              <Card style={styles.listCard}>
                {group.items.map((item, index) => (
                  <View key={item.id} style={index > 0 && styles.withDivider}>
                    <Link asChild href={`/pantry-item/${item.id}`}>
                      <Pressable style={styles.itemRow}>
                        <PantryArtworkImage item={item} style={styles.itemIcon} />
                        <View style={styles.itemCopy}>
                          <Text numberOfLines={1} style={styles.itemName}>{expiringNameMap[item.name] ?? item.name}</Text>
                          <View style={styles.itemMeta}>
                            <QuantityText item={item} />
                          </View>
                        </View>
                        <Text style={styles.itemDate}>{formatShortDate(item.expirationDate, languageCode)}</Text>
                        <Ionicons color={palette.muted} name="chevron-forward" size={18} />
                      </Pressable>
                    </Link>
                  </View>
                ))}
              </Card>
            </View>
          ))}
          {visibleExpiringPage.hasMore ? (
            <Button
              compact
              icon="add-circle-outline"
              onPress={() => setExpiringPage(visibleExpiringPage.nextPage)}
              secondary>
              {t('loadMoreExpiringItems')}
            </Button>
          ) : null}
        </View>
      ) : (
        <Card style={styles.listCard}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('nothingExpiringSoon')}</Text>
            <Text style={styles.emptyCopy}>{t('noItemsExpireWithinWindow')}</Text>
          </View>
        </Card>
      )}

      <Button href="/expiration-reminders" icon="notifications-outline" secondary>
        {t('reminderSettings')}
      </Button>
    </Screen>
  );
}

function formatShortDate(expirationDate: string | undefined, languageCode: string) {
  if (!expirationDate) {
    return '--';
  }

  return new Intl.DateTimeFormat(languageCode, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${expirationDate}T12:00:00`));
}

function formatExpirationGroupTitle(key: string, t: ReturnType<typeof useAppLanguage>['t']) {
  const daysUntilExpiration = Number(key.replace('expires-', ''));

  if (!Number.isFinite(daysUntilExpiration)) {
    return key;
  }

  const label = daysUntilExpiration <= 0
    ? t('today')
    : daysUntilExpiration === 1
      ? t('tomorrow')
      : t('inDays', { days: daysUntilExpiration });

  return t('expires', { label });
}

const styles = StyleSheet.create({
  summaryCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    flexDirection: 'row',
    gap: 12,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: palette.blush,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  summaryCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  summaryTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: '900',
  },
  summaryText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: 10,
  },
  groups: {
    gap: 22,
  },
  listCard: {
    gap: 0,
    padding: 0,
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: '100%',
  },
  withDivider: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
  },
  itemIcon: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 52,
  },
  itemCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  itemName: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 16,
    fontWeight: '900',
  },
  itemMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemDate: {
    color: palette.red,
    fontSize: 12,
    fontWeight: '800',
    minWidth: 44,
    textAlign: 'right',
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
