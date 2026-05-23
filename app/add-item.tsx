import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, palette, Screen } from '@/components/useitup/ui';
import { QuantityUnit, StorageLocation } from '@/types/useitup';

const categories = ['Produce', 'Meat', 'Dairy', 'Grain', 'Condiment', 'Other'];
const quantityTypes: { label: string; value: QuantityUnit }[] = [
  { label: 'Count', value: 'count' },
  { label: 'Portion', value: 'portion' },
  { label: 'Level', value: 'level' },
];
const locations: { label: string; value: StorageLocation }[] = [
  { label: 'Fridge', value: 'fridge' },
  { label: 'Freezer', value: 'freezer' },
  { label: 'Pantry', value: 'pantry' },
];
const levels = ['Low', 'Medium', 'Half', 'Full'];

export default function AddItemScreen() {
  const [name, setName] = useState('Steak');
  const [category, setCategory] = useState('Meat');
  const [quantityType, setQuantityType] = useState<QuantityUnit>('portion');
  const [amount, setAmount] = useState('2');
  const [level, setLevel] = useState('Medium');
  const [location, setLocation] = useState<StorageLocation>('fridge');
  const [expiration, setExpiration] = useState('Tomorrow');
  const [notes, setNotes] = useState('');

  return (
    <Screen
      title="Add Item"
      subtitle="A quick entry form for a pantry item. This prototype keeps the save local and static."
      headerAction={<Button compact onPress={() => router.back()} secondary icon="close">Close</Button>}>
      <Card style={styles.form}>
        <FieldLabel>Item Name</FieldLabel>
        <TextInput onChangeText={setName} style={styles.input} value={name} />

        <FieldLabel>Category</FieldLabel>
        <View style={styles.options}>
          {categories.map((value) => (
            <Chip key={value} label={value} onPress={() => setCategory(value)} selected={category === value} />
          ))}
        </View>

        <FieldLabel>Quantity Type</FieldLabel>
        <View style={styles.options}>
          {quantityTypes.map((value) => (
            <Chip
              key={value.value}
              label={value.label}
              onPress={() => setQuantityType(value.value)}
              selected={quantityType === value.value}
            />
          ))}
        </View>

        {quantityType === 'level' ? (
          <>
            <FieldLabel>Level</FieldLabel>
            <View style={styles.options}>
              {levels.map((value) => (
                <Chip key={value} label={value} onPress={() => setLevel(value)} selected={level === value} />
              ))}
            </View>
          </>
        ) : (
          <>
            <FieldLabel>Amount</FieldLabel>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setAmount}
              style={styles.input}
              value={amount}
            />
          </>
        )}

        <FieldLabel>Location</FieldLabel>
        <View style={styles.options}>
          {locations.map((value) => (
            <Chip
              key={value.value}
              label={value.label}
              onPress={() => setLocation(value.value)}
              selected={location === value.value}
            />
          ))}
        </View>

        <FieldLabel>Expiration Date</FieldLabel>
        <View style={styles.inputRow}>
          <Ionicons color={palette.muted} name="calendar-outline" size={19} />
          <TextInput onChangeText={setExpiration} style={styles.rowInput} value={expiration} />
        </View>

        <FieldLabel>Notes</FieldLabel>
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder="Optional notes"
          placeholderTextColor={palette.muted}
          style={[styles.input, styles.notes]}
          value={notes}
        />
      </Card>
      <Button href="/(tabs)/pantry" icon="checkmark">
        Save Item
      </Button>
    </Screen>
  );
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
});
