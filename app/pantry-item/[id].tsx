import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  ExpirationText,
  palette,
  QuantityText,
  Screen,
  SectionTitle,
} from '@/components/useitup/ui';
import { findPantryItem } from '@/data/mock-useitup';

export default function PantryItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = findPantryItem(id);

  return (
    <Screen
      title={item.name}
      subtitle="Static pantry item detail for the clickable prototype."
      headerAction={<Button compact onPress={() => router.back()} secondary icon="arrow-back">Back</Button>}>
      <Card style={styles.heroCard}>
        <View style={styles.itemIconLarge}>
          <Ionicons color={palette.green} name={getCategoryIcon(item.category)} size={32} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.category}>{titleCase(item.category ?? 'other')}</Text>
          <ExpirationText expirationDate={item.expirationDate} />
        </View>
      </Card>

      <View style={styles.section}>
        <SectionTitle>Item Details</SectionTitle>
        <Card style={styles.detailCard}>
          <DetailRow icon="cube-outline" label="Quantity">
            <QuantityText item={item} />
          </DetailRow>
          <DetailRow icon="file-tray-outline" label="Storage">
            <Text style={styles.detailValue}>{titleCase(item.storageLocation)}</Text>
          </DetailRow>
          <DetailRow icon="calendar-outline" label="Expiration">
            <ExpirationText expirationDate={item.expirationDate} />
          </DetailRow>
          <DetailRow icon="pricetag-outline" label="Category">
            <Text style={styles.detailValue}>{titleCase(item.category ?? 'other')}</Text>
          </DetailRow>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Prototype Actions</SectionTitle>
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>Phase 2 will make these real</Text>
          <Text style={styles.actionCopy}>
            Editing, deleting, and saving pantry updates will connect to Supabase in the next phase.
          </Text>
          <View style={styles.actionRow}>
            <Button compact href="/add-item" secondary icon="create-outline">
              Edit Item
            </Button>
            <Button compact href="/(tabs)/recipes" icon="restaurant-outline">
              Find Meals
            </Button>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

function DetailRow({
  children,
  icon,
  label,
}: {
  children: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons color={palette.blue} name={icon} size={18} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailContent}>{children}</View>
    </View>
  );
}

function getCategoryIcon(category?: string) {
  if (category === 'meat') {
    return 'restaurant-outline' as const;
  }

  if (category === 'produce') {
    return 'leaf-outline' as const;
  }

  if (category === 'dairy') {
    return 'water-outline' as const;
  }

  if (category === 'grain') {
    return 'grid-outline' as const;
  }

  return 'basket-outline' as const;
}

function titleCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  itemIconLarge: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    borderRadius: 8,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  category: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    gap: 10,
  },
  detailCard: {
    gap: 0,
    padding: 0,
  },
  detailRow: {
    alignItems: 'center',
    borderBottomColor: palette.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: palette.blueSoft,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  detailLabel: {
    color: palette.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  detailContent: {
    alignItems: 'flex-end',
    flex: 1,
  },
  detailValue: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  actionCard: {
    backgroundColor: palette.surface,
  },
  actionTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  actionCopy: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
});
