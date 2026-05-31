import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { findRecipe } from '@/data/mock-useitup';
import { useRefresh } from '@/hooks/use-refresh';
import {
  addFavoriteRecipe,
  getFavoriteRecipeById,
  isTitleFavorited,
  removeFavoriteRecipeByTitle,
} from '@/lib/favorite-recipes';
import { findGeneratedRecipe, removeGeneratedRecipe } from '@/lib/generated-recipes';
import { safeBack } from '@/lib/navigation';
import { dismissSuggestedRecipe, getSavedRecipeById } from '@/lib/recipes';
import { Recipe } from '@/types/useitup';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [savedRecipe, setSavedRecipe] = useState<Recipe | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  // True when the recipe was loaded from the favorites table rather than the
  // pantry-derived suggestions, which changes how it is deleted and whether it
  // can be cooked.
  const [isFavoriteSource, setIsFavoriteSource] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [message, setMessage] = useState('');
  const recipe = useMemo(() => savedRecipe ?? findGeneratedRecipe(id) ?? findRecipe(id), [id, savedRecipe]);
  const canUpdatePantry = !isFavoriteSource && Boolean(savedRecipe ?? findGeneratedRecipe(id));
  const canManageRecipe = Boolean(user && id && isUuid(id) && (savedRecipe ?? findGeneratedRecipe(id)));
  const availableIngredients = recipe.ingredients.filter((ingredient) => ingredient.isAvailable);

  const loadRecipe = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (!user || !id || !isUuid(id)) {
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setMessage('');

        const suggestedRecipe = await getSavedRecipeById(user.id, id);
        const favoriteRecipe = suggestedRecipe ? null : await getFavoriteRecipeById(user.id, id);
        const resolvedRecipe = suggestedRecipe ?? favoriteRecipe;

        if (resolvedRecipe) {
          setSavedRecipe(resolvedRecipe);
          setIsFavoriteSource(Boolean(favoriteRecipe));
        }

        if (favoriteRecipe) {
          setIsFavorite(true);
        } else if (resolvedRecipe) {
          setIsFavorite(await isTitleFavorited(user.id, resolvedRecipe.title));
        } else {
          setIsFavorite(false);
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

  async function handleToggleFavorite() {
    if (!user || !canManageRecipe || isSavingFavorite) {
      return;
    }

    const nextFavorite = !isFavorite;

    setIsSavingFavorite(true);
    setMessage('');

    try {
      if (nextFavorite) {
        await addFavoriteRecipe(user.id, recipe);
      } else {
        await removeFavoriteRecipeByTitle(user.id, recipe.title);
      }
      setIsFavorite(nextFavorite);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to update favorite status.'));
    } finally {
      setIsSavingFavorite(false);
    }
  }

  async function handleDeleteRecipe() {
    if (!user || !canManageRecipe || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setMessage('');

    try {
      if (isFavoriteSource) {
        await removeFavoriteRecipeByTitle(user.id, recipe.title);
      } else {
        await dismissSuggestedRecipe(user.id, recipe.id);
      }
      removeGeneratedRecipe(recipe.id);
      router.replace('/(tabs)/recipes');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to delete this recipe.'));
      setIsDeleting(false);
    }
  }

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
        {isFavorite ? <Meta icon="star" label="Favorite" /> : null}
      </View>

      {canManageRecipe ? (
        <View style={styles.managementActions}>
          <Pressable
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            disabled={isSavingFavorite}
            onPress={handleToggleFavorite}
            style={[styles.starButton, isSavingFavorite && styles.disabledButton]}>
            <Ionicons color={isFavorite ? palette.gold : palette.muted} name={isFavorite ? 'star' : 'star-outline'} size={28} />
          </Pressable>
          <Button compact icon="trash-outline" onPress={() => setIsConfirmingDelete(true)} secondary>
            Delete
          </Button>
        </View>
      ) : null}

      {isConfirmingDelete ? (
        <Card style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>
            {isFavoriteSource ? 'Remove this favorite?' : 'Remove this suggestion?'}
          </Text>
          <Text style={styles.body}>
            {isFavoriteSource
              ? 'This permanently removes it from your favorites.'
              : 'This removes it from your suggestions. Your cook history stays intact.'}
          </Text>
          <View style={styles.managementActions}>
            <Button compact icon="trash-outline" onPress={handleDeleteRecipe} style={styles.deleteButton}>
              {isDeleting ? 'Removing...' : isFavoriteSource ? 'Remove Favorite' : 'Remove Recipe'}
            </Button>
            <Button compact onPress={() => setIsConfirmingDelete(false)} secondary icon="close-outline">
              Cancel
            </Button>
          </View>
        </Card>
      ) : null}

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
  managementActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  starButton: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 54,
  },
  disabledButton: {
    opacity: 0.55,
  },
  confirmCard: {
    backgroundColor: palette.surface,
  },
  confirmTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  deleteButton: {
    backgroundColor: palette.red,
    borderColor: palette.red,
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

function isUuid(value?: string) {
  return Boolean(
    value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
  );
}
