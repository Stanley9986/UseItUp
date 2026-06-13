// Response schema for batch-translating recipe content. The recipes array, and
// each recipe's instructions and ingredientNames, are returned parallel to the
// input order so they can be re-aligned to their sources by position.
export const translationSchema = {
  type: 'object',
  properties: {
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          instructions: {
            type: 'array',
            items: { type: 'string' },
          },
          ingredientNames: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['title', 'description', 'instructions', 'ingredientNames'],
      },
    },
  },
  required: ['recipes'],
};

// Response schema for translating short item/ingredient names. Each entry pairs
// the original source string with its translation so results map back by value
// rather than by fragile array position.
export const termsSchema = {
  type: 'object',
  properties: {
    terms: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          translation: { type: 'string' },
        },
        required: ['source', 'translation'],
      },
    },
  },
  required: ['terms'],
};

export const recipeSchema = {
  type: 'object',
  properties: {
    recipes: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          prepTimeMinutes: { type: 'number' },
          usesExpiringItems: { type: 'boolean' },
          ingredients: {
            type: 'array',
            maxItems: 8,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                pantryItemId: { type: ['string', 'null'] },
                quantityValue: { type: ['number', 'null'] },
                quantityUnit: { type: ['string', 'null'] },
                isAvailable: { type: 'boolean' },
                isOptional: { type: 'boolean' },
              },
              required: ['name', 'quantityValue', 'quantityUnit', 'isAvailable', 'isOptional'],
            },
          },
          missingIngredients: {
            type: 'array',
            maxItems: 4,
            items: { type: 'string' },
          },
          instructions: {
            type: 'array',
            minItems: 3,
            maxItems: 5,
            items: { type: 'string' },
          },
        },
        required: [
          'id',
          'title',
          'description',
          'prepTimeMinutes',
          'usesExpiringItems',
          'ingredients',
          'missingIngredients',
          'instructions',
        ],
      },
    },
  },
  required: ['recipes'],
};
