import { FunctionsHttpError } from '@supabase/supabase-js';

import { SupportedLanguageCode } from '@/lib/i18n/languages';
import { toIsoDate } from '@/lib/shared/date-utils';
import { readFunctionErrorPayload } from '@/lib/shared/function-errors';
import { supabase } from '@/lib/shared/supabase';
import { QuantityLabel, QuantityUnit, StorageLocation } from '@/types/useitup';

const categories = ['produce', 'meat', 'dairy', 'grain', 'condiment', 'other'] as const;
const storageLocations: readonly StorageLocation[] = ['fridge', 'freezer', 'pantry'];
const quantityUnits: readonly QuantityUnit[] = ['count', 'portion', 'level'];
const quantityLabels: readonly QuantityLabel[] = ['empty', 'low', 'medium', 'half', 'full'];

// Cap inferred shelf life so an outlier estimate cannot push an expiration date
// absurdly far into the future.
const MAX_SHELF_LIFE_DAYS = 3650;

// Editable fields for a parsed intake item, shaped to drop straight into
// createPantryItem after the user confirms.
export type IntakeDraftFields = {
  name: string;
  category: string;
  storageLocation: StorageLocation;
  quantityUnit: QuantityUnit;
  quantityValue?: number;
  quantityLabel?: QuantityLabel;
  expirationDate?: string;
  notes?: string;
};

export type IntakeDraft = IntakeDraftFields & { id: string };

type IntakeResponse = {
  items?: unknown;
};

// Parse a free-text grocery description into pantry item drafts via the
// generate-recipes Edge Function. Item names come back in the active language;
// each raw item is sanitized into a confirmable draft client-side.
export async function parseIntakeText(
  text: string,
  languageCode: SupportedLanguageCode,
): Promise<IntakeDraft[]> {
  const trimmed = text.trim();

  if (!trimmed) {
    return [];
  }

  const { data, error } = await supabase.functions.invoke<IntakeResponse>('generate-recipes', {
    body: { intake: { text: trimmed, targetLanguage: languageCode } },
  });

  if (error) {
    throw await getIntakeError(error);
  }

  const rawItems = Array.isArray(data?.items) ? data.items : [];
  const today = new Date();
  const drafts: IntakeDraft[] = [];

  rawItems.forEach((raw, index) => {
    const fields = sanitizeIntakeDraft(raw, today);

    if (fields) {
      drafts.push({ ...fields, id: `intake-${index}` });
    }
  });

  return drafts;
}

// Coerce one raw model item into a valid draft, clamping every field to a value
// the pantry model accepts. Returns null when there is no usable name. Pure and
// timezone-stable: an explicit `today` keeps expiration math testable.
export function sanitizeIntakeDraft(raw: unknown, today: Date = new Date()): IntakeDraftFields | null {
  if (!isRecord(raw)) {
    return null;
  }

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';

  if (!name) {
    return null;
  }

  const quantityUnit = pick(quantityUnits, raw.quantityUnit, 'count');

  const fields: IntakeDraftFields = {
    name,
    category: pick(categories, raw.category, 'other'),
    storageLocation: pick(storageLocations, raw.storageLocation, 'pantry'),
    quantityUnit,
  };

  if (quantityUnit === 'level') {
    fields.quantityLabel = pick(quantityLabels, raw.quantityLabel, 'medium');
  } else {
    fields.quantityValue = toPositiveAmount(raw.quantityValue);
  }

  const expirationDate = toExpirationDate(raw.shelfLifeDays, today);

  if (expirationDate) {
    fields.expirationDate = expirationDate;
  }

  const notes = typeof raw.notes === 'string' ? raw.notes.trim() : '';

  if (notes) {
    fields.notes = notes;
  }

  return fields;
}

function pick<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function toPositiveAmount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return Math.round(parsed * 100) / 100;
}

function toExpirationDate(value: unknown, today: Date): string | undefined {
  const days = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(days) || days <= 0) {
    return undefined;
  }

  const capped = Math.min(Math.round(days), MAX_SHELF_LIFE_DAYS);
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + capped, 12, 0, 0, 0);

  return toIsoDate(date);
}

async function getIntakeError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const payload = await readFunctionErrorPayload(error.context);

    if (isRecord(payload) && typeof payload.error === 'string') {
      return new Error(payload.error);
    }

    if (typeof payload === 'string' && payload.trim()) {
      return new Error(payload);
    }
  }

  return error instanceof Error ? error : new Error('Item parsing failed');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
