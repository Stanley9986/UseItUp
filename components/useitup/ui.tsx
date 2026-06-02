import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Href, Link } from 'expo-router';
import { ComponentProps, PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import {
  Pressable,
  KeyboardAvoidingView,
  Modal,
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
import { useAppLanguage } from '@/contexts/language-context';
import { getRemoteRecipeArtworkForQuery } from '@/lib/recipe-image';
import { getPantryArtwork, getPantryImageSearchQuery, PantryArtwork } from '@/lib/pantry-artwork';
import { getRecipeArtwork, getRecipeImageSearchQuery, RecipeArtwork } from '@/lib/recipe-artwork';

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

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmIcon?: ComponentProps<typeof Ionicons>['name'];
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmIcon = 'trash-outline',
  destructive,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useAppLanguage();

  function handleCancel() {
    if (!busy) {
      onCancel();
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={handleCancel} transparent visible={visible}>
      <Pressable onPress={handleCancel} style={styles.dialogBackdrop}>
        <Pressable onPress={() => {}} style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          <View style={styles.dialogActions}>
            <View style={styles.dialogActionItem}>
              <Button disabled={busy} icon="close-outline" onPress={handleCancel} secondary>
                {cancelLabel ?? t('cancel')}
              </Button>
            </View>
            <View style={styles.dialogActionItem}>
              <Button
                disabled={busy}
                icon={confirmIcon}
                onPress={onConfirm}
                style={destructive ? styles.dialogDestructive : undefined}>
                {confirmLabel}
              </Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
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
  const { t } = useAppLanguage();
  const text =
    item.quantityUnit === 'level'
      ? `${item.quantityLabel ? t(item.quantityLabel) : t('unknown')} ${t('level')}`
      : `${item.quantityValue ?? 0} ${t(item.quantityUnit)}${item.quantityValue === 1 ? '' : 's'}`;

  return <Text style={styles.meta}>{text}</Text>;
}

export function ExpirationText({ expirationDate }: { expirationDate?: string }) {
  const { t } = useAppLanguage();

  if (!expirationDate) {
    return <Text style={styles.meta}>{t('noNearExpiration')}</Text>;
  }

  const today = new Date();
  const expiry = new Date(`${expirationDate}T12:00:00`);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
  const label = days <= 0 ? t('today') : days === 1 ? t('tomorrow') : t('inDays', { days });

  return <Text style={styles.expiration}>{t('expires', { label })}</Text>;
}

export function PantryCard({ item, showEdit = false }: { item: PantryItem; showEdit?: boolean }) {
  const { t } = useAppLanguage();

  return (
    <Link asChild href={`/pantry-item/${item.id}`}>
      <Pressable>
        <Card style={styles.itemCard}>
          <View style={styles.itemRow}>
            <PantryArtworkImage item={item} style={styles.itemIcon} />
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <View style={styles.inlineMeta}>
                <QuantityText item={item} />
                <Text style={styles.dot}>.</Text>
                <Text style={styles.meta}>{t(item.storageLocation)}</Text>
              </View>
              <ExpirationText expirationDate={item.expirationDate} />
            </View>
            {showEdit ? <Button compact href={`/pantry-item/${item.id}`} secondary icon="create-outline">{t('edit')}</Button> : null}
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

export function RecipeRowCard({ onToggleFavorite, recipe }: { recipe: Recipe } & RecipeCardActionProps) {
  const { t } = useAppLanguage();
  const available = recipe.ingredients
    .filter((ingredient) => ingredient.isAvailable)
    .map((ingredient) => ingredient.name)
    .slice(0, 3)
    .join(', ');

  return (
    <Card style={styles.recipeRowCard}>
      <Link asChild href={`/recipe/${recipe.id}`}>
        <Pressable style={styles.recipeRowLink}>
          <RecipeArtworkImage recipe={recipe} style={styles.recipeRowImage} />
          <View style={styles.recipeRowBody}>
            <View style={styles.tagRow}>
              {recipe.usesExpiringItems ? <Text style={styles.tag}>{t('usesExpiringFood')}</Text> : <View />}
              <View style={styles.recipeMetaRow}>
                {recipe.isFavorite ? <Ionicons color={palette.gold} name="star" size={15} /> : null}
                <Text style={styles.time}>{recipe.prepTimeMinutes ?? '--'} {t('min')}</Text>
              </View>
            </View>
            <Text numberOfLines={2} style={styles.itemTitle}>
              {recipe.title}
            </Text>
            <Text numberOfLines={2} style={styles.description}>
              {recipe.description}
            </Text>
            <Text numberOfLines={1} style={styles.meta}>
              {t('uses', { ingredients: available })}
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
  const { t } = useAppLanguage();

  return (
    <Card style={styles.favoriteRecipeCard}>
      <Link asChild href={`/recipe/${recipe.id}`}>
        <Pressable style={styles.favoriteRecipePressable}>
          <RecipeArtworkImage recipe={recipe} style={styles.favoriteRecipeImage} />
          <View style={styles.favoriteRecipeBody}>
            <Text numberOfLines={2} style={styles.itemTitle}>
              {recipe.title}
            </Text>
            <View style={styles.recipeMetaRow}>
              <Ionicons color={palette.blue} name="time-outline" size={14} />
              <Text style={styles.time}>{recipe.prepTimeMinutes ?? '--'} {t('min')}</Text>
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

export function RecipeArtworkImage({ recipe, style }: { recipe: Recipe; style?: StyleProp<ViewStyle> }) {
  const fallbackArtwork = getRecipeArtwork(recipe);
  const [artwork, setArtwork] = useState<RecipeArtwork>(fallbackArtwork);
  const searchQuery = getRecipeImageSearchQuery(recipe);

  useEffect(() => {
    let isMounted = true;
    setArtwork(fallbackArtwork);

    getRemoteRecipeArtworkForQuery(searchQuery, recipe.title)
      .then((remoteArtwork) => {
        if (isMounted && remoteArtwork) {
          setArtwork(remoteArtwork);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [fallbackArtwork, recipe.title, searchQuery]);

  return (
    <View style={[styles.recipeArtworkFrame, style]}>
      {artwork.imageUrl ? (
        <Image
          accessibilityLabel={artwork.label}
          contentFit="cover"
          source={{ uri: artwork.imageUrl }}
          style={styles.recipeArtworkImage}
        />
      ) : (
        <ArtworkPlaceholder icon={getRecipeArtworkIcon(artwork.category)} label={artwork.label} />
      )}
      {artwork.provider === 'pexels' ? (
        <Text numberOfLines={1} style={styles.recipeArtworkCredit}>
          Pexels
        </Text>
      ) : null}
    </View>
  );
}

export function PantryArtworkImage({ item, style }: { item: PantryItem; style?: StyleProp<ViewStyle> }) {
  const fallbackArtwork = getPantryArtwork(item);
  const [artwork, setArtwork] = useState<PantryArtwork>(fallbackArtwork);
  const searchQuery = getPantryImageSearchQuery(item);

  useEffect(() => {
    let isMounted = true;
    setArtwork(fallbackArtwork);

    getRemoteRecipeArtworkForQuery(searchQuery, item.name)
      .then((remoteArtwork) => {
        if (isMounted && remoteArtwork) {
          setArtwork({
            ...fallbackArtwork,
            imageUrl: remoteArtwork.imageUrl,
            label: remoteArtwork.label,
            photographer: remoteArtwork.photographer,
            photographerUrl: remoteArtwork.photographerUrl,
            provider: remoteArtwork.provider,
          });
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [fallbackArtwork, item.name, searchQuery]);

  return (
    <View style={[styles.recipeArtworkFrame, style]}>
      {artwork.imageUrl ? (
        <Image
          accessibilityLabel={artwork.label}
          contentFit="cover"
          source={{ uri: artwork.imageUrl }}
          style={styles.recipeArtworkImage}
        />
      ) : (
        <ArtworkPlaceholder icon={getPantryArtworkIcon(artwork.category)} label={artwork.label} />
      )}
      {artwork.provider === 'pexels' ? (
        <Text numberOfLines={1} style={styles.recipeArtworkCredit}>
          Pexels
        </Text>
      ) : null}
    </View>
  );
}

function ArtworkPlaceholder({
  icon,
  label,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <View accessibilityLabel={label} style={styles.artworkPlaceholder}>
      <Ionicons color={palette.green} name={icon} size={24} />
    </View>
  );
}

function FavoriteToggleButton({ isFavorite, onPress }: { isFavorite: boolean; onPress: () => void }) {
  const { t } = useAppLanguage();

  return (
    <Pressable
      accessibilityLabel={isFavorite ? t('removeFavorite') : t('addFavorite')}
      hitSlop={8}
      onPress={onPress}
      style={styles.favoriteToggleButton}>
      <Ionicons color={isFavorite ? palette.gold : palette.muted} name={isFavorite ? 'star' : 'star-outline'} size={18} />
    </Pressable>
  );
}

function getRecipeArtworkIcon(category: RecipeArtwork['category']) {
  if (category === 'beef' || category === 'seafood') {
    return 'restaurant-outline' as const;
  }

  if (category === 'egg') {
    return 'egg-outline' as const;
  }

  if (category === 'grain' || category === 'pasta') {
    return 'grid-outline' as const;
  }

  if (category === 'soup') {
    return 'water-outline' as const;
  }

  return 'leaf-outline' as const;
}

function getPantryArtworkIcon(category: PantryArtwork['category']) {
  if (category === 'meat') {
    return 'restaurant-outline' as const;
  }

  if (category === 'dairy') {
    return 'water-outline' as const;
  }

  if (category === 'grain') {
    return 'grid-outline' as const;
  }

  if (category === 'produce') {
    return 'leaf-outline' as const;
  }

  return 'basket-outline' as const;
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
    overflow: 'hidden',
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
    overflow: 'hidden',
    width: 96,
  },
  recipeArtworkFrame: {
    position: 'relative',
  },
  recipeArtworkImage: {
    ...StyleSheet.absoluteFillObject,
  },
  artworkPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    justifyContent: 'center',
  },
  recipeArtworkCredit: {
    backgroundColor: 'rgba(52, 42, 34, 0.72)',
    borderRadius: 6,
    bottom: 6,
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    left: 6,
    maxWidth: 72,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
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
    overflow: 'hidden',
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
  dialogBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(33, 26, 20, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  dialogCard: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    maxWidth: 380,
    padding: 20,
    width: '100%',
  },
  dialogTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: '900',
  },
  dialogMessage: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
  },
  dialogActionItem: {
    flex: 1,
  },
  dialogDestructive: {
    backgroundColor: palette.red,
    borderColor: palette.red,
  },
});
