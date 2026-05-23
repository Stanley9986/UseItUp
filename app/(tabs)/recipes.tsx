import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip, palette, RecipeCard, Screen } from '@/components/useitup/ui';
import { recipes } from '@/data/mock-useitup';

type RecipeSort = 'expiring' | 'quick' | 'missing';

const sorts: { label: string; value: RecipeSort }[] = [
  { label: 'Expiring Soon', value: 'expiring' },
  { label: 'Quick', value: 'quick' },
  { label: 'Fewest Missing', value: 'missing' },
];

export default function RecipesScreen() {
  const [sort, setSort] = useState<RecipeSort>('expiring');
  const sortedRecipes = [...recipes].sort((left, right) => {
    if (sort === 'quick') {
      return (left.prepTimeMinutes ?? 0) - (right.prepTimeMinutes ?? 0);
    }

    if (sort === 'missing') {
      return left.missingIngredients.length - right.missingIngredients.length;
    }

    return Number(Boolean(right.usesExpiringItems)) - Number(Boolean(left.usesExpiringItems));
  });

  return (
    <Screen title="Meals You Can Make" subtitle="Fake suggestions from the food already on your shelf.">
      <View style={styles.filterRow}>
        {sorts.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            onPress={() => setSort(option.value)}
            selected={sort === option.value}
          />
        ))}
      </View>
      <Text style={styles.note}>Prioritizing steak, spinach, and milk before they expire.</Text>
      <View style={styles.list}>
        {sortedRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  note: {
    backgroundColor: palette.blueSoft,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.graphite,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    padding: 12,
  },
  list: {
    gap: 10,
  },
});
