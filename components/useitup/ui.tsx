import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Href, Link } from 'expo-router';
import { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  Pressable,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
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
  background: '#f8f2e9',
  surface: '#f1e7da',
  card: '#fffdf9',
  ink: '#342a22',
  muted: '#7a6d61',
  line: '#e8ded2',
  green: '#6f7d4d',
  greenSoft: '#ede8d5',
  blue: '#8b6742',
  blueSoft: '#f0dec8',
  gold: '#d5a36f',
  goldSoft: '#f7ead8',
  blush: '#f5dfd1',
  red: '#b45b42',
  graphite: '#5a4632',
};

export const typography = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
};

type ScreenProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  keyboardAware?: boolean;
  onRefresh?: () => void;
  overlay?: ReactNode;
  refreshing?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({
  children,
  title,
  subtitle,
  headerAction,
  keyboardAware,
  onRefresh,
  overlay,
  refreshing,
  style,
}: ScreenProps) {
  const { width } = useWindowDimensions();
  const isTabletWidth = width >= 700;
  const content = (
    <ScrollView
      automaticallyAdjustKeyboardInsets={keyboardAware}
      contentContainerStyle={[styles.screen, keyboardAware && styles.keyboardAwareScreen, isTabletWidth && styles.tabletScreen, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl colors={[palette.blue]} onRefresh={onRefresh} refreshing={Boolean(refreshing)} tintColor={palette.blue} />
        ) : undefined
      }
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
      {overlay}
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
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

type RecipeCardActionProps = {
  onToggleFavorite?: () => void;
};

export function Button({ children, href, icon, onPress, secondary, compact, disabled, style }: ButtonProps) {
  const content = (
    <View
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        compact && styles.compactButton,
        disabled && styles.disabledButton,
        style,
      ]}>
      {icon ? <Ionicons color={secondary ? palette.blue : '#fff'} name={icon} size={18} /> : null}
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{children}</Text>
    </View>
  );

  if (href && !disabled) {
    return (
      <Link asChild href={href as Href}>
        <Pressable>{content}</Pressable>
      </Link>
    );
  }

  return <Pressable disabled={disabled} onPress={onPress}>{content}</Pressable>;
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
      {recipeImages[recipe.id] ? (
        <Image source={{ uri: recipeImages[recipe.id] }} style={styles.recipeImage} />
      ) : (
        <View style={styles.recipeImageFallback}>
          <Ionicons color={palette.green} name="restaurant-outline" size={24} />
        </View>
      )}
      <View style={styles.recipeBody}>
        <View style={styles.tagRow}>
          {recipe.usesExpiringItems ? <Text style={styles.tag}>Uses expiring food</Text> : <View />}
          <View style={styles.recipeMetaRow}>
            {recipe.isFavorite ? <Ionicons color={palette.gold} name="star" size={15} /> : null}
            <Text style={styles.time}>{recipe.prepTimeMinutes ?? '--'} min</Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.itemTitle}>{recipe.title}</Text>
        <Text numberOfLines={2} style={styles.description}>{recipe.description}</Text>
        <Text numberOfLines={1} style={styles.meta}>Uses: {available}</Text>
        <Text numberOfLines={1} style={styles.meta}>
          Missing: {recipe.missingIngredients.length ? recipe.missingIngredients.join(', ') : 'nothing essential'}
        </Text>
        <Button compact href={`/recipe/${recipe.id}`} icon="restaurant-outline" style={styles.recipeButton}>
          View Recipe
        </Button>
      </View>
    </Card>
  );
}

export function RecipeRowCard({ onToggleFavorite, recipe }: { recipe: Recipe } & RecipeCardActionProps) {
  const available = recipe.ingredients
    .filter((ingredient) => ingredient.isAvailable)
    .map((ingredient) => ingredient.name)
    .slice(0, 3)
    .join(', ');

  return (
    <Card style={styles.recipeRowCard}>
      <Link asChild href={`/recipe/${recipe.id}`}>
        <Pressable style={styles.recipeRowLink}>
          <View style={styles.recipeRowImage}>
            <Ionicons color={palette.green} name="restaurant-outline" size={25} />
          </View>
          <View style={styles.recipeRowBody}>
            <View style={styles.tagRow}>
              {recipe.usesExpiringItems ? <Text style={styles.tag}>Uses expiring food</Text> : <View />}
              <View style={styles.recipeMetaRow}>
                {recipe.isFavorite ? <Ionicons color={palette.gold} name="star" size={15} /> : null}
                <Text style={styles.time}>{recipe.prepTimeMinutes ?? '--'} min</Text>
              </View>
            </View>
            <Text numberOfLines={2} style={styles.itemTitle}>
              {recipe.title}
            </Text>
            <Text numberOfLines={2} style={styles.description}>
              {recipe.description}
            </Text>
            <Text numberOfLines={1} style={styles.meta}>
              Uses: {available}
            </Text>
          </View>
          <Ionicons color={palette.muted} name="chevron-forward" size={20} />
        </Pressable>
      </Link>
      {onToggleFavorite ? (
        <FavoriteToggleButton isFavorite={Boolean(recipe.isFavorite)} onPress={onToggleFavorite} />
      ) : null}
    </Card>
  );
}

