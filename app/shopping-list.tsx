import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useRefresh } from '@/hooks/use-refresh';
import { getErrorMessage } from '@/lib/errors';
import { safeBack } from '@/lib/navigation';
import {
  deleteShoppingListItem,
  getShoppingListItems,
  updateShoppingListItemChecked,
} from '@/lib/shopping-list';
import { mapShoppingItemToAddPantryParams } from '@/lib/shopping-list-mappers';
import { ShoppingListItem } from '@/types/useitup';

export default function ShoppingListScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const hasLoadedItems = useRef(false);

  const loadItems = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (!user) {
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setMessage('');
        setItems(await getShoppingListItems(user.id));
      } catch (error) {
        setMessage(getErrorMessage(error, 'Unable to load your shopping list.'));
      } finally {
        hasLoadedItems.current = true;
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [user],
  );

  const { isRefreshing, refresh } = useRefresh(() => loadItems({ showLoading: false }));

  useFocusEffect(
    useCallback(() => {
      loadItems({ showLoading: !hasLoadedItems.current });
    }, [loadItems]),
  );

  async function handleToggleChecked(item: ShoppingListItem) {
    if (!user || busyItemId) {
      return;
    }

    const previousItems = items;
    const nextChecked = !item.isChecked;
    setBusyItemId(item.id);
    setMessage('');
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, isChecked: nextChecked } : currentItem,
      ),
    );

    try {
      const updatedItem = await updateShoppingListItemChecked(user.id, item.id, nextChecked);
      setItems((current) =>
        current.map((currentItem) => (currentItem.id === item.id ? updatedItem : currentItem)),
      );
    } catch (error) {
      setItems(previousItems);
      setMessage(getErrorMessage(error, 'Unable to update this shopping item.'));
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleDelete(item: ShoppingListItem) {
    if (!user || busyItemId) {
      return;
    }

    const previousItems = items;
    setBusyItemId(item.id);
    setMessage('');
    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));

    try {
      await deleteShoppingListItem(user.id, item.id);
    } catch (error) {
      setItems(previousItems);
      setMessage(getErrorMessage(error, 'Unable to remove this shopping item.'));
    } finally {
      setBusyItemId(null);
    }
  }

  const activeItems = items.filter((item) => !item.isChecked);
  const checkedItems = items.filter((item) => item.isChecked);

  return (
    <Screen
      onRefresh={refresh}
      refreshing={isRefreshing}
      title="Shopping List"
      subtitle="Missing ingredients from recipes, ready for your next grocery run."
      headerAction={<Button compact onPress={() => safeBack('/(tabs)/recipes')} secondary icon="arrow-back">Back</Button>}>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.section}>
        <SectionTitle>To Buy</SectionTitle>
        <Card style={styles.listCard}>
          {isLoading ? (
            <Text style={styles.body}>Loading shopping list...</Text>
          ) : activeItems.length ? (
            activeItems.map((item, index) => (
              <ShoppingListRow
                item={item}
                key={item.id}
                onAddToPantry={() => router.push({ pathname: '/add-item', params: mapShoppingItemToAddPantryParams(item) })}
                onDelete={() => handleDelete(item)}
                onToggle={() => handleToggleChecked(item)}
                showDivider={index > 0}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons color={palette.green} name="cart-outline" size={22} />
              <Text style={styles.emptyTitle}>Nothing to buy yet</Text>
              <Text style={styles.body}>Add missing ingredients from a recipe to build this list.</Text>
            </View>
          )}
        </Card>
      </View>

      {checkedItems.length ? (
        <View style={styles.section}>
          <SectionTitle>Checked Off</SectionTitle>
          <Card style={styles.listCard}>
            {checkedItems.map((item, index) => (
              <ShoppingListRow
                item={item}
                key={item.id}
                onAddToPantry={() => router.push({ pathname: '/add-item', params: mapShoppingItemToAddPantryParams(item) })}
                onDelete={() => handleDelete(item)}
                onToggle={() => handleToggleChecked(item)}
                showDivider={index > 0}
              />
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

function ShoppingListRow({
  item,
  onAddToPantry,
  onDelete,
  onToggle,
  showDivider,
}: {
  item: ShoppingListItem;
  onAddToPantry: () => void;
  onDelete: () => void;
  onToggle: () => void;
  showDivider?: boolean;
}) {
  return (
    <View style={[styles.row, showDivider && styles.withDivider]}>
      <Pressable accessibilityLabel={`Mark ${item.name}`} hitSlop={8} onPress={onToggle} style={styles.checkButton}>
        <Ionicons
          color={item.isChecked ? palette.green : palette.muted}
          name={item.isChecked ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
        />
      </Pressable>
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={[styles.rowTitle, item.isChecked && styles.checkedTitle]}>
          {item.name}
        </Text>
        {item.sourceRecipeTitle ? (
          <Text numberOfLines={1} style={styles.body}>From {item.sourceRecipeTitle}</Text>
        ) : null}
        {item.isChecked ? (
          <Button compact icon="file-tray-full-outline" onPress={onAddToPantry} secondary style={styles.addToPantryButton}>
            Add to Pantry
          </Button>
        ) : null}
      </View>
      <Pressable accessibilityLabel={`Delete ${item.name}`} hitSlop={10} onPress={onDelete} style={styles.deleteButton}>
        <Ionicons color={palette.muted} name="trash-outline" size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  message: {
    color: palette.red,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  listCard: {
    gap: 0,
    padding: 0,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  withDivider: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
  },
  checkButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  rowCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  addToPantryButton: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  rowTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 17,
    fontWeight: '900',
  },
  checkedTitle: {
    color: palette.muted,
    textDecorationLine: 'line-through',
  },
  body: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  deleteButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  emptyState: {
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
  },
  emptyTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: '900',
  },
});
