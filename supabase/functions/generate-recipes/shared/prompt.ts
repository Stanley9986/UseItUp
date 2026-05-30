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
      'Do not claim spoiled food is safe. Tell users to inspect ingredients and discard unsafe food.',
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
      preferences,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
