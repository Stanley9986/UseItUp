import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ConfirmDialog, palette, RecipeArtworkImage, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useAppLanguage } from '@/contexts/language-context';
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
import { formatIngredientQuantity } from '@/lib/quantity';
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
  const { t } = useAppLanguage();
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
          text: getErrorMessage(error, t('recipeDetailFallbackLoadError')),
        });
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [id, t, user],
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
      setMessage({ tone: 'error', text: getErrorMessage(error, t('unableToUpdateFavorite')) });
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
      setMessage({ tone: 'error', text: getErrorMessage(error, t('deleteRecipeError')) });
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
          ? t('itemsAddedToShoppingList', { count: addedItems.length, plural: addedItems.length === 1 ? '' : 's' })
          : t('noMissingIngredientsToAdd'),
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: getErrorMessage(error, t('unableToAddMissingToShoppingList')),
      });
    } finally {
      setIsAddingShoppingList(false);
    }
  }

  if (!recipe) {
    return (
      <Screen
        title={isLoading ? t('loadingRecipe') : t('recipeNotFound')}
        subtitle={isLoading ? t('fetchingRecipeFromLibrary') : undefined}
        headerAction={<Button compact onPress={() => safeBack('/(tabs)/recipes')} secondary icon="arrow-back">{t('back')}</Button>}>
        <Card style={styles.loadingCard}>
          {isLoading ? (
            <>
              <ActivityIndicator color={palette.blue} />
              <Text style={styles.body}>{t('loadingRecipe')}</Text>
            </>
          ) : (
            <>
              <Ionicons color={palette.green} name="information-circle-outline" size={18} />
              <Text style={styles.body}>{t('recipeNotFoundCopy')}</Text>
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
          {t('back')}
        </Button>
      }>
      {isLoading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={palette.blue} />
          <Text style={styles.body}>{t('loadingSavedRecipe')}</Text>
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
              {t('viewList')}
            </Text>
          ) : null}
        </View>
      ) : null}

      <RecipeArtworkImage recipe={recipe} style={styles.recipeHeroImage} />

      <View style={styles.summary}>
        <Meta icon="time-outline" label={`${recipe.prepTimeMinutes ?? '--'} ${t('min')}`} />
        {recipe.usesExpiringItems ? <Meta icon="leaf-outline" label={t('usesExpiringItems')} /> : null}
        {isFavorite ? <Meta icon="star" label={t('favorite')} /> : null}
      </View>

      {canManageRecipe ? (
        <View style={styles.managementActions}>
          <Pressable
            accessibilityLabel={isFavorite ? t('removeFavorite') : t('addFavorite')}
            disabled={isSavingFavorite}
            onPress={handleToggleFavorite}
            style={[styles.starButton, isSavingFavorite && styles.disabledButton]}>
            <Ionicons color={isFavorite ? palette.gold : palette.muted} name={isFavorite ? 'star' : 'star-outline'} size={28} />
          </Pressable>
          {isFavoriteSource ? (
            <Button compact href={`/edit-recipe/${recipe.id}?type=favorite`} icon="create-outline" secondary>
              {t('edit')}
            </Button>
          ) : (
            <Button compact href={`/edit-recipe/${recipe.id}?type=suggested`} icon="create-outline" secondary>
              {t('edit')}
            </Button>
          )}
          <Button compact icon="trash-outline" onPress={() => setIsConfirmingDelete(true)} secondary>
            {t('delete')}
          </Button>
        </View>
      ) : null}

      <ConfirmDialog
        busy={isDeleting}
        confirmLabel={isDeleting ? t('removing') : isFavoriteSource ? t('removeFavoriteConfirm') : t('removeRecipeConfirm')}
        destructive
        message={
          isFavoriteSource
            ? t('removeRecipeFavoriteMessage')
            : t('removeRecipeSuggestionMessage')
        }
        onCancel={() => setIsConfirmingDelete(false)}
        onConfirm={handleDeleteRecipe}
        title={isFavoriteSource ? t('removeFavoriteQuestion') : t('removeSuggestionQuestion')}
        visible={isConfirmingDelete}
      />

      <View style={styles.section}>
        <SectionTitle>{t('ingredients')}</SectionTitle>
        <Card>
          {availableIngredients.map((ingredient) => (
            <IngredientRow
              key={ingredient.name}
              label={ingredient.name}
              detail={formatIngredientQuantity(ingredient.quantityValue, ingredient.quantityUnit, t)}
            />
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>{t('missingIngredients')}</SectionTitle>
        <Card>
          <Text style={styles.body}>
            {recipe.missingIngredients.length
              ? recipe.missingIngredients.join(', ')
              : t('nothingEssentialMissing')}
          </Text>
          {recipe.missingIngredients.length ? (
            <Button
              compact
              disabled={isAddingShoppingList}
              icon="cart-outline"
              onPress={handleAddMissingToShoppingList}
              secondary>
              {isAddingShoppingList ? t('adding') : t('addMissingToShoppingList')}
            </Button>
          ) : null}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>{t('instructions')}</SectionTitle>
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
        <SectionTitle>{t('pantryImpact')}</SectionTitle>
        <Card>
          {pantryIngredients.length ? (
            <>
              {pantryIngredients.map((ingredient) => (
                <ImpactRow
                  key={ingredient.name}
                  item={ingredient.name}
                  detail={formatIngredientQuantity(ingredient.quantityValue, ingredient.quantityUnit, t) || t('amountVaries')}
                />
              ))}
              {!isHistorySource ? (
                <Text style={styles.body}>
                  {t('afterCookingUpdatePantry')}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.body}>{t('thisRecipeHasNoPantryIngredients')}</Text>
          )}
        </Card>
      </View>

      {canUpdatePantry ? (
        <Button
          href={isFavoriteSource ? `/update-pantry?favoriteId=${recipe.id}` : `/update-pantry?recipeId=${recipe.id}`}
          icon="checkmark-circle-outline">
          {t('cookedThis')}
        </Button>
      ) : !isHistorySource ? (
        <Card style={styles.loadingCard}>
          <Ionicons color={palette.green} name="information-circle-outline" size={18} />
          <Text style={styles.body}>{t('generateRecipesToUpdatePantry')}</Text>
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
  const { t } = useAppLanguage();

  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{label}</Text>
      <Text style={styles.body}>{detail || t('toTaste')}</Text>
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
  recipeHeroImage: {
    backgroundColor: palette.greenSoft,
    borderRadius: 14,
    height: 190,
    overflow: 'hidden',
    width: '100%',
  },
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
