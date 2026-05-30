import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';

import {
  PantryItemForm,
  PantryItemFormValues,
  parseExpirationDate,
  quantityLabelFromLevel,
} from '@/components/useitup/pantry-item-form';
import { Button, Card, palette, Screen } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useRefresh } from '@/hooks/use-refresh';
import { safeBack } from '@/lib/navigation';
import {
  getErrorMessage,
  getPantryItemById,
  isDuplicatePantryItemError,
  normalizePantryName,
  updatePantryItem,
} from '@/lib/pantry';
import { PantryItem } from '@/types/useitup';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [item, setItem] = useState<PantryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadItem = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (!user || !id) {
        return;
      }

      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setMessage('');

        const nextItem = await getPantryItemById(user.id, id);
        setItem(nextItem);
      } catch (error) {
        setMessage(getErrorMessage(error, 'Unable to load item.'));
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

  async function handleSave(values: PantryItemFormValues) {
    if (!user || !id || isSaving) {
      return;
    }

    const normalizedName = normalizePantryName(values.name);

    if (!normalizedName) {
      setMessage('Add an item name before saving.');
      return;
    }

    const expirationDate = parseExpirationDate(values.expiration);

    if (values.expiration.trim() && !expirationDate) {
      setMessage('Use YYYY-MM-DD, today, tomorrow, or a phrase like "in 3 days".');
      return;
    }

    const parsedAmount = Number(values.amount);
    const quantityValue = values.quantityType === 'level' ? undefined : parsedAmount;

    if (values.quantityType !== 'level' && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      setMessage('Enter an amount greater than 0.');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      await updatePantryItem(user.id, id, {
        name: values.name,
        category: values.category,
        storageLocation: values.location,
        quantityValue,
        quantityUnit: values.quantityType,
        quantityLabel: values.quantityType === 'level' ? quantityLabelFromLevel(values.level) : undefined,
        expirationDate,
        notes: values.notes,
      });

      router.replace(`/pantry-item/${id}`);
    } catch (error) {
      if (isDuplicatePantryItemError(error)) {
        setMessage(`You already have ${titleCase(normalizedName)} in ${titleCase(values.location)}.`);
      } else {
        setMessage(getErrorMessage(error, 'Unable to update item.'));
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Screen
        onRefresh={refresh}
        refreshing={isRefreshing}
        title="Edit Item"
        subtitle="Loading item details."
        headerAction={<Button compact onPress={() => safeBack('/(tabs)/pantry')} secondary icon="arrow-back">Back</Button>}>
        <Card>
          <Text style={{ color: palette.muted }}>Loading...</Text>
        </Card>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen
        onRefresh={refresh}
        refreshing={isRefreshing}
        title="Edit Item"
        subtitle="This item could not be found."
        headerAction={<Button compact onPress={() => safeBack('/(tabs)/pantry')} secondary icon="arrow-back">Back</Button>}>
        <Card>
          <Text style={{ color: palette.muted }}>{message || 'Item not found.'}</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      keyboardAware
      onRefresh={refresh}
      refreshing={isRefreshing}
      title={`Edit ${item.name}`}
      subtitle="Update the details stored in your pantry."
      headerAction={<Button compact onPress={() => safeBack(`/pantry-item/${item.id}`)} secondary icon="close">Close</Button>}>
      <PantryItemForm
        initialValues={{
          name: item.name,
          category: titleCase(item.category ?? 'other'),
          quantityType: item.quantityUnit,
          amount: item.quantityValue ? String(item.quantityValue) : '1',
          level: titleCase(item.quantityLabel ?? 'medium'),
          location: item.storageLocation,
          expiration: item.expirationDate ?? '',
          notes: item.notes ?? '',
        }}
        isSaving={isSaving}
        message={message}
        onSubmit={handleSave}
        submitLabel="Update Item"
      />
    </Screen>
  );
}

function titleCase(value: string) {
  return value
    .split(' ')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}
