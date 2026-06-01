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
import { safeBack } from '@/lib/navigation';
import { createPantryItem, getErrorMessage, isDuplicatePantryItemError, normalizePantryName } from '@/lib/pantry';
import { deleteShoppingListItem } from '@/lib/shopping-list';
import { getSingleSearchParam } from '@/lib/shopping-list-mappers';

export default function AddItemScreen() {
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
        setMessage(`You already have ${titleCase(normalizedName)} in ${titleCase(values.location)}.`);
      } else {
        setMessage(getErrorMessage(error, 'Unable to save item.'));
      }
      setIsSaving(false);
      return;
    }

    if (sourceShoppingItemId) {
      try {
        await deleteShoppingListItem(user.id, sourceShoppingItemId);
      } catch (error) {
        setMessage(getErrorMessage(error, 'Item was added to your pantry, but it could not be removed from your shopping list.'));
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
      title="Add Item"
      subtitle="Add a real pantry item to your Supabase-backed inventory."
      headerAction={
        <Button
          compact
          onPress={() => safeBack(sourceShoppingItemId ? '/shopping-list' : '/(tabs)/pantry')}
          secondary
          icon="close">
          Close
        </Button>
      }>
      <PantryItemForm
        initialValues={initialItemName ? { name: initialItemName } : undefined}
        isSaving={isSaving}
        message={message}
        onSubmit={handleSave}
        submitLabel="Save Item"
      />
    </Screen>
  );
}

function titleCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
