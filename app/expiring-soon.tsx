import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, palette, QuantityText, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useRefresh } from '@/hooks/use-refresh';
import {
  defaultExpiryReminderSettings,
  ExpiryReminderSettings,
  groupExpiringReminderItems,
  getExpiryReminderSettings,
  getExpiringReminderItems,
} from '@/lib/expiry-reminders';
import { getErrorMessage } from '@/lib/errors';
import { safeBack } from '@/lib/navigation';
import { getPantryItems } from '@/lib/pantry';
import { PantryItem } from '@/types/useitup';

export default function ExpiringSoonScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [settings, setSettings] = useState<ExpiryReminderSettings>(defaultExpiryReminderSettings);
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
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Unable to load expiring items.'));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [user],
  );

  const { isRefreshing, refresh } = useRefresh(() => loadExpiringSoon({ showLoading: false }));

  useEffect(() => {
    loadExpiringSoon();
  }, [loadExpiringSoon]);

  const expiringItems = useMemo(
    () => getExpiringReminderItems(items, settings),
    [items, settings],
  );
  const expiringGroups = useMemo(
    () => groupExpiringReminderItems(expiringItems),
    [expiringItems],
  );

  return (
    <Screen
      onRefresh={refresh}
      refreshing={isRefreshing}
      title="Expiring Soon"
      subtitle={`Food expiring within ${settings.daysAhead} day${settings.daysAhead === 1 ? '' : 's'}.`}
      headerAction={<Button compact onPress={() => safeBack('/(tabs)')} secondary icon="arrow-back">Back</Button>}>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons color={palette.red} name="alert" size={22} />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>{expiringItems.length} item{expiringItems.length === 1 ? '' : 's'} need attention</Text>
          <Text style={styles.summaryText}>This uses the same window as your expiration reminders.</Text>
        </View>
      </Card>

      {errorMessage ? (
        <Card style={styles.listCard}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Could not load items</Text>
            <Text style={styles.emptyCopy}>{errorMessage}</Text>
          </View>
        </Card>
      ) : isLoading ? (
        <Card style={styles.listCard}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Loading expiring items...</Text>
          </View>
        </Card>
      ) : expiringGroups.length ? (
        <View style={styles.groups}>
          {expiringGroups.map((group) => (
            <View key={group.key} style={styles.section}>
              <SectionTitle>{group.title}</SectionTitle>
              <Card style={styles.listCard}>
                {group.items.map((item, index) => (
                  <View key={item.id} style={index > 0 && styles.withDivider}>
                    <Link asChild href={`/pantry-item/${item.id}`}>
                      <Pressable style={styles.itemRow}>
                        <View style={styles.itemIcon}>
                          <Ionicons color={palette.green} name={getCategoryIcon(item.category)} size={22} />
                        </View>
                        <View style={styles.itemCopy}>
                          <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
                          <View style={styles.itemMeta}>
                            <QuantityText item={item} />
                          </View>
                        </View>
                        <Text style={styles.itemDate}>{formatShortDate(item.expirationDate)}</Text>
                        <Ionicons color={palette.muted} name="chevron-forward" size={18} />
                      </Pressable>
                    </Link>
                  </View>
                ))}
              </Card>
            </View>
          ))}
        </View>
      ) : (
        <Card style={styles.listCard}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing expiring soon</Text>
            <Text style={styles.emptyCopy}>No pantry items expire within your current reminder window.</Text>
          </View>
        </Card>
      )}

      <Button href="/expiration-reminders" icon="notifications-outline" secondary>
        Reminder Settings
      </Button>
    </Screen>
  );
}

function formatShortDate(expirationDate?: string) {
  if (!expirationDate) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${expirationDate}T12:00:00`));
}

function getCategoryIcon(category?: string) {
  if (category === 'meat') {
    return 'restaurant-outline' as const;
  }

  if (category === 'produce') {
    return 'leaf-outline' as const;
  }

  if (category === 'dairy') {
    return 'water-outline' as const;
  }

  if (category === 'grain') {
    return 'grid-outline' as const;
  }

  return 'basket-outline' as const;
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
