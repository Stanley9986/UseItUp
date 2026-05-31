import { PantryItem, QuantityLabel, QuantityUnit, StorageLocation } from '@/types/useitup';

export type PantryItemRow = {
  id: string;
  user_id: string;
  name: string;
  normalized_name: string;
  category: string | null;
  storage_location: StorageLocation;
  quantity_value: number | null;
  quantity_unit: QuantityUnit;
  quantity_label: QuantityLabel | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PantryItemInput = {
  name: string;
  category?: string;
  storageLocation: StorageLocation;
  quantityValue?: number;
  quantityUnit: QuantityUnit;
  quantityLabel?: QuantityLabel;
  expirationDate?: string;
  notes?: string;
};

export function normalizePantryName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isDuplicatePantryItemError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export function mapPantryItemRow(row: PantryItemRow): PantryItem {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    category: row.category ?? undefined,
    storageLocation: row.storage_location,
    quantityValue: row.quantity_value ?? undefined,
    quantityUnit: row.quantity_unit,
    quantityLabel: row.quantity_label ?? undefined,
    expirationDate: row.expiration_date ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function mapPantryItemInput(input: PantryItemInput) {
  const normalizedName = normalizePantryName(input.name);

  return {
    name: titleCase(normalizedName),
    normalized_name: normalizedName,
    category: input.category?.toLowerCase() || null,
    storage_location: input.storageLocation,
    quantity_value: input.quantityValue ?? null,
    quantity_unit: input.quantityUnit,
    quantity_label: input.quantityLabel ?? null,
    expiration_date: input.expirationDate ?? null,
    notes: input.notes?.trim() || null,
  };
}

function titleCase(value: string) {
  return value
    .split(' ')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}
