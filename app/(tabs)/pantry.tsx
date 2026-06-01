import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  ExpirationText,
  palette,
  PantryArtworkImage,
  QuantityText,
  Screen,
  SectionTitle,
  typography,
} from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useRefresh } from '@/hooks/use-refresh';
import { getErrorMessage } from '@/lib/errors';
import { getPantryItems } from '@/lib/pantry';
import { PantryItem, StorageLocation } from '@/types/useitup';

type PantryFilter = 'all' | StorageLocation | 'expiring';

const filters: { label: string; value: PantryFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Fridge', value: 'fridge' },
  { label: 'Freezer', value: 'freezer' },
  { label: 'Pantry', value: 'pantry' },
  { label: 'Expiring Soon', value: 'expiring' },
];

export default function PantryScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PantryFilter>('all');
  const [items, setItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadPantryItems = useCallback(async () => {
    if (!user) {
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const nextItems = await getPantryItems(user.id);
      setItems(nextItems);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to load pantry items.'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPantryItems();
    }, [loadPantryItems]),
  );

  useEffect(() => {
    if (isPantryFilter(params.filter)) {
      setFilter(params.filter);
    }
  }, [params.filter]);

  const { isRefreshing, refresh } = useRefresh(loadPantryItems);

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesQuery = item.name.toLowerCase().includes(query.trim().toLowerCase());
        const matchesFilter =
          filter === 'all' ||
          item.storageLocation === filter ||
          (filter === 'expiring' && Boolean(item.expirationDate));

        return matchesQuery && matchesFilter;
      }),
    [filter, items, query],
  );
  const groupedItems = useMemo(() => groupItemsByCategory(visibleItems), [visibleItems]);

  return (
    <Screen
      onRefresh={refresh}
      refreshing={isRefreshing}
      title="My Pantry"
      subtitle={`${items.length} item${items.length === 1 ? '' : 's'} available`}>
      <View style={styles.actionRow}>
        <View style={styles.actionButtonSlot}>
          <Button href="/add-item" icon="add" style={styles.actionButton}>
            Add Item
          </Button>
        </View>
        <View style={styles.actionButtonSlot}>
          <Button href="/(tabs)/recipes" icon="restaurant-outline" secondary style={styles.actionButton}>
            Get Recipes
          </Button>
        </View>
      </View>

      <View style={styles.search}>
        <Ionicons color={palette.muted} name="search" size={18} />
        <TextInput
          accessibilityLabel="Search pantry"
          onChangeText={setQuery}
          placeholder="Search items"
          placeholderTextColor={palette.muted}
          style={styles.searchInput}
          value={query}
        />
      </View>
      <View style={styles.chips}>
        {filters.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            onPress={() => setFilter(option.value)}
            selected={filter === option.value}
          />
        ))}
      </View>
      {isLoading ? (
        <Card style={styles.stateCard}>
          <ActivityIndicator color={palette.blue} />
          <Text style={styles.stateText}>Loading pantry items...</Text>
        </Card>
      ) : errorMessage ? (
        <Card style={styles.stateCard}>
          <Ionicons color={palette.red} name="alert-circle-outline" size={24} />
          <Text style={styles.stateTitle}>Could not load pantry</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <Button compact onPress={loadPantryItems} secondary icon="refresh-outline">
            Try Again
          </Button>
        </Card>
      ) : visibleItems.length ? (
        <View style={styles.groups}>
          {groupedItems.map((group) => (
            <View key={group.title} style={styles.group}>
              <SectionTitle>{group.title}</SectionTitle>
              <View style={styles.groupList}>
                {group.items.map((item) => (
                  <PantryListItem item={item} key={item.id} />
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Card style={styles.stateCard}>
          <Ionicons color={palette.green} name="basket-outline" size={24} />
          <Text style={styles.stateTitle}>{items.length ? 'No matching items' : 'Your pantry is empty'}</Text>
          <Text style={styles.stateText}>
            {items.length
              ? 'Try a different search or filter.'
              : 'Add your first item so UseItUp can start tracking what should be used soon.'}
          </Text>
          {!items.length ? (
            <Button compact href="/add-item" icon="add">
              Add Item
            </Button>
          ) : null}
        </Card>
      )}
    </Screen>
  );
}

function PantryListItem({ item }: { item: PantryItem }) {
  return (
    <Link asChild href={`/pantry-item/${item.id}`}>
      <Pressable>
        <Card style={styles.pantryItem}>
          <PantryArtworkImage item={item} style={styles.itemImage} />
          <View style={styles.itemCopy}>
            <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemMeta}>
              <QuantityText item={item} />
              <Text style={styles.metaDot}>.</Text>
              <ExpirationText expirationDate={item.expirationDate} />
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

function groupItemsByCategory(items: PantryItem[]) {
  const groups = new Map<string, PantryItem[]>();

  items.forEach((item) => {
    const title = titleCase(item.category || 'Other');
    groups.set(title, [...(groups.get(title) ?? []), item]);
  });

  return [...groups.entries()].map(([title, groupItems]) => ({ title, items: groupItems }));
}

function titleCase(value: string) {
  return value
    .split(' ')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function isPantryFilter(value: string | undefined): value is PantryFilter {
  return value === 'all' || value === 'fridge' || value === 'freezer' || value === 'pantry' || value === 'expiring';
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonSlot: {
    flex: 1,
  },
  actionButton: {
    minHeight: 52,
    width: '100%',
  },
  search: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  searchInput: {
    color: palette.ink,
    flex: 1,
    fontSize: 16,
    minHeight: 46,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groups: {
    gap: 24,
  },
  group: {
    gap: 10,
  },
  groupList: {
    gap: 8,
  },
  pantryItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 82,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  itemImage: {
    backgroundColor: palette.greenSoft,
    borderRadius: 10,
    height: 58,
    overflow: 'hidden',
    width: 58,
  },
  itemCopy: {
    flex: 1,
    gap: 6,
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
    gap: 7,
  },
  metaDot: {
    color: palette.muted,
    fontSize: 14,
  },
  stateCard: {
    alignItems: 'flex-start',
  },
  stateTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  stateText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
