import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, palette, Screen, SectionTitle } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { getErrorMessage } from '@/lib/errors';
import { getFavoriteRecipeById, updateFavoriteRecipe } from '@/lib/favorite-recipes';
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
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
      const favorite = await getFavoriteRecipeById(user.id, id);

      if (!favorite) {
        setMessage('This favorite recipe could not be found.');
        return;
      }

      setRecipe(favorite);
      setInput(getFavoriteRecipeEditInput(favorite));
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to load this favorite recipe.'));
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

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
      setMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const updatedRecipe = await updateFavoriteRecipe(user.id, recipe.id, buildEditedFavoriteRecipe(recipe, input));
      router.replace(`/recipe/${updatedRecipe.id}`);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to save this favorite recipe.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen
      keyboardAware
      title="Edit Favorite"
      subtitle="Update your saved recipe snapshot."
      headerAction={<Button compact href={`/recipe/${id}`} secondary icon="arrow-back">Back</Button>}>
      {isLoading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={palette.blue} />
          <Text style={styles.body}>Loading favorite recipe...</Text>
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
            <SectionTitle>Recipe Basics</SectionTitle>
            <Card>
              <Field label="Title">
                <TextInput
                  autoCapitalize="words"
                  onChangeText={(value) => updateInput('title', value)}
                  placeholder="Recipe title"
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={input.title}
                />
              </Field>
              <Field label="Description">
                <TextInput
                  multiline
                  onChangeText={(value) => updateInput('description', value)}
                  placeholder="Short description"
                  placeholderTextColor={palette.muted}
                  style={[styles.input, styles.multilineInput]}
                  value={input.description}
                />
              </Field>
              <Field label="Prep Time">
                <TextInput
                  inputMode="numeric"
                  keyboardType="number-pad"
                  onChangeText={(value) => updateInput('prepTimeMinutes', value)}
                  placeholder="Minutes"
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
                <Text style={styles.toggleLabel}>Uses expiring items</Text>
              </Pressable>
            </Card>
          </View>

          <View style={styles.section}>
            <SectionTitle>Ingredients</SectionTitle>
            <Card>
              <Field label="Pantry Ingredients">
                <TextInput
                  multiline
                  onChangeText={(value) => updateInput('availableIngredientsText', value)}
                  placeholder="One ingredient per line"
                  placeholderTextColor={palette.muted}
                  style={[styles.input, styles.tallInput]}
                  value={input.availableIngredientsText}
                />
              </Field>
              <Field label="Missing Ingredients">
                <TextInput
                  multiline
                  onChangeText={(value) => updateInput('missingIngredientsText', value)}
                  placeholder="One missing ingredient per line"
                  placeholderTextColor={palette.muted}
                  style={[styles.input, styles.tallInput]}
                  value={input.missingIngredientsText}
                />
              </Field>
            </Card>
          </View>

          <View style={styles.section}>
            <SectionTitle>Instructions</SectionTitle>
            <Card>
              <Field label="Steps">
                <TextInput
                  multiline
                  onChangeText={(value) => updateInput('instructionsText', value)}
                  placeholder="One step per line"
                  placeholderTextColor={palette.muted}
                  style={[styles.input, styles.stepsInput]}
                  value={input.instructionsText}
                />
              </Field>
            </Card>
          </View>

          <Button disabled={isSaving} icon="save-outline" onPress={handleSave}>
            {isSaving ? 'Saving...' : 'Save Favorite'}
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
