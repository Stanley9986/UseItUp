type RecipePromptInput = {
  pantryItems: unknown[];
  preferences: unknown;
};

export type RecipePrompt = {
  systemInstruction: string;
  userPayload: {
    pantryItems: unknown[];
    preferences: unknown;
  };
};

export function createRecipePrompt({ pantryItems, preferences }: RecipePromptInput): RecipePrompt {
  return {
    systemInstruction: [
      'You generate practical home-cooking recipes from pantry inventory.',
      'Prioritize ingredients that expire soon.',
      'Keep recipes realistic, low-waste, and suitable for a general audience.',
      'Generate exactly 3 recipes when enough pantry items are available.',
      'Use compact JSON strings with no markdown, comments, or extra prose.',
      'Keep each description under 90 characters.',
      'Use at most 5 short instructions per recipe.',
      'Keep each instruction under 100 characters.',
      'Use no more than 8 ingredients per recipe.',
      'Give every ingredient a numeric quantityValue and a common cooking unit in quantityUnit (g, ml, cup, tbsp, tsp, piece, clove).',
      'Set quantityValue and quantityUnit to null only for seasonings measured to taste.',
      'Respect dietary preferences and avoided ingredients from the user payload.',
      'Write all user-facing recipe content in the requested language.',
      'Write ingredient names in the requested language too, including ones that match pantry items; keep the matching pantryItemId so the link is preserved.',
      'Keep JSON property names in English even when recipe content uses another language.',
      'Do not include avoided ingredients as required or optional ingredients.',
      'When dietary preferences limit ingredients, adapt recipes instead of ignoring the preferences.',
      'Do not claim spoiled food is safe.',
      'If a recipe uses fresh or expiring items, make instruction 1 inspect those ingredients and discard unsafe food.',
      'Never put the freshness inspection step at the end.',
      'Return only valid JSON that matches the provided recipe response schema.',
    ].join(' '),
    userPayload: {
      pantryItems: pantryItems.map((item) => {
        if (!isRecord(item)) {
          return item;
        }

        return {
          id: item.id,
          name: item.name,
          category: item.category,
          storageLocation: item.storageLocation,
          quantityValue: item.quantityValue,
          quantityUnit: item.quantityUnit,
          quantityLabel: item.quantityLabel,
          expirationDate: item.expirationDate,
          notes: item.notes,
        };
      }),
      preferences: normalizePreferences(preferences),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizePreferences(value: unknown) {
  if (!isRecord(value)) {
    return {
      languageCode: defaultLanguageCode,
      languageName: languageNamesByCode[defaultLanguageCode],
    };
  }

  const languageCode = normalizeLanguageCode(value.languageCode);

  return {
    dietaryPreferences: cleanStringList(value.dietaryPreferences),
    avoidedIngredients: cleanStringList(value.avoidedIngredients),
    maxPrepTimeMinutes:
      typeof value.maxPrepTimeMinutes === 'number' ? value.maxPrepTimeMinutes : undefined,
    prioritizeExpiringSoon:
      typeof value.prioritizeExpiringSoon === 'boolean' ? value.prioritizeExpiringSoon : undefined,
    languageCode,
    languageName: languageNamesByCode[languageCode],
  };
}

function cleanStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const defaultLanguageCode = 'en';

export const languageNamesByCode = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese',
  vi: 'Vietnamese',
} as const;

export function normalizeLanguageCode(value: unknown): keyof typeof languageNamesByCode {
  if (typeof value !== 'string') {
    return defaultLanguageCode;
  }

  const normalized = value.trim().toLowerCase().split('-')[0] as keyof typeof languageNamesByCode;

  return normalized in languageNamesByCode ? normalized : defaultLanguageCode;
}

export type TranslationPromptInput = {
  targetLanguage: unknown;
  recipes: unknown;
};

export type TranslationRecipe = {
  title: string;
  description: string;
  instructions: string[];
  ingredientNames: string[];
};

export type TranslationPrompt = {
  systemInstruction: string;
  userPayload: {
    targetLanguage: keyof typeof languageNamesByCode;
    targetLanguageName: string;
    recipes: TranslationRecipe[];
  };
};

// One Gemini call translates a batch of recipes, so switching language costs a
// single request regardless of how many recipes are on screen.
export function createTranslationPrompt(input: TranslationPromptInput): TranslationPrompt {
  const targetLanguage = normalizeLanguageCode(input.targetLanguage);
  const recipes = Array.isArray(input.recipes) ? input.recipes.map(sanitizeTranslationRecipe) : [];

  return {
    systemInstruction: [
      'You translate user-facing content for a home-cooking app.',
      `Translate every string into ${languageNamesByCode[targetLanguage]}.`,
      'The input contains an array of recipes; translate every recipe.',
      'Return recipes in the same order and the same count as the input.',
      'Within each recipe, return instructions and ingredientNames in the same order and count as the input.',
      'Preserve meaning and keep it natural, concise, and appetizing.',
      'Keep JSON property names in English.',
      'Do not add, remove, merge, split, or reorder recipes or list items.',
      'Keep numbers, units, and measurements accurate.',
      'Leave brand names and proper nouns untranslated when there is no common equivalent.',
      'Return only valid JSON that matches the provided translation response schema.',
    ].join(' '),
    userPayload: {
      targetLanguage,
      targetLanguageName: languageNamesByCode[targetLanguage],
      recipes,
    },
  };
}

export type TermsPromptInput = {
  targetLanguage: unknown;
  terms: unknown;
};

export type TermsPrompt = {
  systemInstruction: string;
  userPayload: {
    targetLanguage: keyof typeof languageNamesByCode;
    targetLanguageName: string;
    terms: string[];
  };
};

// Translates short food item / ingredient names (pantry entries, recipe
// ingredients) into the active language, independent of any recipe's source
// language.
export function createTermsPrompt(input: TermsPromptInput): TermsPrompt {
  const targetLanguage = normalizeLanguageCode(input.targetLanguage);
  const terms = Array.isArray(input.terms) ? cleanStringList(input.terms) : [];

  return {
    systemInstruction: [
      'You translate short food item and ingredient names for a kitchen app.',
      `Translate each name into ${languageNamesByCode[targetLanguage]}.`,
      'Return one object per input name with its exact original source string and the translation.',
      'Use the common culinary name in the target language.',
      'If a name is already in the target language, return it unchanged.',
      'Leave brand names and proper nouns untranslated when there is no common equivalent.',
      'Do not add, remove, merge, or reorder names.',
      'Return only valid JSON that matches the provided terms response schema.',
    ].join(' '),
    userPayload: {
      targetLanguage,
      targetLanguageName: languageNamesByCode[targetLanguage],
      terms,
    },
  };
}

export function sanitizeTranslationRecipe(value: unknown): TranslationRecipe {
  const record = isRecord(value) ? value : {};

  return {
    title: cleanString(record.title),
    description: cleanString(record.description),
    instructions: cleanStringList(record.instructions),
    ingredientNames: cleanStringList(record.ingredientNames),
  };
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
