import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Screen } from '@/components/useitup/ui';
import {
  PantryItemForm,
  PantryItemFormValues,
  parseExpirationDate,
  quantityLabelFromLevel,
} from '@/components/useitup/pantry-item-form';
import { useAuth } from '@/contexts/auth-context';
import { useAppLanguage } from '@/contexts/language-context';
import { safeBack } from '@/lib/navigation';
import { createPantryItem, getErrorMessage, isDuplicatePantryItemError, normalizePantryName } from '@/lib/pantry';
import { deleteShoppingListItem } from '@/lib/shopping-list';
import { getSingleSearchParam } from '@/lib/shopping-list-mappers';

export default function AddItemScreen() {
  const { t } = useAppLanguage();
  const { itemName, shoppingItemId } = useLocalSearchParams<{
    itemName?: string | string[];
    shoppingItemId?: string | string[];
  }>();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const initialItemName = getSingleSearchParam(itemName);
  const sourceShoppingItemId = getSingleSearchParam(shoppingItemId);

  async function handleSave(values: PantryItemFormValues) {
    if (!user || isSaving) {
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

    setMessage('');
    setIsSaving(true);

    try {
      await createPantryItem(user.id, {
        name: values.name,
        category: values.category,
        storageLocation: values.location,
        quantityValue,
        quantityUnit: values.quantityType,
        quantityLabel: values.quantityType === 'level' ? quantityLabelFromLevel(values.level) : undefined,
        expirationDate,
        notes: values.notes,
      });
    } catch (error) {
      if (isDuplicatePantryItemError(error)) {
        setMessage(t('duplicatePantryItem', { itemName: titleCase(normalizedName), location: t(values.location) }));
      } else {
        setMessage(getErrorMessage(error, t('unableToSaveItem')));
      }
      setIsSaving(false);
      return;
    }

    if (sourceShoppingItemId) {
      try {
        await deleteShoppingListItem(user.id, sourceShoppingItemId);
      } catch (error) {
        setMessage(getErrorMessage(error, t('itemWasAddedButShoppingListRemoveFailed')));
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);

    if (sourceShoppingItemId) {
      router.dismissTo('/shopping-list');
    } else {
      router.replace('/(tabs)/pantry');
    }
  }

  return (
    <Screen
      keyboardAware
      title={t('addItem')}
      subtitle={t('addPantryItemSubtitle')}
      headerAction={
        <Button
          compact
          onPress={() => safeBack(sourceShoppingItemId ? '/shopping-list' : '/(tabs)/pantry')}
          secondary
          icon="close">
          {t('close')}
        </Button>
      }>
      <PantryItemForm
        initialValues={initialItemName ? { name: initialItemName } : undefined}
        isSaving={isSaving}
        message={message}
        onSubmit={handleSave}
        submitLabel={t('saveItem')}
      />
    </Screen>
  );
}

function titleCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
