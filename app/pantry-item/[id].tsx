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
import { useRefresh } from '@/hooks/use-refresh';
import { safeBack } from '@/lib/navigation';
import { deletePantryItem, getErrorMessage, getPantryItemById } from '@/lib/pantry';
import { PantryItem } from '@/types/useitup';

export default function PantryItemDetailScreen() {
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
        setErrorMessage(getErrorMessage(error, 'Unable to load pantry item.'));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [id, user],
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
      setErrorMessage(getErrorMessage(error, 'Unable to delete pantry item.'));
    } finally {
      setIsDeleting(false);
    }
  }


  if (isLoading) {
    return (
      <Screen
        onRefresh={refresh}
        refreshing={isRefreshing}
        title="Pantry Item"
        subtitle="Loading item details."
        headerAction={<Button compact onPress={() => safeBack('/(tabs)/pantry')} secondary icon="arrow-back">Back</Button>}>
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>Loading...</Text>
        </Card>
      </Screen>
    );
  }

  if (errorMessage || !item) {
    return (
      <Screen
        onRefresh={refresh}
        refreshing={isRefreshing}
        title="Pantry Item"
        subtitle="This item could not be found."
        headerAction={<Button compact onPress={() => safeBack('/(tabs)/pantry')} secondary icon="arrow-back">Back</Button>}>
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>{errorMessage ? 'Unable to load item' : 'Item not found'}</Text>
          <Text style={styles.actionCopy}>
            {errorMessage || 'This pantry item may have been deleted or belongs to another account.'}
          </Text>
          <Button compact href="/(tabs)/pantry" secondary icon="basket-outline">
            Back to Pantry
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
      subtitle="Pantry item detail from your Supabase inventory."
      headerAction={<Button compact onPress={() => safeBack('/(tabs)/pantry')} secondary icon="arrow-back">Back</Button>}>
      <Card style={styles.heroCard}>
        <PantryArtworkImage item={item} style={styles.itemImageLarge} />
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
        <SectionTitle>Actions</SectionTitle>
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>Manage this item</Text>
          <Text style={styles.actionCopy}>
            Edit details when quantities change, or remove the item when it is no longer in your
            pantry.
          </Text>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <View style={styles.actionRow}>
            <Button compact href={`/edit-item/${item.id}`} secondary icon="create-outline">
              Edit Item
            </Button>
            <Button compact onPress={() => setIsConfirmingDelete(true)} secondary icon="trash-outline">
              Delete
            </Button>
            <Button compact href="/(tabs)/recipes" icon="restaurant-outline">
              Find Meals
            </Button>
          </View>
        </Card>
      </View>

      <ConfirmDialog
        busy={isDeleting}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Item'}
        destructive
        message={`Remove ${item.name} from your pantry?`}
        onCancel={() => setIsConfirmingDelete(false)}
        onConfirm={handleDelete}
        title="Delete this pantry item?"
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

function titleCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
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
