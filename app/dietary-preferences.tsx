import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useRefresh } from '@/hooks/use-refresh';
import { getErrorMessage } from '@/lib/errors';
import { safeBack } from '@/lib/navigation';
import { defaultUserPreferences, getUserPreferences, saveUserPreferences } from '@/lib/user-preferences';
import {
  addAvoidedIngredient,
  normalizeAvoidedIngredient,
  removeAvoidedIngredient,
} from '@/lib/user-preferences-mappers';
import { UserPreferences } from '@/types/useitup';

const dietaryOptions = ['Vegetarian', 'Vegan', 'Dairy-free', 'Gluten-free', 'Nut-free'] as const;
const prepTimeOptions = [15, 30, 45, 60] as const;

export default function DietaryPreferencesScreen() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [draftPreferences, setDraftPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [ingredientInput, setIngredientInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('success');

  const loadPreferences = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (!user) {
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setMessage('');

        const nextPreferences = await getUserPreferences(user.id);
        setPreferences(nextPreferences);
        setDraftPreferences(nextPreferences);
      } catch (error) {
        setMessageType('error');
        setMessage(getErrorMessage(error, 'Unable to load dietary preferences.'));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [user],
  );

  const { isRefreshing, refresh } = useRefresh(() => loadPreferences({ showLoading: false }));

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  function handleToggleDietaryPreference(option: string) {
    setDraftPreferences((current) => {
      const exists = current.dietaryPreferences.includes(option);

      return {
        ...current,
        dietaryPreferences: exists
          ? current.dietaryPreferences.filter((item) => item !== option)
          : [...current.dietaryPreferences, option],
      };
    });
  }

  function handleSelectPrepTime(maxPrepTimeMinutes: number) {
    setDraftPreferences((current) => ({
      ...current,
      maxPrepTimeMinutes,
    }));
  }

  function handleAddAvoidedIngredient() {
    const normalizedIngredient = normalizeAvoidedIngredient(ingredientInput);

    if (!normalizedIngredient) {
      setMessageType('error');
      setMessage('Enter an ingredient before adding it.');
      return;
    }

    setDraftPreferences((current) => addAvoidedIngredient(current, normalizedIngredient));
    setIngredientInput('');
    setMessage('');
  }

  function handleRemoveAvoidedIngredient(ingredient: string) {
    setDraftPreferences((current) => removeAvoidedIngredient(current, ingredient));
  }

  function handleCancel() {
    setDraftPreferences(preferences);
    setIngredientInput('');
    setMessage('');
    safeBack('/(tabs)/profile');
  }

  async function handleSave() {
    if (!user || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const nextPreferences = await saveUserPreferences(user.id, draftPreferences);
      setPreferences(nextPreferences);
      setDraftPreferences(nextPreferences);
      setMessageType('success');
      setMessage('Preferences saved.');
    } catch (error) {
      setMessageType('error');
      setMessage(getErrorMessage(error, 'Unable to save dietary preferences.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen
      keyboardAware
      onRefresh={refresh}
      refreshing={isRefreshing}
      title="Dietary Preferences"
      subtitle="Personalize recipes without making pantry entry harder."
      headerAction={<Button compact onPress={handleCancel} secondary icon="arrow-back">Back</Button>}>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Diet style</Text>
        <Text style={styles.cardCopy}>Choose any labels that should guide generated meals.</Text>
        <View style={styles.chipWrap}>
          {dietaryOptions.map((option) => (
            <Chip
              key={option}
              label={option}
              onPress={() => handleToggleDietaryPreference(option)}
              selected={draftPreferences.dietaryPreferences.includes(option)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Avoid ingredients</Text>
        <Text style={styles.cardCopy}>Add items the recipe generator should avoid.</Text>
        <View style={styles.addRow}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setIngredientInput}
            onSubmitEditing={handleAddAvoidedIngredient}
            placeholder="peanuts"
            placeholderTextColor={palette.muted}
            returnKeyType="done"
            style={styles.input}
            value={ingredientInput}
          />
          <Pressable accessibilityLabel="Add avoided ingredient" onPress={handleAddAvoidedIngredient} style={styles.addButton}>
            <Ionicons color="#fff" name="add" size={22} />
          </Pressable>
        </View>
        {draftPreferences.avoidedIngredients.length ? (
          <View style={styles.ingredientList}>
            {draftPreferences.avoidedIngredients.map((ingredient) => (
              <View key={ingredient} style={styles.ingredientPill}>
                <Text style={styles.ingredientText}>{ingredient}</Text>
                <Pressable
                  accessibilityLabel={`Remove ${ingredient}`}
                  hitSlop={8}
                  onPress={() => handleRemoveAvoidedIngredient(ingredient)}>
                  <Ionicons color={palette.muted} name="close-circle" size={20} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyCopy}>No avoided ingredients yet.</Text>
        )}
      </Card>

      <View style={styles.section}>
        <SectionTitle>Meal Pace</SectionTitle>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Preferred max prep time</Text>
          <View style={styles.chipWrap}>
            {prepTimeOptions.map((option) => (
              <Chip
                key={option}
                label={`${option} min`}
                onPress={() => handleSelectPrepTime(option)}
                selected={draftPreferences.maxPrepTimeMinutes === option}
              />
            ))}
          </View>
        </Card>
      </View>

      {message ? (
        <Text style={[styles.message, messageType === 'error' ? styles.errorText : styles.successText]}>
          {message}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button disabled={isSaving || isLoading} icon="save-outline" onPress={handleSave}>
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
        <Button disabled={isSaving} icon="close-outline" onPress={handleCancel} secondary>
          Cancel
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
  },
  cardTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: '900',
  },
  cardCopy: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    flex: 1,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: palette.blue,
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  ingredientList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientPill: {
    alignItems: 'center',
    backgroundColor: palette.blueSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ingredientText: {
    color: palette.blue,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyCopy: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  message: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  errorText: {
    color: palette.red,
  },
  successText: {
    color: palette.green,
  },
  actions: {
    gap: 10,
  },
});
