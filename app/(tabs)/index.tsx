import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Href, Link, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ExpirationText, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useRefresh } from '@/hooks/use-refresh';
import {
  buildExpiryReminderPlan,
  defaultExpiryReminderSettings,
  ExpiryReminderSettings,
  getExpiryReminderSettings,
  getExpiringReminderItems,
} from '@/lib/expiry-reminders';
import { getErrorMessage, getPantryItems } from '@/lib/pantry';
import { getSavedRecipes } from '@/lib/recipes';
import { PantryItem, Recipe } from '@/types/useitup';

const foodImages: Record<string, string> = {
  steak: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=240&q=80',
  spinach: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=240&q=80',
  milk: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=240&q=80',
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [reminderSettings, setReminderSettings] = useState<ExpiryReminderSettings>(defaultExpiryReminderSettings);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadPantryItems = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const nextItems = await getPantryItems(user.id);
      setPantryItems(nextItems);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to load pantry summary.'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadSavedRecipes = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const nextRecipes = await getSavedRecipes(user.id);
      setSavedRecipes(nextRecipes);
    } catch {
      setSavedRecipes([]);
    }
  }, [user]);

  const loadReminderSettings = useCallback(async () => {
    setReminderSettings(await getExpiryReminderSettings());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPantryItems();
      loadSavedRecipes();
      loadReminderSettings();
    }, [loadPantryItems, loadReminderSettings, loadSavedRecipes]),
  );

  const { isRefreshing, refresh } = useRefresh(async () => {
    await Promise.all([loadPantryItems(), loadSavedRecipes(), loadReminderSettings()]);
  });

  const expiringItems = useMemo(
    () => getExpiringReminderItems(pantryItems, reminderSettings),
    [pantryItems, reminderSettings],
  );
  const expiringPreviewItems = expiringItems.slice(0, 3);

  const fridgeCount = pantryItems.filter((item) => item.storageLocation === 'fridge').length;
  const freezerCount = pantryItems.filter((item) => item.storageLocation === 'freezer').length;
  const pantryCount = pantryItems.filter((item) => item.storageLocation === 'pantry').length;
  const displayName = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'there';
  const suggestedRecipes = savedRecipes;
  const reminderPlan = useMemo(
    () => buildExpiryReminderPlan(pantryItems, { ...reminderSettings, enabled: true }),
    [pantryItems, reminderSettings],
  );

  return (
    <Screen onRefresh={refresh} refreshing={isRefreshing}>
      <View style={styles.appHeader}>
        <Text style={styles.logo}>UseItUp</Text>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel="Open expiring soon alerts" onPress={() => setIsBellOpen(true)} style={styles.iconButton}>
            <Ionicons color={palette.ink} name={reminderPlan.length ? 'notifications' : 'notifications-outline'} size={20} />
            {reminderPlan.length > 0 ? <View style={styles.notificationDot} /> : null}
          </Pressable>
          <View style={styles.iconButton}>
            <Ionicons color={palette.ink} name="options-outline" size={20} />
          </View>
        </View>
      </View>

      <Card style={styles.greetingCard}>
        <View style={styles.greetingCopy}>
          <Text style={styles.greeting}>Good afternoon</Text>
          <Text numberOfLines={2} style={styles.greetingName}>{displayName}</Text>
          <Text style={styles.heroCopy}>Let&apos;s make the most of what you have.</Text>
        </View>
        <View style={styles.greetingIcon}>
          <Ionicons color={palette.green} name="leaf-outline" size={24} />
        </View>
      </Card>

      <View style={styles.heroGrid}>
        <View style={styles.statPair}>
          <Card style={styles.alertTile}>
            <View style={styles.tileTopRow}>
              <View style={styles.alertIconSmall}>
                <Ionicons color={palette.red} name="alert" size={18} />
              </View>
              <Text style={styles.tileValue}>{expiringItems.length}</Text>
            </View>
            <Text style={styles.tileLabel}>expiring soon</Text>
          </Card>
          <Card style={styles.trackedTile}>
            <View style={styles.tileTopRow}>
              <View style={styles.trackedIconSmall}>
                <Ionicons color={palette.blue} name="cube-outline" size={18} />
              </View>
              <Text style={styles.tileValue}>{pantryItems.length}</Text>
            </View>
            <Text style={styles.tileLabel}>items tracked</Text>
            <Text style={styles.tileBreakdown}>
              {isLoading ? 'Loading pantry...' : `${fridgeCount} fridge · ${freezerCount} freezer · ${pantryCount} pantry`}
            </Text>
          </Card>
        </View>
        <Button href="/(tabs)/recipes" icon="sparkles-outline">
          Cook What I Have
        </Button>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <SectionTitle>Expiring Soon</SectionTitle>
          <Link asChild href="/expiring-soon">
            <Pressable hitSlop={10}>
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          </Link>
        </View>
        <Card style={styles.expiringCard}>
          {errorMessage ? (
            <View style={styles.emptyExpiring}>
              <Text style={styles.emptyTitle}>Could not load pantry summary</Text>
              <Text style={styles.emptyCopy}>{errorMessage}</Text>
            </View>
          ) : isLoading ? (
            <View style={styles.emptyExpiring}>
              <Text style={styles.emptyTitle}>Loading expiring items...</Text>
            </View>
          ) : expiringPreviewItems.length ? (
            expiringPreviewItems.map((item, index) => (
              <View key={item.id} style={index > 0 && styles.withDivider}>
                <Link asChild href={`/pantry-item/${item.id}`}>
                  <Pressable style={styles.expiringRow}>
                    <FoodThumb item={item} />
                    <View style={styles.expiringCopy}>
                      <Text numberOfLines={1} style={styles.foodName}>
                        {item.name}
                      </Text>
                      <ExpirationText expirationDate={item.expirationDate} />
                    </View>
                    <View style={styles.expiringMeta}>
                      <Text style={styles.itemDate}>{formatShortDate(item.expirationDate)}</Text>
                      <Ionicons color={palette.muted} name="chevron-forward" size={18} />
                    </View>
                  </Pressable>
                </Link>
              </View>
            ))
          ) : (
            <View style={styles.emptyExpiring}>
              <Text style={styles.emptyTitle}>Nothing expiring soon</Text>
              <Text style={styles.emptyCopy}>Add expiration dates to see priority items here.</Text>
            </View>
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <SectionTitle>Suggested Meals</SectionTitle>
          <Link asChild href="/(tabs)/recipes">
            <Pressable hitSlop={10}>
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          </Link>
        </View>
        {suggestedRecipes.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.mealRow}>
              {suggestedRecipes.slice(0, 6).map((recipe) => (
                <Link asChild href={`/recipe/${recipe.id}`} key={recipe.id}>
                  <Pressable style={styles.mealCard}>
                    <View style={styles.mealImageFallback}>
                      <Ionicons color={palette.green} name="restaurant-outline" size={24} />
                    </View>
                    <View style={styles.timePill}>
                      <Ionicons color={palette.ink} name="time-outline" size={12} />
                      <Text style={styles.timePillText}>{recipe.prepTimeMinutes ?? '--'} min</Text>
                    </View>
                    <Text numberOfLines={2} style={styles.mealTitle}>
                      {recipe.title}
                    </Text>
                    <Text style={styles.mealTag}>
                      {recipe.usesExpiringItems ? 'High Protein' : 'Quick & Easy'}
                    </Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Card style={styles.expiringCard}>
            <View style={styles.emptyExpiring}>
              <Text style={styles.emptyTitle}>No suggested meals yet</Text>
              <Text style={styles.emptyCopy}>Generate recipes from your pantry to see meal ideas here.</Text>
            </View>
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle>Pantry Summary</SectionTitle>
        <Card style={styles.statsCard}>
          <StatTile icon="cube-outline" label="Items" value={pantryItems.length} />
          <StatTile icon="snow-outline" label="Frozen" value={freezerCount} />
          <StatTile icon="file-tray-outline" label="Fridge" value={fridgeCount} />
          <StatTile icon="storefront-outline" label="Pantry" value={pantryCount} />
        </Card>
      </View>
      <BellPreviewModal
        onClose={() => setIsBellOpen(false)}
        reminders={reminderPlan}
        settings={reminderSettings}
        visible={isBellOpen}
      />
    </Screen>
  );
}

function BellPreviewModal({
  onClose,
  reminders,
  settings,
  visible,
}: {
  onClose: () => void;
  reminders: ReturnType<typeof buildExpiryReminderPlan>;
  settings: ExpiryReminderSettings;
  visible: boolean;
}) {
  const previewReminders = reminders.slice(0, 3);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.bellBackdrop}>
        <Pressable onPress={() => {}} style={styles.bellCard}>
          <View style={styles.bellHeader}>
            <View>
              <Text style={styles.bellTitle}>Expiring Soon</Text>
              <Text style={styles.bellSubtitle}>
                Within {settings.daysAhead} day{settings.daysAhead === 1 ? '' : 's'}
              </Text>
            </View>
            <Pressable accessibilityLabel="Close expiring soon alerts" hitSlop={10} onPress={onClose}>
              <Ionicons color={palette.muted} name="close" size={22} />
            </Pressable>
          </View>

          {previewReminders.length ? (
            <View style={styles.bellList}>
              {previewReminders.map((reminder, index) => (
                <Pressable
                  key={reminder.identifier}
                  onPress={() => {
                    onClose();
                    router.push(`/pantry-item/${reminder.itemId}` as Href);
                  }}
                  style={[styles.bellRow, index > 0 && styles.bellDivider]}>
                  <View style={styles.bellItemIcon}>
                    <Ionicons color={palette.green} name="leaf-outline" size={18} />
                  </View>
                  <View style={styles.bellRowCopy}>
                    <Text numberOfLines={1} style={styles.bellItemName}>{reminder.itemName}</Text>
                    <Text style={styles.bellItemDetail}>Expires {formatReminderExpiration(reminder.daysUntilExpiration)}</Text>
                  </View>
                  <Ionicons color={palette.muted} name="chevron-forward" size={18} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.bellEmpty}>
              <Text style={styles.bellEmptyTitle}>No items need attention</Text>
              <Text style={styles.bellEmptyCopy}>Nothing expires within your current reminder window.</Text>
            </View>
          )}

          <View style={styles.bellActions}>
            <Pressable
              onPress={() => {
                onClose();
                router.push('/expiring-soon' as Href);
              }}
              style={styles.bellPrimaryAction}>
              <Text style={styles.bellPrimaryActionText}>More</Text>
              <Ionicons color="#fff" name="arrow-forward" size={16} />
            </Pressable>
            <Pressable
              onPress={() => {
                onClose();
                router.push('/expiration-reminders' as Href);
              }}
              style={styles.bellSecondaryAction}>
              <Text style={styles.bellSecondaryActionText}>Reminder Settings</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function formatReminderExpiration(daysUntilExpiration: number) {
  if (daysUntilExpiration <= 0) {
    return 'today';
  }

  if (daysUntilExpiration === 1) {
    return 'tomorrow';
  }

  return `in ${daysUntilExpiration} days`;
}

function FoodThumb({ item }: { item: PantryItem }) {
  const imageUrl = foodImages[item.normalizedName ?? item.id];

  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={styles.foodThumb} />;
  }

  return (
    <View style={styles.foodThumbFallback}>
      <Ionicons color={palette.green} name={getCategoryIcon(item.category)} size={22} />
    </View>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statTile}>
      <Ionicons color={palette.green} name={icon} size={20} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  appHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logo: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: 0,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    width: 40,
  },
  notificationDot: {
    backgroundColor: palette.red,
    borderRadius: 4,
    height: 8,
    position: 'absolute',
    right: 10,
    top: 9,
    width: 8,
  },
  bellBackdrop: {
    backgroundColor: 'rgba(52, 42, 34, 0.28)',
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 84,
  },
  bellCard: {
    alignSelf: 'center',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    maxWidth: 430,
    padding: 14,
    width: '100%',
  },
  bellHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bellTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: '900',
  },
  bellSubtitle: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  bellList: {
    borderColor: palette.line,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bellRow: {
    alignItems: 'center',
    backgroundColor: palette.card,
    flexDirection: 'row',
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  bellDivider: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
  },
  bellItemIcon: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  bellRowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  bellItemName: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 15,
    fontWeight: '900',
  },
  bellItemDetail: {
    color: palette.red,
    fontSize: 13,
    fontWeight: '800',
  },
  bellEmpty: {
    backgroundColor: palette.surface,
    borderRadius: 10,
    gap: 4,
    padding: 12,
  },
  bellEmptyTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 16,
    fontWeight: '900',
  },
  bellEmptyCopy: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  bellActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bellPrimaryAction: {
    alignItems: 'center',
    backgroundColor: palette.blue,
    borderRadius: 10,
    flexDirection: 'row',
    flexGrow: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  bellPrimaryActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  bellSecondaryAction: {
    alignItems: 'center',
    backgroundColor: palette.blueSoft,
    borderRadius: 10,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  bellSecondaryActionText: {
    color: palette.blue,
    fontSize: 14,
    fontWeight: '900',
  },
  greetingCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    flexDirection: 'row',
    gap: 14,
  },
  greetingCopy: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  greetingName: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    letterSpacing: 0,
  },
  heroCopy: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  greetingIcon: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  heroGrid: {
    gap: 12,
  },
  statPair: {
    flexDirection: 'row',
    gap: 10,
  },
  alertTile: {
    backgroundColor: palette.greenSoft,
    flex: 1,
  },
  trackedTile: {
    backgroundColor: palette.card,
    flex: 1,
  },
  tileBreakdown: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  tileTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  tileValue: {
    color: palette.ink,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
  },
  tileLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  alertIconSmall: {
    alignItems: 'center',
    backgroundColor: palette.blush,
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  trackedIconSmall: {
    alignItems: 'center',
    backgroundColor: palette.blueSoft,
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
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
    fontWeight: '800',
  },
  expiringCard: {
    gap: 0,
    padding: 0,
  },
  expiringRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  withDivider: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
  },
  foodThumb: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    height: 52,
    width: 52,
  },
  foodThumbFallback: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  expiringCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  foodName: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  itemDate: {
    color: palette.red,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'right',
  },
  expiringMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 6,
  },
  emptyExpiring: {
    gap: 5,
    padding: 14,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyCopy: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  mealRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 18,
  },
  mealCard: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 10,
    width: 142,
  },
  mealImageFallback: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    height: 88,
    justifyContent: 'center',
    width: '100%',
  },
  timePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 3,
    marginLeft: 8,
    marginTop: -78,
    minHeight: 24,
    paddingHorizontal: 7,
  },
  timePillText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  mealTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 17,
    marginTop: 60,
    paddingHorizontal: 9,
  },
  mealTag: {
    color: palette.blue,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    paddingHorizontal: 9,
  },
  statsCard: {
    flexDirection: 'row',
    gap: 0,
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  statTile: {
    alignItems: 'center',
    borderRightColor: palette.line,
    borderRightWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 3,
    paddingVertical: 8,
  },
  statValue: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
  },
});
