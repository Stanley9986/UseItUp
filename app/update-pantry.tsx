import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { safeBack } from '@/lib/navigation';

type UsageChoice = 'suggested' | 'all' | 'less' | 'skip' | 'low' | 'unchanged';

const amountChoices: { label: string; value: UsageChoice }[] = [
  { label: 'Used suggested amount', value: 'suggested' },
  { label: 'Used all', value: 'all' },
  { label: 'Used less', value: 'less' },
  { label: 'Skip', value: 'skip' },
];

const levelChoices: { label: string; value: UsageChoice }[] = [
  { label: 'Now low', value: 'low' },
  { label: 'Used all', value: 'all' },
  { label: 'No change', value: 'unchanged' },
  { label: 'Skip', value: 'skip' },
];

export default function UpdatePantryScreen() {
  const [steakChoice, setSteakChoice] = useState<UsageChoice>('suggested');
  const [spinachChoice, setSpinachChoice] = useState<UsageChoice>('low');

  return (
    <Screen
      title="Update Your Pantry"
      subtitle="Confirm what changed after cooking Steak Rice Bowl."
      headerAction={<Button compact onPress={() => safeBack('/(tabs)/recipes')} secondary icon="arrow-back">Back</Button>}>
      <Card style={styles.success}>
        <Text style={styles.successTitle}>Dinner marked cooked</Text>
        <Text style={styles.copy}>Choose rough updates so the next recipe suggestion stays useful.</Text>
      </Card>

      <View style={styles.section}>
        <SectionTitle>Ingredient Updates</SectionTitle>
        <UpdateCard
          choices={amountChoices}
          onChange={setSteakChoice}
          selected={steakChoice}
          suggested="Suggested use: 1 portion"
          title="Steak"
          youHad="You had: 2 portions"
        >
          Remaining: 1 portion
        </UpdateCard>
        <UpdateCard
          choices={levelChoices}
          onChange={setSpinachChoice}
          selected={spinachChoice}
          suggested="Suggested use: some"
          title="Spinach"
          youHad="You had: medium"
        >
          Remaining: low
        </UpdateCard>
      </View>

      <Button href="/(tabs)/pantry" icon="save-outline">
        Save Pantry Updates
      </Button>
    </Screen>
  );
}

function UpdateCard({
  children,
  choices,
  onChange,
  selected,
  suggested,
  title,
  youHad,
}: {
  children: string;
  choices: { label: string; value: UsageChoice }[];
  onChange: (choice: UsageChoice) => void;
  selected: UsageChoice;
  suggested: string;
  title: string;
  youHad: string;
}) {
  return (
    <Card>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{youHad}</Text>
      <Text style={styles.copy}>{suggested}</Text>
      <Text style={styles.remaining}>{children}</Text>
      <View style={styles.choices}>
        {choices.map((choice) => (
          <Chip
            key={choice.value}
            label={choice.label}
            onPress={() => onChange(choice.value)}
            selected={selected === choice.value}
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
  section: {
    gap: 10,
  },
  title: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
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
