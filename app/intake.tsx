import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, palette, Screen } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useAppLanguage } from '@/contexts/language-context';
import { createPantryItem, getErrorMessage, isDuplicatePantryItemError } from '@/lib/pantry/pantry';
import { IntakeDraft, IntakeDraftFields, parseIntakeText } from '@/lib/pantry/pantry-intake';
import { safeBack } from '@/lib/shared/navigation';
import { QuantityLabel, QuantityUnit, StorageLocation } from '@/types/useitup';

const categories = ['produce', 'meat', 'dairy', 'grain', 'condiment', 'other'] as const;
const quantityTypes: QuantityUnit[] = ['count', 'portion', 'level'];
const locations: StorageLocation[] = ['fridge', 'freezer', 'pantry'];
const levels: QuantityLabel[] = ['empty', 'low', 'medium', 'half', 'full'];

export default function IntakeScreen() {
  const { t, languageCode } = useAppLanguage();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<IntakeDraft[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleParse() {
    if (isParsing) {
      return;
    }

    if (!text.trim()) {
      setMessage(t('intakeEmptyInput'));
      return;
    }

    setMessage('');
    setIsParsing(true);

    try {
      const parsed = await parseIntakeText(text, languageCode);
      setDrafts(parsed);
      setHasParsed(true);

      if (!parsed.length) {
        setMessage(t('intakeNoItemsFound'));
      }
    } catch (error) {
      setMessage(getErrorMessage(error, t('intakeError')));
    } finally {
      setIsParsing(false);
    }
  }

  function updateDraft(id: string, changes: Partial<IntakeDraftFields>) {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...changes } : draft)));
  }

  function removeDraft(id: string) {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  }

  async function handleSaveAll() {
    if (!user || isSaving) {
      return;
    }

    const ready = drafts.filter((draft) => draft.name.trim().length > 0);

    if (!ready.length) {
      setMessage(t('intakeNoItemsFound'));
      return;
    }

    setMessage('');
    setIsSaving(true);

    for (const draft of ready) {
      try {
        await createPantryItem(user.id, {
          name: draft.name,
          category: draft.category,
          storageLocation: draft.storageLocation,
          quantityValue: draft.quantityUnit === 'level' ? undefined : draft.quantityValue,
          quantityUnit: draft.quantityUnit,
          quantityLabel: draft.quantityUnit === 'level' ? draft.quantityLabel : undefined,
          expirationDate: draft.expirationDate,
          notes: draft.notes,
          language: languageCode,
        });
      } catch (error) {
        // A duplicate just means the item is already in the pantry; skip it and
        // keep saving the rest rather than failing the whole batch.
        if (!isDuplicatePantryItemError(error)) {
          setMessage(getErrorMessage(error, t('unableToSaveItem')));
          setIsSaving(false);
          return;
        }
      }
    }

    setIsSaving(false);
    router.replace('/(tabs)/pantry');
  }

  return (
    <Screen
      keyboardAware
      title={t('intakeTitle')}
      subtitle={t('intakeSubtitle')}
      headerAction={
        <Button compact icon="close" onPress={() => safeBack('/(tabs)/pantry')} secondary>
          {t('close')}
        </Button>
      }>
      <Card style={styles.inputCard}>
        <Text style={styles.label}>{t('intakeDescribeLabel')}</Text>
        <TextInput
          multiline
          onChangeText={setText}
          placeholder={t('intakeInputPlaceholder')}
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={text}
        />
        <Button disabled={isParsing} icon="sparkles-outline" onPress={handleParse}>
          {isParsing ? t('intakeReading') : t('intakeReview')}
        </Button>
      </Card>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {drafts.length ? (
        <>
          <Text style={styles.sectionHeading}>{t('intakeDraftsHeading')}</Text>
          {drafts.map((draft) => (
            <Card key={draft.id} style={styles.draftCard}>
              <View style={styles.draftHeader}>
                <TextInput
                  onChangeText={(value) => updateDraft(draft.id, { name: value })}
                  placeholder={t('itemName')}
                  placeholderTextColor={palette.muted}
                  style={styles.nameInput}
                  value={draft.name}
                />
                <Pressable
                  accessibilityLabel={t('remove')}
                  hitSlop={10}
                  onPress={() => removeDraft(draft.id)}
                  style={styles.removeButton}>
                  <Ionicons color={palette.red} name="trash-outline" size={20} />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>{t('category')}</Text>
              <View style={styles.options}>
                {categories.map((value) => (
                  <Chip
                    key={value}
                    label={t(value)}
                    onPress={() => updateDraft(draft.id, { category: value })}
                    selected={draft.category === value}
                  />
                ))}
              </View>

              <Text style={styles.fieldLabel}>{t('storage')}</Text>
              <View style={styles.options}>
                {locations.map((value) => (
                  <Chip
                    key={value}
                    label={t(value)}
                    onPress={() => updateDraft(draft.id, { storageLocation: value })}
                    selected={draft.storageLocation === value}
                  />
                ))}
              </View>

              <Text style={styles.fieldLabel}>{t('quantityType')}</Text>
              <View style={styles.options}>
                {quantityTypes.map((value) => (
                  <Chip
                    key={value}
                    label={t(value)}
                    onPress={() =>
                      updateDraft(draft.id, {
                        quantityUnit: value,
                        quantityValue: value === 'level' ? undefined : draft.quantityValue ?? 1,
                        quantityLabel: value === 'level' ? draft.quantityLabel ?? 'medium' : undefined,
                      })
                    }
                    selected={draft.quantityUnit === value}
                  />
                ))}
              </View>

              {draft.quantityUnit === 'level' ? (
                <>
                  <Text style={styles.fieldLabel}>{t('level')}</Text>
                  <View style={styles.options}>
                    {levels.map((value) => (
                      <Chip
                        key={value}
                        label={t(value)}
                        onPress={() => updateDraft(draft.id, { quantityLabel: value })}
                        selected={draft.quantityLabel === value}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>{t('amount')}</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    onChangeText={(value) => updateDraft(draft.id, { quantityValue: Number(value) || undefined })}
                    style={styles.amountInput}
                    value={draft.quantityValue != null ? String(draft.quantityValue) : ''}
                  />
                </>
              )}

              <View style={styles.expirationRow}>
                <Ionicons color={palette.muted} name="calendar-outline" size={18} />
                <Text style={styles.expirationText}>
                  {draft.expirationDate ? formatDate(draft.expirationDate, languageCode) : t('selectDate')}
                </Text>
                {draft.expirationDate ? (
                  <Pressable hitSlop={10} onPress={() => updateDraft(draft.id, { expirationDate: undefined })}>
                    <Ionicons color={palette.muted} name="close-circle" size={18} />
                  </Pressable>
                ) : null}
              </View>
            </Card>
          ))}

          <Button disabled={isSaving} icon="checkmark" onPress={handleSaveAll}>
            {isSaving ? t('intakeAdding') : t('intakeAddAll', { count: drafts.length })}
          </Button>
        </>
      ) : hasParsed && !isParsing ? (
        <Text style={styles.emptyHint}>{t('intakeNoItemsFound')}</Text>
      ) : null}
    </Screen>
  );
}

function formatDate(isoDate: string, languageCode: string) {
  const date = new Date(`${isoDate}T12:00:00`);

  return new Intl.DateTimeFormat(languageCode, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

const styles = StyleSheet.create({
  inputCard: {
    gap: 10,
  },
  label: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  message: {
    color: palette.red,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 12,
  },
  sectionHeading: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
    marginTop: 18,
  },
  draftCard: {
    gap: 8,
    marginTop: 12,
  },
  draftHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  nameInput: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  amountInput: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  expirationRow: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  expirationText: {
    color: palette.ink,
    flex: 1,
    fontSize: 15,
  },
  emptyHint: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 18,
    textAlign: 'center',
  },
});
