import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { findRecipe } from '@/data/mock-useitup';
import { findGeneratedRecipe } from '@/lib/generated-recipes';
import { safeBack } from '@/lib/navigation';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = findGeneratedRecipe(id) ?? findRecipe(id);
  const availableIngredients = recipe.ingredients.filter((ingredient) => ingredient.isAvailable);

  return (
    <Screen
      title={recipe.title}
      subtitle={recipe.description}
      headerAction={<Button compact onPress={() => safeBack('/(tabs)/recipes')} secondary icon="arrow-back">Back</Button>}>
      <View style={styles.summary}>
        <Meta icon="time-outline" label={`${recipe.prepTimeMinutes ?? '--'} min`} />
        {recipe.usesExpiringItems ? <Meta icon="leaf-outline" label="Uses expiring items" /> : null}
      </View>

      <View style={styles.section}>
        <SectionTitle>Ingredients</SectionTitle>
        <Card>
          {availableIngredients.map((ingredient) => (
            <IngredientRow
              key={ingredient.name}
              label={ingredient.name}
              detail={[ingredient.quantityValue, ingredient.quantityUnit].filter(Boolean).join(' ')}
            />
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Missing Ingredients</SectionTitle>
        <Card>
          <Text style={styles.body}>
            {recipe.missingIngredients.length
              ? recipe.missingIngredients.join(', ')
              : 'Nothing essential is missing for this recipe.'}
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Instructions</SectionTitle>
        <Card>
          {recipe.instructions.map((instruction, index) => (
            <View key={instruction} style={styles.step}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.body}>{instruction}</Text>
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Pantry Impact</SectionTitle>
        <Card>
          {recipe.id === 'steak-rice-bowl' ? (
            <>
              <ImpactRow after="1 portion" before="2 portions" item="Steak" />
              <ImpactRow after="low" before="medium" item="Spinach" />
            </>
          ) : (
            <>
              <ImpactRow after="6 count" before="8 count" item="Eggs" />
              <ImpactRow after="low" before="medium" item="Spinach" />
            </>
          )}
        </Card>
      </View>

      <Button href="/update-pantry" icon="checkmark-circle-outline">
        I Cooked This
      </Button>
    </Screen>
  );
}

function Meta({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons color={palette.blue} name={icon} size={17} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

function IngredientRow({ label, detail }: { label: string; detail: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{label}</Text>
      <Text style={styles.body}>{detail || 'to taste'}</Text>
    </View>
  );
}

function ImpactRow({ after, before, item }: { after: string; before: string; item: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{item}</Text>
      <Text style={styles.body}>
        {before} to {after}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  section: {
    gap: 9,
  },
  meta: {
    alignItems: 'center',
    backgroundColor: palette.blueSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaText: {
    color: palette.blue,
    fontSize: 13,
    fontWeight: '800',
  },
  row: {
    alignItems: 'flex-start',
    borderBottomColor: palette.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  rowTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  body: {
    color: palette.muted,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  step: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  stepNumber: {
    backgroundColor: palette.graphite,
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    minWidth: 25,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
    textAlign: 'center',
  },
});
