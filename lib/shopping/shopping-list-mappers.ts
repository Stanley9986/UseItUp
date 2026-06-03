import { ShoppingListItem } from '@/types/useitup';

export type ShoppingListItemRow = {
  id: string;
  user_id: string;
  name: string;
  normalized_name: string;
  source_recipe_id: string | null;
  source_recipe_title: string | null;
  is_checked: boolean;
  created_at: string;
  updated_at: string;
};

export function normalizeShoppingItemName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function displayShoppingItemName(value: string) {
  return normalizeShoppingItemName(value)
    .split(' ')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

export function mapShoppingListItemRow(row: ShoppingListItemRow): ShoppingListItem {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    sourceRecipeId: row.source_recipe_id ?? undefined,
    sourceRecipeTitle: row.source_recipe_title ?? undefined,
    isChecked: row.is_checked,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapShoppingListItemInsert({
  name,
  recipeId,
  recipeTitle,
  userId,
}: {
  name: string;
  recipeId?: string;
  recipeTitle?: string;
  userId: string;
}) {
  const normalizedName = normalizeShoppingItemName(name);

  return {
    user_id: userId,
    name: displayShoppingItemName(normalizedName),
    normalized_name: normalizedName,
    source_recipe_id: recipeId ?? null,
    source_recipe_title: recipeTitle?.trim() || null,
    is_checked: false,
    updated_at: new Date().toISOString(),
  };
}

export function mapShoppingItemToAddPantryParams(item: Pick<ShoppingListItem, 'id' | 'name'>) {
  return {
    itemName: item.name,
    shoppingItemId: item.id,
  };
}

export function getSingleSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function getShoppingListSourceRecipeId({
  isFavoriteSource,
  recipeId,
}: {
  isFavoriteSource: boolean;
  recipeId?: string;
}) {
  return isFavoriteSource ? undefined : recipeId;
}

export function uniqueMissingIngredients(ingredients: string[]) {
  return Array.from(
    new Set(
      ingredients
        .map(normalizeShoppingItemName)
        .filter(Boolean),
    ),
  );
}
