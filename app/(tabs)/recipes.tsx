import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, palette, RecipeCard, Screen } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { recipes } from '@/data/mock-useitup';
import { setGeneratedRecipes } from '@/lib/generated-recipes';
import { getPantryItems } from '@/lib/pantry';
import { generateRecipes } from '@/lib/recipe-generator';
import { PantryItem, Recipe } from '@/types/useitup';

type RecipeSort = 'expiring' | 'quick' | 'missing';

const sorts: { label: string; value: RecipeSort }[] = [
  { label: 'Expiring Soon', value: 'expiring' },
  { label: 'Quick', value: 'quick' },
  { label: 'Fewest Missing', value: 'missing' },
];

export default function RecipesScreen() {
  const { user } = useAuth();
  const [sort, setSort] = useState<RecipeSort>('expiring');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [generated, setGenerated] = useState<Recipe[]>([]);
  const [isLoadingPantry, setIsLoadingPantry] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const activeRecipes = generated.length ? generated : recipes;
  const sortedRecipes = useMemo(() => sortRecipes(activeRecipes, sort), [activeRecipes, sort]);

  const loadPantry = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoadingPantry(true);

    try {
      const nextItems = await getPantryItems(user.id);
      setPantryItems(nextItems);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to load pantry items for recipe generation.'));
    } finally {
      setIsLoadingPantry(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPantry();
    }, [loadPantry]),
  );

  async function handleGenerate() {
    if (!pantryItems.length || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setMessage('');

    try {
      const nextRecipes = await generateRecipes({
        pantryItems,
        preferences: {
          maxPrepTimeMinutes: 30,
          prioritizeExpiringSoon: true,
        },
      });

      if (!nextRecipes.length) {
        setMessage('The generator did not return any recipes. Try adding more pantry items.');
      }

      setGenerated(nextRecipes);
      setGeneratedRecipes(nextRecipes);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to generate recipes yet. Showing sample meals for now.'));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Screen title="Meals You Can Make" subtitle="Generate meal ideas from your real pantry items.">
      <Card style={styles.generatorCard}>
        <Text style={styles.generatorTitle}>Cook from your pantry</Text>
        <Text style={styles.generatorCopy}>
          {isLoadingPantry
            ? 'Loading pantry items...'
            : pantryItems.length
              ? `${pantryItems.length} pantry items ready for recipe generation.`
              : 'Add pantry items before generating recipes.'}
        </Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Button icon="sparkles-outline" onPress={handleGenerate}>
          {isGenerating ? 'Generating...' : generated.length ? 'Regenerate Recipes' : 'Generate Recipes'}
        </Button>
        {isGenerating ? <ActivityIndicator color={palette.blue} /> : null}
      </Card>

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
      <Text style={styles.note}>
        {generated.length
          ? 'Generated recipes are not saved yet. Save/history comes in the next Phase 3 slice.'
          : 'Sample suggestions are shown until you generate recipes from your pantry.'}
      </Text>
      <View style={styles.list}>
        {sortedRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </View>
    </Screen>
  );
}

function sortRecipes(nextRecipes: Recipe[], sort: RecipeSort) {
  return [...nextRecipes].sort((left, right) => {
    if (sort === 'quick') {
      return (left.prepTimeMinutes ?? 0) - (right.prepTimeMinutes ?? 0);
    }

    if (sort === 'missing') {
      return left.missingIngredients.length - right.missingIngredients.length;
    }

    return Number(Boolean(right.usesExpiringItems)) - Number(Boolean(left.usesExpiringItems));
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }

  return fallback;
}

const styles = StyleSheet.create({
  generatorCard: {
    backgroundColor: palette.surface,
  },
  generatorTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  generatorCopy: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  message: {
    color: palette.red,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
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
