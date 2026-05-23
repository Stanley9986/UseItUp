import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, palette, PantryCard, Screen, SectionTitle } from '@/components/useitup/ui';
import { pantryItems } from '@/data/mock-useitup';
import { StorageLocation } from '@/types/useitup';

type PantryFilter = 'all' | StorageLocation | 'expiring';

const filters: { label: string; value: PantryFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Fridge', value: 'fridge' },
  { label: 'Freezer', value: 'freezer' },
  { label: 'Pantry', value: 'pantry' },
  { label: 'Expiring Soon', value: 'expiring' },
];

export default function PantryScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PantryFilter>('all');

  const visibleItems = useMemo(
    () =>
      pantryItems.filter((item) => {
        const matchesQuery = item.name.toLowerCase().includes(query.trim().toLowerCase());
        const matchesFilter =
          filter === 'all' ||
          item.storageLocation === filter ||
          (filter === 'expiring' && Boolean(item.expirationDate));

        return matchesQuery && matchesFilter;
      }),
    [filter, query]
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
      <View style={styles.list}>
        {visibleItems.map((item) => (
          <PantryCard item={item} key={item.id} showEdit />
        ))}
      </View>
    </Screen>
  );
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
});
