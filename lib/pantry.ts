import { supabase } from '@/lib/supabase';
import { PantryItem, QuantityLabel, QuantityUnit, StorageLocation } from '@/types/useitup';

type PantryItemRow = {
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

export type CreatePantryItemInput = {
  name: string;
  category?: string;
  storageLocation: StorageLocation;
  quantityValue?: number;
  quantityUnit: QuantityUnit;
  quantityLabel?: QuantityLabel;
  expirationDate?: string;
  notes?: string;
};

export type UpdatePantryItemInput = CreatePantryItemInput;

export function normalizePantryName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isDuplicatePantryItemError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }

  return fallback;
}

export async function getPantryItems(userId: string) {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
    .order('expiration_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as PantryItemRow[]).map(mapPantryItemRow);
}

export async function getPantryItemById(userId: string, itemId: string) {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPantryItemRow(data as PantryItemRow) : null;
}

export async function createPantryItem(userId: string, input: CreatePantryItemInput) {
  const normalizedName = normalizePantryName(input.name);

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({ user_id: userId, ...mapPantryItemInput(input) })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapPantryItemRow(data as PantryItemRow);
}

export async function updatePantryItem(userId: string, itemId: string, input: UpdatePantryItemInput) {
  const { data, error } = await supabase
    .from('pantry_items')
    .update({
      ...mapPantryItemInput(input),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapPantryItemRow(data as PantryItemRow);
}

export async function deletePantryItem(userId: string, itemId: string) {
  const { error } = await supabase.from('pantry_items').delete().eq('user_id', userId).eq('id', itemId);

  if (error) {
    throw error;
  }
}

function mapPantryItemRow(row: PantryItemRow): PantryItem {
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

function mapPantryItemInput(input: CreatePantryItemInput) {
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
