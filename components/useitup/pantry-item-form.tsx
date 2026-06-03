import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, palette } from '@/components/useitup/ui';
import { useAppLanguage } from '@/contexts/language-context';
import { parseExpirationDate } from '@/lib/date-utils';
import { QuantityLabel, QuantityUnit, StorageLocation } from '@/types/useitup';

export type PantryItemFormValues = {
  name: string;
  category: string;
  quantityType: QuantityUnit;
  amount: string;
  level: string;
  location: StorageLocation;
  expiration: string;
  notes: string;
};

type PantryItemFormProps = {
  initialValues?: Partial<PantryItemFormValues>;
  isSaving?: boolean;
  message?: string;
  submitLabel: string;
  onSubmit: (values: PantryItemFormValues) => void;
};

const categories = ['produce', 'meat', 'dairy', 'grain', 'condiment', 'other'] as const;
const quantityTypes: QuantityUnit[] = ['count', 'portion', 'level'];
const locations: StorageLocation[] = ['fridge', 'freezer', 'pantry'];
const levels = ['low', 'medium', 'half', 'full'] as const;

export function PantryItemForm({
  initialValues,
  isSaving,
  message,
  onSubmit,
  submitLabel,
}: PantryItemFormProps) {
  const { t, languageCode } = useAppLanguage();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [category, setCategory] = useState(initialValues?.category?.toLowerCase() ?? 'meat');
  const [quantityType, setQuantityType] = useState<QuantityUnit>(initialValues?.quantityType ?? 'portion');
  const [amount, setAmount] = useState(initialValues?.amount ?? '2');
  const [level, setLevel] = useState(initialValues?.level?.toLowerCase() ?? 'medium');
  const [location, setLocation] = useState<StorageLocation>(initialValues?.location ?? 'fridge');
  const [expiration, setExpiration] = useState(initialValues?.expiration ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [showExpirationPicker, setShowExpirationPicker] = useState(false);

  const expirationDate = expiration ? new Date(`${expiration}T12:00:00`) : null;
  const expirationLabel = expirationDate
    ? new Intl.DateTimeFormat(languageCode, { day: 'numeric', month: 'short', year: 'numeric' }).format(
        expirationDate,
      )
    : t('selectDate');

  function handleExpirationChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS !== 'ios') {
      setShowExpirationPicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      setExpiration(toIsoDate(selectedDate));
    }
  }

  return (
    <>
      <Card style={styles.form}>
        <FieldLabel>{t('itemName')}</FieldLabel>
        <TextInput onChangeText={setName} style={styles.input} value={name} />

        <FieldLabel>{t('category')}</FieldLabel>
        <View style={styles.options}>
          {categories.map((value) => (
            <Chip key={value} label={t(value)} onPress={() => setCategory(value)} selected={category === value} />
          ))}
        </View>

        <FieldLabel>{t('quantityType')}</FieldLabel>
        <View style={styles.options}>
          {quantityTypes.map((value) => (
            <Chip
              key={value}
              label={t(value)}
              onPress={() => setQuantityType(value)}
              selected={quantityType === value}
            />
          ))}
        </View>

        {quantityType === 'level' ? (
          <>
            <FieldLabel>{t('level')}</FieldLabel>
            <View style={styles.options}>
              {levels.map((value) => (
                <Chip key={value} label={t(value)} onPress={() => setLevel(value)} selected={level === value} />
              ))}
            </View>
          </>
        ) : (
          <>
            <FieldLabel>{t('amount')}</FieldLabel>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setAmount}
              style={styles.input}
              value={amount}
            />
          </>
        )}

        <FieldLabel>{t('storage')}</FieldLabel>
        <View style={styles.options}>
          {locations.map((value) => (
            <Chip
              key={value}
              label={t(value)}
              onPress={() => setLocation(value)}
              selected={location === value}
            />
          ))}
        </View>

        <FieldLabel>{t('expirationDate')}</FieldLabel>
        <Pressable onPress={() => setShowExpirationPicker(true)} style={styles.inputRow}>
          <Ionicons color={palette.muted} name="calendar-outline" size={19} />
          <Text style={[styles.dateText, !expiration && styles.datePlaceholder]}>{expirationLabel}</Text>
          {expiration ? (
            <Pressable hitSlop={10} onPress={() => setExpiration('')}>
              <Ionicons color={palette.muted} name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </Pressable>
        {showExpirationPicker ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              mode="date"
              onChange={handleExpirationChange}
              value={expirationDate ?? new Date()}
            />
            {Platform.OS === 'ios' ? (
              <Button compact icon="checkmark" onPress={() => setShowExpirationPicker(false)}>
                {t('close')}
              </Button>
            ) : null}
          </View>
        ) : null}

        <FieldLabel>{t('notes')}</FieldLabel>
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder={t('optionalNotes')}
          placeholderTextColor={palette.muted}
          style={[styles.input, styles.notes]}
          value={notes}
        />
      </Card>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button
        onPress={() =>
          onSubmit({
            name,
            category,
            quantityType,
            amount,
            level,
            location,
            expiration,
            notes,
          })
        }
        icon="checkmark">
        {isSaving ? t('saving') : submitLabel}
      </Button>
    </>
  );
}

export { parseExpirationDate };

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function quantityLabelFromLevel(level: string) {
  return level.toLowerCase() as QuantityLabel;
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  form: {
    gap: 9,
  },
  label: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 4,
  },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  dateText: {
    color: palette.ink,
    flex: 1,
    fontSize: 16,
  },
  datePlaceholder: {
    color: palette.muted,
  },
  pickerWrap: {
    gap: 8,
    marginTop: 4,
  },
  notes: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  message: {
    color: palette.red,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
