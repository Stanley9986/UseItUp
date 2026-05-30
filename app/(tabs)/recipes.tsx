import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, palette, RecipeCard, Screen, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { recipes } from '@/data/mock-useitup';
import { useRefresh } from '@/hooks/use-refresh';
import { setGeneratedRecipes } from '@/lib/generated-recipes';
import { getPantryItems } from '@/lib/pantry';
import { generateRecipes } from '@/lib/recipe-generator';
import { getSavedRecipes, saveGeneratedRecipes } from '@/lib/recipes';
import { PantryItem, Recipe } from '@/types/useitup';

type RecipeSort = 'expiring' | 'quick' | 'missing';

const sorts: { label: string; value: RecipeSort }[] = [
  { label: 'Expiring Soon', value: 'expiring' },
  { label: 'Quick', value: 'quick' },
  { label: 'Fewest Missing', value: 'missing' },
];

const generationSteps = [
  'Reading your pantry...',
  'Prioritizing expiring items...',
  'Sketching recipe 1...',
  'Checking recipe 1 ingredients...',
  'Sketching recipe 2...',
  'Checking recipe 2 ingredients...',
  'Sketching recipe 3...',
  'Checking recipe 3 ingredients...',
  'Balancing prep times...',
  'Plating the best options...',
  'Finishing the recipe cards...',
];

const generationStepIntervalMs = 2000;

export default function RecipesScreen() {
  const { user } = useAuth();
  const [sort, setSort] = useState<RecipeSort>('expiring');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [generated, setGenerated] = useState<Recipe[]>([]);
  const [isLoadingPantry, setIsLoadingPantry] = useState(true);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepIndex, setGenerationStepIndex] = useState(0);
  const [message, setMessage] = useState('');
  const activeRecipes = generated.length ? generated : recipes;
  const sortedRecipes = useMemo(() => sortRecipes(activeRecipes, sort), [activeRecipes, sort]);

  const loadSavedRecipes = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoadingRecipes(true);

    try {
      const savedRecipes = await getSavedRecipes(user.id);
      setGenerated(savedRecipes);
      setGeneratedRecipes(savedRecipes);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to load saved recipes. Showing sample meals for now.'));
    } finally {
      setIsLoadingRecipes(false);
    }
  }, [user]);

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
      loadSavedRecipes();
    }, [loadPantry, loadSavedRecipes]),
  );

  const { isRefreshing, refresh } = useRefresh(async () => {
    await Promise.all([loadPantry(), loadSavedRecipes()]);
  });

  useEffect(() => {
    if (!isGenerating) {
      setGenerationStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setGenerationStepIndex((current) => Math.min(current + 1, generationSteps.length - 1));
    }, generationStepIntervalMs);

    return () => clearInterval(interval);
  }, [isGenerating]);

  async function handleGenerate() {
    if (!user || !pantryItems.length || isGenerating) {
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

      const savedRecipes = await saveGeneratedRecipes(user.id, nextRecipes);
      setGenerated(savedRecipes);
      setGeneratedRecipes(savedRecipes);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to generate recipes yet. Showing sample meals for now.'));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Screen
      onRefresh={isGenerating ? undefined : refresh}
      refreshing={isRefreshing}
      title="Meals You Can Make"
      subtitle="Generate meal ideas from your real pantry items.">
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
        {isGenerating ? (
          <View style={styles.progressBox}>
            <ActivityIndicator color={palette.blue} />
            <View style={styles.progressCopy}>
              <Text style={styles.progressTitle}>{generationSteps[generationStepIndex]}</Text>
              <View style={styles.progressDots}>
                {generationSteps.map((step, index) => (
                  <View
                    key={step}
                    style={[styles.progressDot, index <= generationStepIndex && styles.activeProgressDot]}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : null}
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
      {!isGenerating ? (
        <Text style={styles.note}>
          {generated.length
            ? 'Generated recipes are saved to your account and will stay available here.'
            : 'Sample suggestions are shown until you generate recipes from your pantry.'}
        </Text>
      ) : null}
      <View style={styles.list}>
        {isLoadingRecipes && !isGenerating ? (
          <RecipeSkeleton index={0} />
        ) : isGenerating
          ? [0, 1, 2].map((item) => <RecipeSkeleton key={item} index={item} />)
          : sortedRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
      </View>
    </Screen>
  );
}

function RecipeSkeleton({ index }: { index: number }) {
  return (
    <Card style={styles.skeletonCard}>
      <View style={styles.skeletonImage}>
        <ActivityIndicator color={palette.green} />
      </View>
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonHeader}>
          <View style={[styles.skeletonLine, styles.skeletonTag]} />
          <Text style={styles.skeletonNumber}>Recipe {index + 1}</Text>
        </View>
        <View style={[styles.skeletonLine, styles.skeletonTitle]} />
        <View style={[styles.skeletonLine, styles.skeletonCopy]} />
        <View style={[styles.skeletonLine, styles.skeletonCopyShort]} />
      </View>
    </Card>
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
    fontFamily: typography.display,
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
  progressBox: {
    alignItems: 'center',
    backgroundColor: palette.blueSoft,
    borderColor: '#c7d8ff',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  progressCopy: {
    flex: 1,
    gap: 8,
  },
  progressTitle: {
    color: palette.blue,
    fontSize: 14,
    fontWeight: '800',
  },
  progressDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  progressDot: {
    backgroundColor: '#d8c8b8',
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  activeProgressDot: {
    backgroundColor: palette.blue,
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
  skeletonCard: {
    gap: 0,
    overflow: 'hidden',
    padding: 0,
  },
  skeletonImage: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    height: 118,
    justifyContent: 'center',
    width: '100%',
  },
  skeletonBody: {
    gap: 10,
    padding: 14,
  },
  skeletonHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonLine: {
    backgroundColor: palette.line,
    borderRadius: 999,
    height: 14,
  },
  skeletonTag: {
    backgroundColor: palette.blush,
    height: 30,
    width: 140,
  },
  skeletonNumber: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  skeletonTitle: {
    height: 22,
    width: '68%',
  },
  skeletonCopy: {
    width: '92%',
  },
  skeletonCopyShort: {
    width: '56%',
  },
});
