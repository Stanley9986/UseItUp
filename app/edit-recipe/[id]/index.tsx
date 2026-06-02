import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, palette, Screen, SectionTitle } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useAppLanguage } from '@/contexts/language-context';
import { getErrorMessage } from '@/lib/errors';
import { getFavoriteRecipeById, updateFavoriteRecipe } from '@/lib/favorite-recipes';
import { getSavedRecipeById, updateSavedRecipe } from '@/lib/recipes';
import {
  buildEditedFavoriteRecipe,
  FavoriteRecipeEditInput,
  getFavoriteRecipeEditInput,
  validateFavoriteRecipeEditInput,
} from '@/lib/recipe-editing';
import { Recipe } from '@/types/useitup';

const emptyInput: FavoriteRecipeEditInput = {
  availableIngredientsText: '',
  description: '',
  instructionsText: '',
  missingIngredientsText: '',
  prepTimeMinutes: '',
  title: '',
  usesExpiringItems: false,
};

export default function EditRecipeScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const { user } = useAuth();
  const { t } = useAppLanguage();
  const editType = type === 'suggested' ? 'suggested' : 'favorite';
  const isSuggestedEdit = editType === 'suggested';
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [input, setInput] = useState<FavoriteRecipeEditInput>(emptyInput);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadRecipe = useCallback(async () => {
    if (!user || !id) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const nextRecipe = isSuggestedEdit
        ? await getSavedRecipeById(user.id, id)
        : await getFavoriteRecipeById(user.id, id);

      if (!nextRecipe) {
        setMessage(isSuggestedEdit ? t('savedRecipeNotFound') : t('favoriteRecipeNotFound'));
        return;
      }

      setRecipe(nextRecipe);
      setInput(getFavoriteRecipeEditInput(nextRecipe));
    } catch (error) {
      setMessage(getErrorMessage(error, isSuggestedEdit ? t('unableToLoadSavedRecipe') : t('unableToLoadFavoriteRecipe')));
    } finally {
      setIsLoading(false);
    }
  }, [id, isSuggestedEdit, t, user]);

  useEffect(() => {
    loadRecipe();
  }, [loadRecipe]);

  function updateInput<Key extends keyof FavoriteRecipeEditInput>(key: Key, value: FavoriteRecipeEditInput[Key]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!user || !recipe || isSaving) {
      return;
    }

    const validationMessage = validateFavoriteRecipeEditInput(input);

    if (validationMessage) {
      setMessage(translateValidationMessage(validationMessage, t));
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const editedRecipe = buildEditedFavoriteRecipe(recipe, input);
      const updatedRecipe = isSuggestedEdit
        ? await updateSavedRecipe(user.id, recipe.id, editedRecipe)
        : await updateFavoriteRecipe(user.id, recipe.id, editedRecipe);

      if (!updatedRecipe) {
        setMessage(t('recipeReloadFailed'));
        return;
      }

      router.replace(`/recipe/${updatedRecipe.id}`);
    } catch (error) {
      setMessage(getErrorMessage(error, isSuggestedEdit ? t('unableToSaveRecipe') : t('unableToSaveFavoriteRecipe')));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen
      keyboardAware
      title={isSuggestedEdit ? t('editRecipe') : t('editFavorite')}
      subtitle={isSuggestedEdit ? t('editSuggestedRecipeSubtitle') : t('editFavoriteSubtitle')}
      headerAction={<Button compact href={`/recipe/${id}`} secondary icon="arrow-back">{t('back')}</Button>}>
      {isLoading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={palette.blue} />
          <Text style={styles.body}>{isSuggestedEdit ? t('loadingSavedRecipe') : t('loadingFavoriteRecipe')}</Text>
        </Card>
      ) : null}

      {message ? (
        <View style={styles.messageBox}>
          <Ionicons color={palette.red} name="alert-circle-outline" size={18} />
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      {!isLoading && recipe ? (
        <>
          <View style={styles.section}>
            <SectionTitle>{t('recipeBasics')}</SectionTitle>
            <Card>
              <Field label={t('title')}>
                <TextInput
                  autoCapitalize="words"
                  onChangeText={(value) => updateInput('title', value)}
                  placeholder={t('recipeTitle')}
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={input.title}
                />
              </Field>
              <Field label={t('description')}>
                <TextInput
                  multiline
                  onChangeText={(value) => updateInput('description', value)}
                  placeholder={t('shortDescription')}
                  placeholderTextColor={palette.muted}
                  style={[styles.input, styles.multilineInput]}
                  value={input.description}
                />
              </Field>
              <Field label={t('prepTime')}>
                <TextInput
                  inputMode="numeric"
                  keyboardType="number-pad"
                  onChangeText={(value) => updateInput('prepTimeMinutes', value)}
                  placeholder={t('minutes')}
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={input.prepTimeMinutes}
                />
              </Field>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: input.usesExpiringItems }}
                onPress={() => updateInput('usesExpiringItems', !input.usesExpiringItems)}
                style={styles.toggleRow}>
                <View style={[styles.checkbox, input.usesExpiringItems && styles.checkedBox]}>
                  {input.usesExpiringItems ? <Ionicons color="#fff" name="checkmark" size={15} /> : null}
                </View>
                <Text style={styles.toggleLabel}>{t('usesExpiringItems')}</Text>
              </Pressable>
            </Card>
          </View>

          <View style={styles.section}>
            <SectionTitle>{t('ingredients')}</SectionTitle>
            <Card>
              <Field label={t('pantryIngredients')}>
                <TextInput
                  multiline
                  onChangeText={(value) => updateInput('availableIngredientsText', value)}
                  placeholder={t('oneIngredientPerLine')}
                  placeholderTextColor={palette.muted}
                  style={[styles.input, styles.tallInput]}
                  value={input.availableIngredientsText}
                />
              </Field>
              <Field label={t('missingIngredients')}>
                <TextInput
                  multiline
                  onChangeText={(value) => updateInput('missingIngredientsText', value)}
                  placeholder={t('oneMissingIngredientPerLine')}
                  placeholderTextColor={palette.muted}
                  style={[styles.input, styles.tallInput]}
                  value={input.missingIngredientsText}
                />
              </Field>
            </Card>
          </View>

          <View style={styles.section}>
            <SectionTitle>{t('instructions')}</SectionTitle>
            <Card>
              <Field label={t('steps')}>
                <TextInput
                  multiline
                  onChangeText={(value) => updateInput('instructionsText', value)}
                  placeholder={t('oneStepPerLine')}
                  placeholderTextColor={palette.muted}
                  style={[styles.input, styles.stepsInput]}
                  value={input.instructionsText}
                />
              </Field>
            </Card>
          </View>

          <Button disabled={isSaving} icon="save-outline" onPress={handleSave}>
            {isSaving ? t('saving') : isSuggestedEdit ? t('saveRecipe') : t('saveFavorite')}
          </Button>
        </>
      ) : null}
    </Screen>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function translateValidationMessage(message: string, t: ReturnType<typeof useAppLanguage>['t']) {
  if (message === 'Add a recipe title before saving.') {
    return t('addRecipeTitleBeforeSaving');
  }

  if (message === 'Add at least one ingredient before saving.') {
    return t('addIngredientBeforeSaving');
  }

  if (message === 'Add at least one instruction before saving.') {
    return t('addInstructionBeforeSaving');
  }

  if (message === 'Prep time must be a whole number of minutes.') {
    return t('prepTimeWholeMinutes');
  }

  return message;
}

const styles = StyleSheet.create({
  section: {
    gap: 9,
  },
  field: {
    gap: 6,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multilineInput: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  tallInput: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
  stepsInput: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 44,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 7,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkedBox: {
    backgroundColor: palette.green,
    borderColor: palette.green,
  },
  toggleLabel: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  messageBox: {
    alignItems: 'flex-start',
    backgroundColor: '#fff4f1',
    borderColor: '#f1c8bd',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  messageText: {
    color: palette.red,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  loadingCard: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  body: {
    color: palette.muted,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
