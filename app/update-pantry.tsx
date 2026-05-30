import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, palette, QuantityText, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { PantryUpdateChoice, buildPantryUpdate, cookRecipeAndUpdatePantry, defaultChoiceForItem } from '@/lib/cooking';
import { useRefresh } from '@/hooks/use-refresh';
import { safeBack } from '@/lib/navigation';
import { getErrorMessage, getPantryItemById } from '@/lib/pantry';
import { getSavedRecipeById } from '@/lib/recipes';
import { UpdateChoiceKey, choiceToKey, getRemainingText, keyToChoice } from '@/lib/update-pantry-ui';
import { PantryItem, Recipe } from '@/types/useitup';

const amountChoices: { label: string; value: UpdateChoiceKey }[] = [
  { label: 'Suggested', value: 'suggested' },
  { label: 'Used all', value: 'all' },
  { label: 'Used less', value: 'less' },
  { label: 'Skip', value: 'skip' },
];

const levelChoices: { label: string; value: UpdateChoiceKey }[] = [
  { label: 'Empty', value: 'empty' },
  { label: 'Low', value: 'low' },
  { label: 'Half', value: 'half' },
  { label: 'Full', value: 'full' },
  { label: 'No change', value: 'skip' },
];

export default function UpdatePantryScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId?: string }>();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [choices, setChoices] = useState<Record<string, PantryUpdateChoice>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadCookData = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (!user || !recipeId) {
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }
      setMessage('');

      try {
        const nextRecipe = await getSavedRecipeById(user.id, recipeId);

        if (!nextRecipe) {
          setRecipe(null);
          setPantryItems([]);
          setMessage('This saved recipe could not be found.');
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
        setMessage(getErrorMessage(error, 'Unable to load recipe pantry updates.'));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [recipeId, user],
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
      await cookRecipeAndUpdatePantry({
        choices,
        pantryItems,
        recipe,
        userId: user.id,
      });

      router.replace('/(tabs)/pantry');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to save pantry updates.'));
    } finally {
      setIsSaving(false);
    }
  }

  if (!recipeId) {
    return (
      <Screen
        title="Update Your Pantry"
        subtitle="Choose a saved recipe before updating pantry quantities."
        headerAction={<Button compact onPress={() => safeBack('/(tabs)/recipes')} secondary icon="arrow-back">Back</Button>}>
        <Card style={styles.stateCard}>
          <Text style={styles.title}>No recipe selected</Text>
          <Text style={styles.copy}>Open a saved recipe and tap I Cooked This to update pantry items.</Text>
          <Button compact href="/(tabs)/recipes" icon="restaurant-outline">
            View Recipes
          </Button>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={refresh}
      refreshing={isRefreshing}
      title="Update Your Pantry"
      subtitle={recipe ? `Confirm what changed after cooking ${recipe.title}.` : 'Loading recipe updates.'}
      headerAction={<Button compact onPress={() => safeBack('/(tabs)/recipes')} secondary icon="arrow-back">Back</Button>}>
      <Card style={styles.success}>
        <Text style={styles.successTitle}>{recipe ? recipe.title : 'Loading recipe'}</Text>
        <Text style={styles.copy}>Choose rough updates so the next recipe suggestion stays useful.</Text>
      </Card>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {isLoading ? (
        <Card style={styles.stateCard}>
          <ActivityIndicator color={palette.blue} />
          <Text style={styles.copy}>Loading pantry updates...</Text>
        </Card>
      ) : pantryItems.length ? (
        <View style={styles.section}>
          <SectionTitle>Ingredient Updates</SectionTitle>
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
          <Text style={styles.title}>No matched pantry items</Text>
          <Text style={styles.copy}>This recipe does not include pantry-linked ingredients to update.</Text>
        </Card>
      )}

      <Button onPress={handleSave} icon="save-outline">
        {isSaving ? 'Saving...' : 'Save Pantry Updates'}
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
  const choices = item.quantityUnit === 'level' ? levelChoices : amountChoices;
  const selected = choiceToKey(choice);

  return (
    <Card>
      <Text style={styles.title}>{item.name}</Text>
      <View style={styles.quantityRow}>
        <Text style={styles.copy}>You have:</Text>
        <QuantityText item={item} />
      </View>
      <Text style={styles.remaining}>{getRemainingText(item, update)}</Text>
      <View style={styles.choices}>
        {choices.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            onPress={() => onChange(keyToChoice(option.value))}
            selected={selected === option.value}
          />
        ))}
      </View>
    </Card>
  );
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
