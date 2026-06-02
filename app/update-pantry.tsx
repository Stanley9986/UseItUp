import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, palette, QuantityText, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useAppLanguage } from '@/contexts/language-context';
import { PantryUpdateChoice, buildPantryUpdate, cookRecipeAndUpdatePantry, defaultChoiceForItem } from '@/lib/cooking';
import { useRefresh } from '@/hooks/use-refresh';
import { safeBack } from '@/lib/navigation';
import { getErrorMessage, getPantryItemById } from '@/lib/pantry';
import { getFavoriteRecipeById } from '@/lib/favorite-recipes';
import { createSavedRecipeFromSnapshot, getSavedRecipeById } from '@/lib/recipes';
import { UpdateChoiceKey, choiceToKey, keyToChoice } from '@/lib/update-pantry-ui';
import { PantryItem, Recipe } from '@/types/useitup';

const amountChoices: UpdateChoiceKey[] = ['suggested', 'all', 'less', 'skip'];

const levelChoices: UpdateChoiceKey[] = ['empty', 'low', 'half', 'full', 'skip'];

export default function UpdatePantryScreen() {
  const { favoriteId, recipeId } = useLocalSearchParams<{ favoriteId?: string; recipeId?: string }>();
  const { user } = useAuth();
  const { t } = useAppLanguage();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [choices, setChoices] = useState<Record<string, PantryUpdateChoice>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadCookData = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (!user || (!recipeId && !favoriteId)) {
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }
      setMessage('');

      try {
        const nextRecipe = recipeId
          ? await getSavedRecipeById(user.id, recipeId)
          : favoriteId
            ? await getFavoriteRecipeById(user.id, favoriteId)
            : null;

        if (!nextRecipe) {
          setRecipe(null);
          setPantryItems([]);
          setMessage(t('savedRecipeNotFound'));
          return;
        }

        const pantryItemIds = nextRecipe.ingredients
          .map((ingredient) => ingredient.pantryItemId)
          .filter((id): id is string => Boolean(id));
        const nextItems = await Promise.all(pantryItemIds.map((id) => getPantryItemById(user.id, id)));
        const availableItems = nextItems.filter((item): item is PantryItem => Boolean(item));

        setRecipe(nextRecipe);
        setPantryItems(availableItems);
        setChoices((current) => {
          const nextChoices = { ...current };
          availableItems.forEach((item) => {
            nextChoices[item.id] ??= defaultChoiceForItem(item);
          });
          return nextChoices;
        });
      } catch (error) {
        setMessage(getErrorMessage(error, t('unableToLoadRecipePantryUpdates')));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [favoriteId, recipeId, t, user],
  );

  const { isRefreshing, refresh } = useRefresh(() => loadCookData({ showLoading: false }));

  useEffect(() => {
    loadCookData();
  }, [loadCookData]);

  const previewUpdates = useMemo(
    () =>
      pantryItems.map((item) => ({
        item,
        update: buildPantryUpdate(item, choices[item.id]),
      })),
    [choices, pantryItems],
  );

  async function handleSave() {
    if (!user || !recipe || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const cookableRecipe = favoriteId ? await createSavedRecipeFromSnapshot(user.id, recipe) : recipe;

      await cookRecipeAndUpdatePantry({
        choices,
        pantryItems,
        recipe: cookableRecipe,
        userId: user.id,
      });

      router.replace('/(tabs)/pantry');
    } catch (error) {
      setMessage(getErrorMessage(error, t('unableToSavePantryUpdates')));
    } finally {
      setIsSaving(false);
    }
  }

  if (!recipeId && !favoriteId) {
    return (
      <Screen
        title={t('updateYourPantry')}
        subtitle={t('updatePantrySubtitle')}
        headerAction={<Button compact onPress={() => safeBack('/(tabs)/recipes')} secondary icon="arrow-back">{t('back')}</Button>}>
        <Card style={styles.stateCard}>
          <Text style={styles.title}>{t('noRecipeSelected')}</Text>
          <Text style={styles.copy}>{t('updatePantryNoRecipeCopy')}</Text>
          <Button compact href="/(tabs)/recipes" icon="restaurant-outline">
            {t('viewRecipes')}
          </Button>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={refresh}
      refreshing={isRefreshing}
      title={t('updateYourPantry')}
      subtitle={recipe ? t('updatePantryForRecipe', { recipeTitle: recipe.title }) : t('loadingRecipeUpdates')}
      headerAction={<Button compact onPress={() => safeBack('/(tabs)/recipes')} secondary icon="arrow-back">{t('back')}</Button>}>
      <Card style={styles.success}>
        <Text style={styles.successTitle}>{recipe ? recipe.title : t('loadingRecipe')}</Text>
        <Text style={styles.copy}>{t('chooseRoughUpdates')}</Text>
      </Card>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {isLoading ? (
        <Card style={styles.stateCard}>
          <ActivityIndicator color={palette.blue} />
          <Text style={styles.copy}>{t('loadingPantryUpdates')}</Text>
        </Card>
      ) : pantryItems.length ? (
        <View style={styles.section}>
          <SectionTitle>{t('ingredientUpdates')}</SectionTitle>
          {previewUpdates.map(({ item, update }) => (
            <UpdateCard
              choice={choices[item.id] ?? defaultChoiceForItem(item)}
              item={item}
              key={item.id}
              onChange={(choice) => setChoices((current) => ({ ...current, [item.id]: choice }))}
              update={update}
            />
          ))}
        </View>
      ) : (
        <Card style={styles.stateCard}>
          <Ionicons color={palette.green} name="basket-outline" size={24} />
          <Text style={styles.title}>{t('noMatchedPantryItems')}</Text>
          <Text style={styles.copy}>{t('thisRecipeHasNoPantryIngredients')}</Text>
        </Card>
      )}

      <Button onPress={handleSave} icon="save-outline">
        {isSaving ? t('saving') : t('savePantryUpdates')}
      </Button>
    </Screen>
  );
}

function UpdateCard({
  choice,
  item,
  onChange,
  update,
}: {
  choice: PantryUpdateChoice;
  item: PantryItem;
  onChange: (choice: PantryUpdateChoice) => void;
  update: ReturnType<typeof buildPantryUpdate>;
}) {
  const { t } = useAppLanguage();
  const choices = item.quantityUnit === 'level' ? levelChoices : amountChoices;
  const selected = choiceToKey(choice);

  return (
    <Card>
      <Text style={styles.title}>{item.name}</Text>
      <View style={styles.quantityRow}>
        <Text style={styles.copy}>{t('youHave')}</Text>
        <QuantityText item={item} />
      </View>
      <Text style={styles.remaining}>{formatRemainingText(item, update, t)}</Text>
      <View style={styles.choices}>
        {choices.map((option) => (
          <Chip
            key={option}
            label={getChoiceLabel(option, t)}
            onPress={() => onChange(keyToChoice(option))}
            selected={selected === option}
          />
        ))}
      </View>
    </Card>
  );
}

function getChoiceLabel(choice: UpdateChoiceKey, t: ReturnType<typeof useAppLanguage>['t']) {
  if (choice === 'all') {
    return t('usedAll');
  }

  if (choice === 'less') {
    return t('usedLess');
  }

  if (choice === 'skip') {
    return t('noChange');
  }

  return t(choice);
}

function formatRemainingText(
  item: PantryItem,
  update: ReturnType<typeof buildPantryUpdate>,
  t: ReturnType<typeof useAppLanguage>['t'],
) {
  if (!update) {
    return t('noPantryChange');
  }

  if (item.quantityUnit === 'level') {
    return t('remaining', { value: update.new_quantity_label ? t(update.new_quantity_label) : t('unknown') });
  }

  return t('remaining', {
    value: `${update.new_quantity_value ?? 0} ${t(item.quantityUnit)}${update.new_quantity_value === 1 ? '' : 's'}`,
  });
}

const styles = StyleSheet.create({
  success: {
    backgroundColor: palette.blueSoft,
  },
  successTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  copy: {
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
  section: {
    gap: 10,
  },
  stateCard: {
    alignItems: 'flex-start',
  },
  title: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  quantityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  remaining: {
    color: palette.blue,
    fontSize: 14,
    fontWeight: '800',
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
});
