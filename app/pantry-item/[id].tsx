import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  ConfirmDialog,
  ExpirationText,
  palette,
  PantryArtworkImage,
  QuantityText,
  Screen,
  SectionTitle,
  typography,
} from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useAppLanguage } from '@/contexts/language-context';
import { useRefresh } from '@/hooks/use-refresh';
import { safeBack } from '@/lib/shared/navigation';
import { deletePantryItem, getErrorMessage, getPantryItemById } from '@/lib/pantry/pantry';
import { PantryItem } from '@/types/useitup';

export default function PantryItemDetailScreen() {
  const { t } = useAppLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [item, setItem] = useState<PantryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadItem = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (!user || !id) {
        return;
      }

      try {
        setErrorMessage('');
        if (showLoading) {
          setIsLoading(true);
        }

        const nextItem = await getPantryItemById(user.id, id);
        setItem(nextItem);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, t('unableToLoadPantryItem')));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [id, t, user],
  );

  const { isRefreshing, refresh } = useRefresh(() => loadItem({ showLoading: false }));

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  async function handleDelete() {
    if (!user || !id || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage('');

    try {
      await deletePantryItem(user.id, id);
      router.replace('/(tabs)/pantry');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('unableToDeletePantryItem')));
    } finally {
      setIsDeleting(false);
    }
  }


  if (isLoading) {
    return (
      <Screen
        onRefresh={refresh}
        refreshing={isRefreshing}
        title={t('pantryItem')}
        subtitle={t('loadingItemDetails')}
        headerAction={<Button compact onPress={() => safeBack('/(tabs)/pantry')} secondary icon="arrow-back">{t('back')}</Button>}>
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>{t('loading')}</Text>
        </Card>
      </Screen>
    );
  }

  if (errorMessage || !item) {
    return (
      <Screen
        onRefresh={refresh}
        refreshing={isRefreshing}
        title={t('pantryItem')}
        subtitle={t('thisItemCannotBeFound')}
        headerAction={<Button compact onPress={() => safeBack('/(tabs)/pantry')} secondary icon="arrow-back">{t('back')}</Button>}>
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>{errorMessage ? t('unableToLoadItem') : t('itemNotFound')}</Text>
          <Text style={styles.actionCopy}>
            {errorMessage || t('pantryItemMayHaveBeenDeleted')}
          </Text>
          <Button compact href="/(tabs)/pantry" secondary icon="basket-outline">
            {t('backToPantry')}
          </Button>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={refresh}
      refreshing={isRefreshing}
      title={item.name}
      subtitle={t('pantryItemDetailSubtitle')}
      headerAction={<Button compact onPress={() => safeBack('/(tabs)/pantry')} secondary icon="arrow-back">{t('back')}</Button>}>
      <Card style={styles.heroCard}>
        <PantryArtworkImage item={item} style={styles.itemImageLarge} />
        <View style={styles.heroCopy}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.category}>{t(getCategoryKey(item.category))}</Text>
          <ExpirationText expirationDate={item.expirationDate} />
        </View>
      </Card>

      <View style={styles.section}>
        <SectionTitle>{t('itemDetails')}</SectionTitle>
        <Card style={styles.detailCard}>
          <DetailRow icon="cube-outline" label={t('quantity')}>
            <QuantityText item={item} />
          </DetailRow>
          <DetailRow icon="file-tray-outline" label={t('storage')}>
            <Text style={styles.detailValue}>{t(item.storageLocation)}</Text>
          </DetailRow>
          <DetailRow icon="calendar-outline" label={t('expiration')}>
            <ExpirationText expirationDate={item.expirationDate} />
          </DetailRow>
          <DetailRow icon="pricetag-outline" label={t('category')}>
            <Text style={styles.detailValue}>{t(getCategoryKey(item.category))}</Text>
          </DetailRow>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>{t('actions')}</SectionTitle>
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>{t('manageThisItem')}</Text>
          <Text style={styles.actionCopy}>
            {t('managePantryItemCopy')}
          </Text>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <View style={styles.actionRow}>
            <Button compact href={`/edit-item/${item.id}`} secondary icon="create-outline">
              {t('editItem')}
            </Button>
            <Button compact onPress={() => setIsConfirmingDelete(true)} secondary icon="trash-outline">
              {t('delete')}
            </Button>
            <Button compact href="/(tabs)/recipes" icon="restaurant-outline">
              {t('findMeals')}
            </Button>
          </View>
        </Card>
      </View>

      <ConfirmDialog
        busy={isDeleting}
        confirmLabel={isDeleting ? t('deleting') : t('deleteItem')}
        destructive
        message={t('removeItemFromPantryQuestion', { itemName: item.name })}
        onCancel={() => setIsConfirmingDelete(false)}
        onConfirm={handleDelete}
        title={t('deletePantryItemTitle')}
        visible={isConfirmingDelete}
      />
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

type PantryCategoryKey = 'produce' | 'meat' | 'dairy' | 'grain' | 'condiment' | 'other';

function getCategoryKey(value: string | undefined): PantryCategoryKey {
  const category = value?.toLowerCase();

  if (
    category === 'produce' ||
    category === 'meat' ||
    category === 'dairy' ||
    category === 'grain' ||
    category === 'condiment'
  ) {
    return category;
  }

  return 'other';
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  itemImageLarge: {
    backgroundColor: palette.greenSoft,
    borderRadius: 12,
    height: 72,
    overflow: 'hidden',
    width: 72,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: palette.ink,
    fontFamily: typography.display,
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
    fontFamily: typography.display,
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
  errorText: {
    color: palette.red,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
