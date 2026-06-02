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
      'Respect dietary preferences and avoided ingredients from the user payload.',
      'Write all user-facing recipe content in the requested language.',
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

const defaultLanguageCode = 'en';

const languageNamesByCode = {
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

function normalizeLanguageCode(value: unknown): keyof typeof languageNamesByCode {
  if (typeof value !== 'string') {
    return defaultLanguageCode;
  }

  const normalized = value.trim().toLowerCase().split('-')[0] as keyof typeof languageNamesByCode;

  return normalized in languageNamesByCode ? normalized : defaultLanguageCode;
}
