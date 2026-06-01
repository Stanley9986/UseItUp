import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  Button,
  Card,
  Chip,
  FavoriteRecipeCard,
  palette,
  RecipeRowCard,
  Screen,
  SectionTitle,
  typography,
} from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useRefresh } from '@/hooks/use-refresh';
import { getErrorMessage } from '@/lib/errors';
import { addFavoriteRecipe, getFavoriteRecipesPage, removeFavoriteRecipeByTitle } from '@/lib/favorite-recipes';
import { setGeneratedRecipes } from '@/lib/generated-recipes';
import { appendPageItems, defaultPageSize } from '@/lib/pagination';
import { getPantryItems } from '@/lib/pantry';
import { generateRecipes } from '@/lib/recipe-generator';
import { isRecipeFavorited, normalizeRecipeTitle } from '@/lib/recipe-list';
import { getSavedRecipesPage, replaceSuggestedRecipes } from '@/lib/recipes';
import { defaultUserPreferences, getUserPreferences } from '@/lib/user-preferences';
import { PantryItem, Recipe, UserPreferences } from '@/types/useitup';

type RecipeSort = 'expiring' | 'quick' | 'missing';
type FavoriteToast = {
  isFavorite: boolean;
  recipe: Recipe;
};
type ScreenMessage = {
  tone: 'error' | 'info';
  text: string;
};

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
  const [suggested, setSuggested] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [suggestedNextPage, setSuggestedNextPage] = useState(0);
  const [favoritesNextPage, setFavoritesNextPage] = useState(0);
  const [hasMoreSuggested, setHasMoreSuggested] = useState(false);
  const [hasMoreFavorites, setHasMoreFavorites] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [isLoadingPantry, setIsLoadingPantry] = useState(true);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [isLoadingMoreFavorites, setIsLoadingMoreFavorites] = useState(false);
  const [isLoadingMoreSuggested, setIsLoadingMoreSuggested] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepIndex, setGenerationStepIndex] = useState(0);
  const [favoriteScrollProgress, setFavoriteScrollProgress] = useState(0);
  const [favoriteRailWidth, setFavoriteRailWidth] = useState(0);
  const [favoriteContentWidth, setFavoriteContentWidth] = useState(0);
  const [favoriteToast, setFavoriteToast] = useState<FavoriteToast | null>(null);
  const [message, setMessage] = useState<ScreenMessage | null>(null);
  // Suggestions are pantry-derived; favorites are a separate permanent list. A
  // suggested recipe is rendered with a star when it also lives in favorites.
  const suggestedView = useMemo(
    () =>
      sortRecipes(suggested, sort).map((recipe) => ({
        ...recipe,
        isFavorite: isRecipeFavorited(favorites, recipe.title),
      })),
    [favorites, sort, suggested],
  );
  const favoriteCanScroll = favoriteContentWidth > favoriteRailWidth + 1;

  const loadSuggestedRecipes = useCallback(async ({ page = 0, reset = true }: { page?: number; reset?: boolean } = {}) => {
    if (!user) {
      return;
    }

    if (reset) {
      setIsLoadingRecipes(true);
    } else {
      setIsLoadingMoreSuggested(true);
    }

    try {
      const suggestedRecipes = await getSavedRecipesPage(user.id, { page, pageSize: defaultPageSize });
      setSuggested((current) => {
        const nextSuggested = reset ? suggestedRecipes.items : appendPageItems(current, suggestedRecipes.items);
        setGeneratedRecipes(nextSuggested);
        return nextSuggested;
      });
      setSuggestedNextPage(suggestedRecipes.nextPage);
      setHasMoreSuggested(suggestedRecipes.hasMore);
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error, 'Unable to load suggested recipes.') });
    } finally {
      if (reset) {
        setIsLoadingRecipes(false);
      } else {
        setIsLoadingMoreSuggested(false);
      }
    }
  }, [user]);

  const loadFavorites = useCallback(async ({ page = 0, reset = true }: { page?: number; reset?: boolean } = {}) => {
    if (!user) {
      return;
    }

    if (!reset) {
      setIsLoadingMoreFavorites(true);
    }

    try {
      const favoriteRecipes = await getFavoriteRecipesPage(user.id, { page, pageSize: defaultPageSize });
      setFavorites((current) => (reset ? favoriteRecipes.items : appendPageItems(current, favoriteRecipes.items)));
      setFavoritesNextPage(favoriteRecipes.nextPage);
      setHasMoreFavorites(favoriteRecipes.hasMore);
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error, 'Unable to load favorite recipes.') });
    } finally {
      if (!reset) {
        setIsLoadingMoreFavorites(false);
      }
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
      setMessage({ tone: 'error', text: getErrorMessage(error, 'Unable to load pantry items for recipe generation.') });
    } finally {
      setIsLoadingPantry(false);
    }
  }, [user]);

  const loadPreferences = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setPreferences(await getUserPreferences(user.id));
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error, 'Unable to load dietary preferences for recipe generation.') });
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPantry();
      loadSuggestedRecipes({ reset: true });
      loadFavorites({ reset: true });
      loadPreferences();
    }, [loadFavorites, loadPantry, loadPreferences, loadSuggestedRecipes]),
  );

  const { isRefreshing, refresh } = useRefresh(async () => {
    await Promise.all([loadPantry(), loadSuggestedRecipes({ reset: true }), loadFavorites({ reset: true }), loadPreferences()]);
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

  useEffect(() => {
    if (!favoriteToast) {
      return;
    }

    const timeout = setTimeout(() => {
      setFavoriteToast(null);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [favoriteToast]);

  async function handleGenerate() {
    if (!user || isGenerating) {
      return;
    }

    if (!pantryItems.length) {
      setMessage({ tone: 'info', text: 'Add pantry items first, then generate recipes to see ideas here.' });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const nextRecipes = await generateRecipes({
        pantryItems,
        preferences: {
          ...preferences,
          prioritizeExpiringSoon: true,
        },
      });

      if (!nextRecipes.length) {
        // Keep the current suggestions rather than replacing them with nothing.
        setMessage({ tone: 'info', text: 'The generator did not return any recipes. Try adding more pantry items.' });
        return;
      }

      // Regenerating replaces the previous suggestion batch.
      const savedRecipes = await replaceSuggestedRecipes(user.id, nextRecipes);
      setSuggested(savedRecipes);
      setGeneratedRecipes(savedRecipes);
      setSuggestedNextPage(1);
      setHasMoreSuggested(false);
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error, 'Unable to generate recipes yet. Try again.') });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleToggleFavorite(recipe: Recipe) {
    if (!user) {
      return;
    }

    const wasFavorite = isRecipeFavorited(favorites, recipe.title);
    const previousFavorites = favorites;
    const normalizedTitle = normalizeRecipeTitle(recipe.title);

    setFavorites(
      wasFavorite
        ? favorites.filter((favorite) => normalizeRecipeTitle(favorite.title) !== normalizedTitle)
        : [{ ...recipe, isFavorite: true }, ...favorites],
    );
    setFavoriteToast({ isFavorite: !wasFavorite, recipe });

    try {
      if (wasFavorite) {
        await removeFavoriteRecipeByTitle(user.id, recipe.title);
      } else {
        const savedFavorite = await addFavoriteRecipe(user.id, recipe);
        setFavorites((current) =>
          current.map((favorite) =>
            normalizeRecipeTitle(favorite.title) === normalizedTitle ? savedFavorite : favorite,
          ),
        );
      }
    } catch (error) {
      setFavorites(previousFavorites);
      setFavoriteToast(null);
      setMessage({ tone: 'error', text: getErrorMessage(error, 'Unable to update favorite status.') });
    }
  }

  async function handleUndoFavoriteToast() {
    if (!user || !favoriteToast) {
      return;
    }

    const { isFavorite, recipe } = favoriteToast;
    const normalizedTitle = normalizeRecipeTitle(recipe.title);
    setFavoriteToast(null);

    try {
      if (isFavorite) {
        // The toast reported an add, so undo removes it.
        setFavorites((current) =>
          current.filter((favorite) => normalizeRecipeTitle(favorite.title) !== normalizedTitle),
        );
        await removeFavoriteRecipeByTitle(user.id, recipe.title);
      } else {
        const savedFavorite = await addFavoriteRecipe(user.id, recipe);
        setFavorites((current) => [
          savedFavorite,
          ...current.filter((favorite) => normalizeRecipeTitle(favorite.title) !== normalizedTitle),
        ]);
      }
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error, 'Unable to undo favorite change.') });
    }
  }

  function handleFavoriteScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollableWidth = contentSize.width - layoutMeasurement.width;

    if (scrollableWidth <= 0) {
      setFavoriteScrollProgress(0);
      return;
    }

    setFavoriteScrollProgress(Math.min(Math.max(contentOffset.x / scrollableWidth, 0), 1));
  }

  function handleFavoriteRailLayout(event: LayoutChangeEvent) {
    setFavoriteRailWidth(event.nativeEvent.layout.width);
  }

  return (
    <Screen
      onRefresh={isGenerating ? undefined : refresh}
      overlay={
        favoriteToast ? (
          <View style={styles.toast}>
            <Ionicons
              color={palette.goldSoft}
              name={favoriteToast.isFavorite ? 'star' : 'star-outline'}
              size={18}
            />
            <Text numberOfLines={1} style={styles.toastText}>
              {favoriteToast.isFavorite ? 'Added to favorites' : 'Removed from favorites'}
            </Text>
            <Text onPress={handleUndoFavoriteToast} style={styles.toastAction}>
              Undo
            </Text>
            <Pressable
              accessibilityLabel="Dismiss favorite message"
              onPress={() => setFavoriteToast(null)}
              style={styles.toastClose}>
              <Ionicons color="#fff" name="close" size={18} />
            </Pressable>
          </View>
        ) : null
      }
      refreshing={isRefreshing}
      title="Meals You Can Make"
      subtitle="Generate meal ideas from your real pantry items."
      headerAction={<Button compact href="/shopping-list" icon="cart-outline" secondary>List</Button>}>
      <Card style={styles.generatorCard}>
        <Text style={styles.generatorTitle}>Cook from your pantry</Text>
        <Text style={styles.generatorCopy}>
          {isLoadingPantry
            ? 'Loading pantry items...'
            : pantryItems.length
              ? `${pantryItems.length} pantry items ready for recipe generation.`
              : 'Add pantry items before generating recipes.'}
        </Text>
        {message ? (
          <View style={[styles.messageBox, message.tone === 'error' ? styles.errorMessageBox : styles.infoMessageBox]}>
            <Ionicons
              color={message.tone === 'error' ? palette.red : palette.blue}
              name={message.tone === 'error' ? 'alert-circle-outline' : 'information-circle-outline'}
              size={18}
            />
            <Text style={[styles.messageText, message.tone === 'error' ? styles.errorMessageText : styles.infoMessageText]}>
              {message.text}
            </Text>
          </View>
        ) : null}
        <Button disabled={isGenerating} icon="sparkles-outline" onPress={handleGenerate}>
          {isGenerating ? 'Generating...' : suggested.length ? 'Regenerate Recipes' : 'Generate Recipes'}
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
      <View style={styles.list}>
        {favorites.length ? (
          <View style={styles.section}>
            <SectionTitle>Favorites</SectionTitle>
            <ScrollView
              contentContainerStyle={styles.favoriteRail}
              horizontal
              onContentSizeChange={(width) => setFavoriteContentWidth(width)}
              onLayout={handleFavoriteRailLayout}
              onScroll={handleFavoriteScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}>
              {favorites.map((recipe) => (
                <FavoriteRecipeCard
                  key={recipe.id}
                  onToggleFavorite={() => handleToggleFavorite(recipe)}
                  recipe={recipe}
                />
              ))}
            </ScrollView>
            {favoriteCanScroll ? (
              <View style={styles.favoriteTrack}>
                <View style={[styles.favoriteTrackThumb, { marginLeft: `${favoriteScrollProgress * 70}%` }]} />
              </View>
            ) : null}
            {hasMoreFavorites ? (
              <Button
                compact
                disabled={isLoadingMoreFavorites}
                icon="add-circle-outline"
                  onPress={() => loadFavorites({ page: favoritesNextPage, reset: false })}
                secondary>
                {isLoadingMoreFavorites ? 'Loading...' : 'Load More Favorites'}
              </Button>
            ) : null}
          </View>
        ) : null}
        <View style={styles.section}>
          <SectionTitle>Suggested Recipes</SectionTitle>
          {isLoadingRecipes && !isGenerating ? (
            <RecipeSkeleton index={0} />
          ) : isGenerating ? (
            [0, 1, 2].map((item) => <RecipeSkeleton key={item} index={item} />)
          ) : suggestedView.length ? (
            <>
              {suggestedView.map((recipe) => (
                <RecipeRowCard key={recipe.id} onToggleFavorite={() => handleToggleFavorite(recipe)} recipe={recipe} />
              ))}
              {hasMoreSuggested ? (
                <Button
                  compact
                  disabled={isLoadingMoreSuggested}
                  icon="add-circle-outline"
                  onPress={() => loadSuggestedRecipes({ page: suggestedNextPage, reset: false })}
                  secondary>
                  {isLoadingMoreSuggested ? 'Loading...' : 'Load More Recipes'}
                </Button>
              ) : null}
            </>
          ) : (
            <Card style={styles.emptyCard}>
              <Ionicons color={palette.green} name="restaurant-outline" size={24} />
              <Text style={styles.emptyTitle}>{pantryItems.length ? "Let's use up your pantry" : 'Add to your pantry first'}</Text>
              <Text style={styles.emptyCopy}>
                {pantryItems.length
                  ? 'Generate recipes to see what you can make with what you have right now.'
                  : 'Add pantry items first, then generate recipes to see ideas here.'}
              </Text>
            </Card>
          )}
        </View>
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
  messageBox: {
    alignItems: 'flex-start',
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
  infoMessageBox: {
    backgroundColor: palette.blueSoft,
    borderColor: '#c7d8ff',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  errorMessageText: {
    color: palette.red,
  },
  infoMessageText: {
    color: palette.blue,
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
  list: {
    gap: 10,
  },
  section: {
    gap: 10,
  },
  emptyCard: {
    alignItems: 'flex-start',
    backgroundColor: palette.surface,
    gap: 8,
  },
  emptyTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 17,
    fontWeight: '900',
  },
  emptyCopy: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  favoriteRail: {
    gap: 10,
    paddingRight: 2,
  },
  favoriteTrack: {
    backgroundColor: palette.line,
    borderRadius: 999,
    height: 5,
    marginBottom: 10,
    overflow: 'hidden',
    width: '100%',
  },
  favoriteTrackThumb: {
    backgroundColor: palette.blue,
    borderRadius: 999,
    height: '100%',
    width: '30%',
  },
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: palette.graphite,
    borderRadius: 14,
    bottom: 10,
    flexDirection: 'row',
    gap: 9,
    left: 22,
    maxWidth: 476,
    minHeight: 52,
    paddingHorizontal: 14,
    position: 'absolute',
    right: 22,
  },
  toastText: {
    color: '#fff',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  toastAction: {
    color: palette.goldSoft,
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  toastClose: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    opacity: 0.8,
    width: 40,
  },
  skeletonCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  skeletonImage: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: palette.greenSoft,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 112,
    width: 96,
  },
  skeletonBody: {
    flex: 1,
    gap: 9,
    minWidth: 0,
  },
  skeletonHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonLine: {
    backgroundColor: palette.line,
    borderRadius: 999,
    height: 13,
  },
  skeletonTag: {
    backgroundColor: palette.blush,
    height: 24,
    width: 120,
  },
  skeletonNumber: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  skeletonTitle: {
    height: 18,
    width: '70%',
  },
  skeletonCopy: {
    width: '92%',
  },
  skeletonCopyShort: {
    width: '55%',
  },
});
