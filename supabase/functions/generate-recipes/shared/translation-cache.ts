// Helpers for the recipe_translations cache. The cache is content-addressed:
// the key is a SHA-256 of the source content plus the target language, so an
// identical recipe translated to the same language reuses the cached result
// regardless of which recipe row it came from.

export type RecipeTranslationSource = {
  title: string;
  description: string;
  instructions: string[];
  ingredientNames: string[];
};

export type RecipeTranslation = {
  title: string;
  description: string;
  instructions: string[];
  // Map of original ingredient name -> translated name.
  ingredientNames: Record<string, string>;
};

export type RecipeTranslationRecord = {
  title: string | null;
  description: string | null;
  instructions: unknown;
  ingredient_names: unknown;
};

// Deterministic SHA-256 (hex) of the source content. Field order is fixed so
// the same content always hashes to the same value.
export async function hashRecipeSource(source: RecipeTranslationSource): Promise<string> {
  const canonical = JSON.stringify([
    source.title ?? '',
    source.description ?? '',
    source.instructions ?? [],
    source.ingredientNames ?? [],
  ]);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function normalizeTerm(term: string) {
  return term.trim().toLowerCase();
}

// Cache key for a single term translation. Namespaced so it never collides with
// a recipe content hash even though both share the recipe_translations table.
export async function hashTerm(term: string): Promise<string> {
  const bytes = new TextEncoder().encode(`term:${normalizeTerm(term)}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Zip the source ingredient names with the model's translated names (returned
// in the same order) into an original -> translated map.
export function buildIngredientNameMap(
  sourceNames: string[],
  translatedNames: string[],
): Record<string, string> {
  const map: Record<string, string> = {};

  sourceNames.forEach((name, index) => {
    const translated = translatedNames[index];

    if (name && typeof translated === 'string' && translated.trim()) {
      map[name] = translated.trim();
    }
  });

  return map;
}

export function mapTranslationRecord(record: RecipeTranslationRecord): RecipeTranslation {
  return {
    title: record.title ?? '',
    description: record.description ?? '',
    instructions: Array.isArray(record.instructions)
      ? record.instructions.filter((value): value is string => typeof value === 'string')
      : [],
    ingredientNames:
      record.ingredient_names && typeof record.ingredient_names === 'object'
        ? (record.ingredient_names as Record<string, string>)
        : {},
  };
}
