import { useLocalSearchParams } from 'expo-router';
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
import { useAppLanguage } from '@/contexts/language-context';
import { useRefresh } from '@/hooks/use-refresh';
import { safeBack } from '@/lib/shared/navigation';
import {
  getErrorMessage,
  getPantryItemById,
  isDuplicatePantryItemError,
  normalizePantryName,
  updatePantryItem,
} from '@/lib/pantry/pantry';
import { PantryItem } from '@/types/useitup';

export default function EditItemScreen() {
  const { t, languageCode } = useAppLanguage();
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
        setMessage(getErrorMessage(error, t('unableToLoadItem')));
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

  async function handleSave(values: PantryItemFormValues) {
    if (!user || !id || isSaving) {
      return;
    }

    const normalizedName = normalizePantryName(values.name);

    if (!normalizedName) {
      setMessage(t('addItemNameBeforeSaving'));
      return;
    }

    const expirationDate = parseExpirationDate(values.expiration);

    if (values.expiration.trim() && !expirationDate) {
      setMessage(t('useValidExpirationDate'));
      return;
    }

    const parsedAmount = Number(values.amount);
    const quantityValue = values.quantityType === 'level' ? undefined : parsedAmount;

    if (values.quantityType !== 'level' && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      setMessage(t('enterAmountGreaterThanZero'));
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
        language: languageCode,
      });

      safeBack(`/pantry-item/${id}`);
    } catch (error) {
      if (isDuplicatePantryItemError(error)) {
        setMessage(t('duplicatePantryItem', { itemName: titleCase(normalizedName), location: t(values.location) }));
      } else {
        setMessage(getErrorMessage(error, t('unableToUpdateItem')));
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
        title={t('editItem')}
        subtitle={t('loadingItemDetails')}
        headerAction={<Button compact onPress={() => safeBack('/(tabs)/pantry')} secondary icon="arrow-back">{t('back')}</Button>}>
        <Card>
          <Text style={{ color: palette.muted }}>{t('loading')}</Text>
        </Card>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen
        onRefresh={refresh}
        refreshing={isRefreshing}
        title={t('editItem')}
        subtitle={t('thisItemCannotBeFound')}
        headerAction={<Button compact onPress={() => safeBack('/(tabs)/pantry')} secondary icon="arrow-back">{t('back')}</Button>}>
        <Card>
          <Text style={{ color: palette.muted }}>{message || t('itemNotFound')}</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      keyboardAware
      onRefresh={refresh}
      refreshing={isRefreshing}
      title={t('editItemTitle', { itemName: item.name })}
      subtitle={t('updateTheDetailsStored')}
      headerAction={<Button compact onPress={() => safeBack(`/pantry-item/${item.id}`)} secondary icon="close">{t('close')}</Button>}>
      <PantryItemForm
        initialValues={{
          name: item.name,
          category: item.category ?? 'other',
          quantityType: item.quantityUnit,
          amount: item.quantityValue ? String(item.quantityValue) : '1',
          level: item.quantityLabel ?? 'medium',
          location: item.storageLocation,
          expiration: item.expirationDate ?? '',
          notes: item.notes ?? '',
        }}
        isSaving={isSaving}
        message={message}
        onSubmit={handleSave}
        submitLabel={t('updateItem')}
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
