import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

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
  const { t } = useAppLanguage();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [category, setCategory] = useState(initialValues?.category?.toLowerCase() ?? 'meat');
  const [quantityType, setQuantityType] = useState<QuantityUnit>(initialValues?.quantityType ?? 'portion');
  const [amount, setAmount] = useState(initialValues?.amount ?? '2');
  const [level, setLevel] = useState(initialValues?.level?.toLowerCase() ?? 'medium');
  const [location, setLocation] = useState<StorageLocation>(initialValues?.location ?? 'fridge');
  const [expiration, setExpiration] = useState(initialValues?.expiration ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');

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
        <View style={styles.inputRow}>
          <Ionicons color={palette.muted} name="calendar-outline" size={19} />
          <TextInput
            onChangeText={setExpiration}
            placeholder={t('expirationDatePlaceholder')}
            placeholderTextColor={palette.muted}
            style={styles.rowInput}
            value={expiration}
          />
        </View>

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
  rowInput: {
    color: palette.ink,
    flex: 1,
    fontSize: 16,
    minHeight: 46,
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
