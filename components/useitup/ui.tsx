import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Href, Link } from 'expo-router';
import { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PantryItem, Recipe } from '@/types/useitup';

const recipeImages: Record<string, string> = {
  'steak-rice-bowl': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
  'spinach-omelet': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80',
  'egg-fried-rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&q=80',
};

export const palette = {
  background: '#f4f8fb',
  surface: '#eef5f7',
  card: '#ffffff',
  ink: '#17242b',
  muted: '#667780',
  line: '#d7e2e7',
  green: '#137a7f',
  greenSoft: '#dff4ef',
  blue: '#2563eb',
  blueSoft: '#e7efff',
  gold: '#f4b740',
  goldSoft: '#fff4d8',
  blush: '#ffe8e2',
  red: '#d5533f',
  graphite: '#22313a',
};

type ScreenProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  keyboardAware?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, title, subtitle, headerAction, keyboardAware, style }: ScreenProps) {
  const { width } = useWindowDimensions();
  const isTabletWidth = width >= 700;
  const content = (
    <ScrollView
      automaticallyAdjustKeyboardInsets={keyboardAware}
      contentContainerStyle={[styles.screen, keyboardAware && styles.keyboardAwareScreen, isTabletWidth && styles.tabletScreen, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {title ? (
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {headerAction}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {keyboardAware ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          style={styles.keyboardAvoidingView}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = {
  children: string;
  href?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  secondary?: boolean;
  compact?: boolean;
};

export function Button({ children, href, icon, onPress, secondary, compact }: ButtonProps) {
  const content = (
    <View style={[styles.button, secondary && styles.secondaryButton, compact && styles.compactButton]}>
      {icon ? <Ionicons color={secondary ? palette.blue : '#fff'} name={icon} size={18} /> : null}
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{children}</Text>
    </View>
  );

  if (href) {
    return (
      <Link asChild href={href as Href}>
        <Pressable>{content}</Pressable>
      </Link>
    );
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.selectedChip]}>
      <Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text>
    </Pressable>
  );
}

export function QuantityText({ item }: { item: PantryItem }) {
  const text =
    item.quantityUnit === 'level'
      ? `${item.quantityLabel ?? 'unknown'} level`
      : `${item.quantityValue ?? 0} ${item.quantityUnit}${item.quantityValue === 1 ? '' : 's'}`;

  return <Text style={styles.meta}>{text}</Text>;
}

export function ExpirationText({ expirationDate }: { expirationDate?: string }) {
  if (!expirationDate) {
    return <Text style={styles.meta}>No near expiration</Text>;
  }

  const today = new Date();
  const expiry = new Date(`${expirationDate}T12:00:00`);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
  const label = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;

  return <Text style={styles.expiration}>Expires {label}</Text>;
}

export function PantryCard({ item, showEdit = false }: { item: PantryItem; showEdit?: boolean }) {
  return (
    <Link asChild href={`/pantry-item/${item.id}`}>
      <Pressable>
        <Card style={styles.itemCard}>
          <View style={styles.itemRow}>
            <View style={styles.itemIcon}>
              <Ionicons color={palette.green} name={getStorageIcon(item.storageLocation)} size={21} />
            </View>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <View style={styles.inlineMeta}>
                <QuantityText item={item} />
                <Text style={styles.dot}>.</Text>
                <Text style={styles.meta}>{titleCase(item.storageLocation)}</Text>
              </View>
              <ExpirationText expirationDate={item.expirationDate} />
            </View>
            {showEdit ? <Button compact href={`/pantry-item/${item.id}`} secondary icon="create-outline">Edit</Button> : null}
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const available = recipe.ingredients
    .filter((ingredient) => ingredient.isAvailable)
    .map((ingredient) => ingredient.name)
    .slice(0, 3)
    .join(', ');

  return (
    <Card style={styles.recipeCard}>
      <Image source={{ uri: recipeImages[recipe.id] }} style={styles.recipeImage} />
      <View style={styles.tagRow}>
        {recipe.usesExpiringItems ? <Text style={styles.tag}>Uses expiring food</Text> : null}
        <Text style={styles.time}>{recipe.prepTimeMinutes ?? '--'} min</Text>
      </View>
      <View style={styles.recipeBody}>
        <Text style={styles.itemTitle}>{recipe.title}</Text>
        <Text style={styles.description}>{recipe.description}</Text>
        <Text style={styles.meta}>Uses: {available}</Text>
        <Text style={styles.meta}>
          Missing: {recipe.missingIngredients.length ? recipe.missingIngredients.join(', ') : 'nothing essential'}
        </Text>
        <Button compact href={`/recipe/${recipe.id}`} icon="restaurant-outline">
          View Recipe
        </Button>
      </View>
    </Card>
  );
}

function titleCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function getStorageIcon(location: PantryItem['storageLocation']) {
  if (location === 'freezer') {
    return 'snow-outline' as const;
  }

  if (location === 'pantry') {
    return 'storefront-outline' as const;
  }

  return 'file-tray-outline' as const;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  screen: {
    alignSelf: 'center',
    backgroundColor: palette.background,
    gap: 18,
    maxWidth: 520,
    paddingBottom: 32,
    paddingHorizontal: 18,
    paddingTop: 14,
    width: '100%',
  },
  keyboardAwareScreen: {
    paddingBottom: 260,
  },
  tabletScreen: {
    maxWidth: 760,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: palette.ink,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
    shadowColor: palette.graphite,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  button: {
    alignItems: 'center',
    backgroundColor: palette.blue,
    borderColor: palette.blue,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  buttonText: {
    color: '#fff',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: palette.blueSoft,
    borderColor: '#c7d8ff',
  },
  secondaryButtonText: {
    color: palette.blue,
  },
  compactButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0,
  },
  chip: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0,
  },
  selectedChip: {
    backgroundColor: palette.graphite,
    borderColor: palette.graphite,
  },
  selectedChipText: {
    color: '#fff',
  },
  itemCard: {
    padding: 13,
    borderLeftColor: palette.green,
    borderLeftWidth: 4,
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  itemIcon: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  itemCopy: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
  inlineMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  meta: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 19,
  },
  dot: {
    color: palette.muted,
    fontSize: 14,
  },
  expiration: {
    color: palette.red,
    fontSize: 14,
    fontWeight: '700',
  },
  recipeCard: {
    alignItems: 'stretch',
    overflow: 'hidden',
    padding: 0,
  },
  recipeImage: {
    backgroundColor: palette.surface,
    height: 118,
    width: '100%',
  },
  recipeBody: {
    gap: 8,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  tagRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  tag: {
    backgroundColor: palette.blush,
    borderRadius: 6,
    color: palette.red,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  time: {
    color: palette.blue,
    fontSize: 13,
    fontWeight: '800',
  },
  description: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
