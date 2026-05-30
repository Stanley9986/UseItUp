import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Card, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { findRecipe } from '@/data/mock-useitup';
import { useRefresh } from '@/hooks/use-refresh';
import { findGeneratedRecipe } from '@/lib/generated-recipes';
import { safeBack } from '@/lib/navigation';
import { getSavedRecipeById } from '@/lib/recipes';
import { Recipe } from '@/types/useitup';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [savedRecipe, setSavedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const recipe = useMemo(() => savedRecipe ?? findGeneratedRecipe(id) ?? findRecipe(id), [id, savedRecipe]);
  const canUpdatePantry = Boolean(savedRecipe ?? findGeneratedRecipe(id));
  const availableIngredients = recipe.ingredients.filter((ingredient) => ingredient.isAvailable);

  const loadRecipe = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (!user || !id || findGeneratedRecipe(id)) {
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setMessage('');

        const nextRecipe = await getSavedRecipeById(user.id, id);

        if (nextRecipe) {
          setSavedRecipe(nextRecipe);
        }
      } catch (error) {
        setMessage(getErrorMessage(error, 'Unable to load saved recipe. Showing sample recipe instead.'));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [id, user],
  );

  const { isRefreshing, refresh } = useRefresh(() => loadRecipe({ showLoading: false }));

  useEffect(() => {
    loadRecipe();
  }, [loadRecipe]);

  return (
    <Screen
      onRefresh={refresh}
      refreshing={isRefreshing}
      title={recipe.title}
      subtitle={recipe.description}
      headerAction={<Button compact onPress={() => safeBack('/(tabs)/recipes')} secondary icon="arrow-back">Back</Button>}>
      {isLoading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={palette.blue} />
          <Text style={styles.body}>Loading saved recipe...</Text>
        </Card>
      ) : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.summary}>
        <Meta icon="time-outline" label={`${recipe.prepTimeMinutes ?? '--'} min`} />
        {recipe.usesExpiringItems ? <Meta icon="leaf-outline" label="Uses expiring items" /> : null}
      </View>

      <View style={styles.section}>
        <SectionTitle>Ingredients</SectionTitle>
        <Card>
          {availableIngredients.map((ingredient) => (
            <IngredientRow
              key={ingredient.name}
              label={ingredient.name}
              detail={[ingredient.quantityValue, ingredient.quantityUnit].filter(Boolean).join(' ')}
            />
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Missing Ingredients</SectionTitle>
        <Card>
          <Text style={styles.body}>
            {recipe.missingIngredients.length
              ? recipe.missingIngredients.join(', ')
              : 'Nothing essential is missing for this recipe.'}
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Instructions</SectionTitle>
        <Card>
          {recipe.instructions.map((instruction, index) => (
            <View key={instruction} style={styles.step}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.body}>{instruction}</Text>
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Pantry Impact</SectionTitle>
        <Card>
          {recipe.id === 'steak-rice-bowl' ? (
            <>
              <ImpactRow after="1 portion" before="2 portions" item="Steak" />
              <ImpactRow after="low" before="medium" item="Spinach" />
            </>
          ) : (
            <>
              <ImpactRow after="6 count" before="8 count" item="Eggs" />
              <ImpactRow after="low" before="medium" item="Spinach" />
            </>
          )}
        </Card>
      </View>

      {canUpdatePantry ? (
        <Button href={`/update-pantry?recipeId=${recipe.id}`} icon="checkmark-circle-outline">
          I Cooked This
        </Button>
      ) : (
        <Card style={styles.loadingCard}>
          <Ionicons color={palette.green} name="information-circle-outline" size={18} />
          <Text style={styles.body}>Generate and save recipes from your pantry before updating quantities.</Text>
        </Card>
      )}
    </Screen>
  );
}

function Meta({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons color={palette.blue} name={icon} size={17} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

function IngredientRow({ label, detail }: { label: string; detail: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{label}</Text>
      <Text style={styles.body}>{detail || 'to taste'}</Text>
    </View>
  );
}

function ImpactRow({ after, before, item }: { after: string; before: string; item: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{item}</Text>
      <Text style={styles.body}>
        {before} to {after}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  section: {
    gap: 9,
  },
  meta: {
    alignItems: 'center',
    backgroundColor: palette.blueSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaText: {
    color: palette.blue,
    fontSize: 13,
    fontWeight: '800',
  },
  row: {
    alignItems: 'flex-start',
    borderBottomColor: palette.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  rowTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  body: {
    color: palette.muted,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  step: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  stepNumber: {
    backgroundColor: palette.graphite,
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    minWidth: 25,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
    textAlign: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  message: {
    color: palette.red,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }

  return fallback;
}