export function FavoriteRecipeCard({ onToggleFavorite, recipe }: { recipe: Recipe } & RecipeCardActionProps) {
  return (
    <Card style={styles.favoriteRecipeCard}>
      <Link asChild href={`/recipe/${recipe.id}`}>
        <Pressable style={styles.favoriteRecipePressable}>
          <View style={styles.favoriteRecipeImage}>
            <Ionicons color={palette.green} name="restaurant-outline" size={24} />
          </View>
          <View style={styles.favoriteRecipeBody}>
            <Text numberOfLines={2} style={styles.itemTitle}>
              {recipe.title}
            </Text>
            <View style={styles.recipeMetaRow}>
              <Ionicons color={palette.blue} name="time-outline" size={14} />
              <Text style={styles.time}>{recipe.prepTimeMinutes ?? '--'} min</Text>
            </View>
          </View>
        </Pressable>
      </Link>
      {onToggleFavorite ? (
        <FavoriteToggleButton isFavorite={Boolean(recipe.isFavorite)} onPress={onToggleFavorite} />
      ) : null}
    </Card>
  );
}

function FavoriteToggleButton({ isFavorite, onPress }: { isFavorite: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      hitSlop={8}
      onPress={onPress}
      style={styles.favoriteToggleButton}>
      <Ionicons color={isFavorite ? palette.gold : palette.muted} name={isFavorite ? 'star' : 'star-outline'} size={18} />
    </Pressable>
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
    gap: 20,
    maxWidth: 520,
    paddingBottom: 112,
    paddingHorizontal: 22,
    paddingTop: 22,
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
    fontFamily: typography.display,
    fontSize: 30,
    fontWeight: '900',
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
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 16,
    shadowColor: palette.graphite,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
  },
  button: {
    alignItems: 'center',
    backgroundColor: palette.blue,
    borderColor: palette.blue,
    borderRadius: 14,
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
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  secondaryButtonText: {
    color: palette.ink,
  },
  compactButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  disabledButton: {
    opacity: 0.5,
  },
  sectionTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chip: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
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
    padding: 16,
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  itemIcon: {
    alignItems: 'center',
    backgroundColor: palette.goldSoft,
    borderRadius: 12,
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
    fontFamily: typography.display,
    fontSize: 16,
    fontWeight: '900',
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
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 0,
  },
  recipeImage: {
    backgroundColor: palette.surface,
    height: '100%',
    minHeight: 160,
    width: 112,
  },
  recipeImageFallback: {
    alignItems: 'center',
    backgroundColor: palette.goldSoft,
    minHeight: 160,
    justifyContent: 'center',
    width: 112,
  },
  recipeBody: {
    flex: 1,
    gap: 8,
    padding: 14,
  },
  tagRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  tag: {
    backgroundColor: palette.blush,
    borderRadius: 10,
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
  recipeMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  description: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  recipeButton: {
    marginTop: 2,
  },
  recipeRowCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    padding: 0,
    position: 'relative',
  },
  recipeRowLink: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    paddingRight: 50,
  },
  recipeRowImage: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: palette.greenSoft,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 112,
    width: 96,
  },
  recipeRowBody: {
    flex: 1,
    gap: 7,
    minWidth: 0,
  },
  favoriteRecipePressable: {
    width: '100%',
  },
  favoriteRecipeCard: {
    gap: 0,
    overflow: 'hidden',
    padding: 0,
    position: 'relative',
    width: 170,
  },
  favoriteRecipeImage: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    height: 94,
    justifyContent: 'center',
  },
  favoriteToggleButton: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
    width: 34,
    zIndex: 2,
  },
  favoriteRecipeBody: {
    gap: 8,
    minHeight: 92,
    padding: 12,
  },
});
