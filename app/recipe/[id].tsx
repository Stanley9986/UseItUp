import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ConfirmDialog, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useRefresh } from '@/hooks/use-refresh';
import { getErrorMessage } from '@/lib/errors';
import {
  addFavoriteRecipe,
  getFavoriteRecipeById,
  isTitleFavorited,
  removeFavoriteRecipeByTitle,
} from '@/lib/favorite-recipes';
import { findGeneratedRecipe, removeGeneratedRecipe } from '@/lib/generated-recipes';
import { safeBack } from '@/lib/navigation';
import { dismissSuggestedRecipe, getSavedRecipeById } from '@/lib/recipes';
import { addShoppingListItemsFromRecipe } from '@/lib/shopping-list';
import { getShoppingListSourceRecipeId } from '@/lib/shopping-list-mappers';
import { Recipe } from '@/types/useitup';

type ScreenMessage = {
  tone: 'error' | 'success' | 'info';
  text: string;
};

export default function RecipeDetailScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const { user } = useAuth();
  const [savedRecipe, setSavedRecipe] = useState<Recipe | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  // True when the recipe was loaded from the favorites table rather than the
  // pantry-derived suggestions, which changes how it is deleted and whether it
  // can be cooked.
  const [isFavoriteSource, setIsFavoriteSource] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [isAddingShoppingList, setIsAddingShoppingList] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [message, setMessage] = useState<ScreenMessage | null>(null);
  const recipe = useMemo(() => savedRecipe ?? findGeneratedRecipe(id) ?? null, [id, savedRecipe]);
  const isHistorySource = source === 'history';
  const canUpdatePantry = !isHistorySource && Boolean(recipe);
  const canManageRecipe = Boolean(user && id && isUuid(id) && recipe);
  const availableIngredients = recipe?.ingredients.filter((ingredient) => ingredient.isAvailable) ?? [];
  // Only pantry-linked ingredients are decremented when cooking, so they define
  // the recipe's real pantry impact.
  const pantryIngredients = recipe?.ingredients.filter((ingredient) => ingredient.pantryItemId) ?? [];

  const loadRecipe = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (!user || !id || !isUuid(id)) {
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setMessage(null);

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
        setMessage({
          tone: 'error',
          text: getErrorMessage(error, 'Unable to load saved recipe. Showing sample recipe instead.'),
        });
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
    if (!user || !canManageRecipe || isSavingFavorite || !recipe) {
      return;
    }

    const nextFavorite = !isFavorite;

    setIsSavingFavorite(true);
    setMessage(null);

    try {
      if (nextFavorite) {
        await addFavoriteRecipe(user.id, recipe);
      } else {
        await removeFavoriteRecipeByTitle(user.id, recipe.title);
      }
      setIsFavorite(nextFavorite);
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error, 'Unable to update favorite status.') });
    } finally {
      setIsSavingFavorite(false);
    }
  }

  async function handleDeleteRecipe() {
    if (!user || !canManageRecipe || isDeleting || !recipe) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      if (isFavoriteSource) {
        await removeFavoriteRecipeByTitle(user.id, recipe.title);
      } else {
        await dismissSuggestedRecipe(user.id, recipe.id);
      }
      removeGeneratedRecipe(recipe.id);
      router.replace('/(tabs)/recipes');
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error, 'Unable to delete this recipe.') });
      setIsDeleting(false);
    }
  }

  async function handleAddMissingToShoppingList() {
    if (!user || !recipe || isAddingShoppingList || !recipe.missingIngredients.length) {
      return;
    }

    setIsAddingShoppingList(true);
    setMessage(null);

    try {
      const addedItems = await addShoppingListItemsFromRecipe({
        ingredients: recipe.missingIngredients,
        recipeId: getShoppingListSourceRecipeId({
          isFavoriteSource,
          recipeId: isUuid(recipe.id) ? recipe.id : undefined,
        }),
        recipeTitle: recipe.title,
        userId: user.id,
      });
      setMessage({
        tone: addedItems.length ? 'success' : 'info',
        text: addedItems.length
          ? `${addedItems.length} item${addedItems.length === 1 ? '' : 's'} added to your shopping list.`
          : 'No missing ingredients to add.',
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getErrorMessage(error, 'Unable to add missing ingredients to your shopping list.'),
      });
    } finally {
      setIsAddingShoppingList(false);
    }
  }

  if (!recipe) {
    return (
      <Screen
        title={isLoading ? 'Loading recipe' : 'Recipe not found'}
        subtitle={isLoading ? 'Fetching this recipe from your library.' : undefined}
        headerAction={<Button compact onPress={() => safeBack('/(tabs)/recipes')} secondary icon="arrow-back">Back</Button>}>
        <Card style={styles.loadingCard}>
          {isLoading ? (
            <>
              <ActivityIndicator color={palette.blue} />
              <Text style={styles.body}>Loading recipe...</Text>
            </>
          ) : (
            <>
              <Ionicons color={palette.green} name="information-circle-outline" size={18} />
              <Text style={styles.body}>This recipe could not be found. It may have been removed.</Text>
            </>
          )}
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={refresh}
      refreshing={isRefreshing}
      title={recipe.title}
      subtitle={recipe.description}
      headerAction={
        <Button compact onPress={() => safeBack(isHistorySource ? '/cook-history' : '/(tabs)/recipes')} secondary icon="arrow-back">
          Back
        </Button>
      }>
      {isLoading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={palette.blue} />
          <Text style={styles.body}>Loading saved recipe...</Text>
        </Card>
      ) : null}
      {message ? (
        <View
          style={[
            styles.messageBox,
            message.tone === 'error' ? styles.errorMessageBox : styles.successMessageBox,
          ]}>
          <Ionicons
            color={message.tone === 'error' ? palette.red : palette.green}
            name={message.tone === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={18}
          />
          <Text style={[styles.messageText, message.tone === 'error' ? styles.errorMessageText : styles.successMessageText]}>
            {message.text}
          </Text>
          {message.tone === 'success' ? (
            <Text onPress={() => router.push('/shopping-list')} style={styles.messageAction}>
              View List
            </Text>
          ) : null}
        </View>
      ) : null}

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
          {isFavoriteSource ? (
            <Button compact href={`/edit-recipe/${recipe.id}?type=favorite`} icon="create-outline" secondary>
              Edit
            </Button>
          ) : (
            <Button compact href={`/edit-recipe/${recipe.id}?type=suggested`} icon="create-outline" secondary>
              Edit
            </Button>
          )}
          <Button compact icon="trash-outline" onPress={() => setIsConfirmingDelete(true)} secondary>
            Delete
          </Button>
        </View>
      ) : null}

      <ConfirmDialog
        busy={isDeleting}
        confirmLabel={isDeleting ? 'Removing...' : isFavoriteSource ? 'Remove Favorite' : 'Remove Recipe'}
        destructive
        message={
          isFavoriteSource
            ? 'This permanently removes it from your favorites.'
            : 'This removes it from your suggestions. Your cook history stays intact.'
        }
        onCancel={() => setIsConfirmingDelete(false)}
        onConfirm={handleDeleteRecipe}
        title={isFavoriteSource ? 'Remove this favorite?' : 'Remove this suggestion?'}
        visible={isConfirmingDelete}
      />

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
          {recipe.missingIngredients.length ? (
            <Button
              compact
              disabled={isAddingShoppingList}
              icon="cart-outline"
              onPress={handleAddMissingToShoppingList}
              secondary>
              {isAddingShoppingList ? 'Adding...' : 'Add Missing to Shopping List'}
            </Button>
          ) : null}
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
          {pantryIngredients.length ? (
            <>
              {pantryIngredients.map((ingredient) => (
                <ImpactRow
                  key={ingredient.name}
                  item={ingredient.name}
                  detail={[ingredient.quantityValue, ingredient.quantityUnit].filter(Boolean).join(' ') || 'amount varies'}
                />
              ))}
              {!isHistorySource ? (
                <Text style={styles.body}>
                  Tap “I Cooked This” to review and confirm exactly how each item’s quantity changes.
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.body}>This recipe has no pantry-linked ingredients to update.</Text>
          )}
        </Card>
      </View>

      {canUpdatePantry ? (
        <Button
          href={isFavoriteSource ? `/update-pantry?favoriteId=${recipe.id}` : `/update-pantry?recipeId=${recipe.id}`}
          icon="checkmark-circle-outline">
          I Cooked This
        </Button>
      ) : !isHistorySource ? (
        <Card style={styles.loadingCard}>
          <Ionicons color={palette.green} name="information-circle-outline" size={18} />
          <Text style={styles.body}>Generate and save recipes from your pantry before updating quantities.</Text>
        </Card>
      ) : null}
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

function ImpactRow({ detail, item }: { detail: string; item: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{item}</Text>
      <Text style={styles.body}>{detail}</Text>
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
  messageBox: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  errorMessageBox: {
    backgroundColor: '#fff4f1',
    borderColor: '#f1c8bd',
  },
  successMessageBox: {
    backgroundColor: palette.greenSoft,
    borderColor: '#d7d0b8',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  errorMessageText: {
    color: palette.red,
  },
  successMessageText: {
    color: palette.green,
  },
  messageAction: {
    color: palette.blue,
    fontSize: 14,
    fontWeight: '900',
    paddingVertical: 6,
  },
});

function isUuid(value?: string) {
  return Boolean(
    value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
  );
}
