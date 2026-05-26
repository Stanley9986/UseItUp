import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, palette, PantryCard, Screen, SectionTitle } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
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
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPantryItems();
    }, [loadPantryItems]),
  );

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

  return (
    <Screen
      title="Pantry"
      subtitle="Keep quantities rough and focus on what should be used soon."
      headerAction={<Button compact href="/add-item" icon="add">Add</Button>}>
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
      <SectionTitle>{visibleItems.length} Tracked Items</SectionTitle>
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
        <View style={styles.list}>
          {visibleItems.map((item) => (
            <PantryCard item={item} key={item.id} showEdit />
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }

  return 'Unable to load pantry items.';
}

const styles = StyleSheet.create({
  search: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
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
  list: {
    gap: 10,
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
