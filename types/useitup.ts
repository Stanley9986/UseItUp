export type QuantityUnit = 'count' | 'portion' | 'level';
export type StorageLocation = 'fridge' | 'freezer' | 'pantry';
export type QuantityLabel = 'empty' | 'low' | 'medium' | 'half' | 'full';

export type PantryItem = {
  id: string;
  name: string;
  normalizedName?: string;
  category?: string;
  storageLocation: StorageLocation;
  quantityValue?: number;
  quantityUnit: QuantityUnit;
  quantityLabel?: QuantityLabel;
  expirationDate?: string;
  notes?: string;
  // Language the name was entered in. Drives translate-on-view for item names.
  language?: string;
};

export type RecipeIngredient = {
  name: string;
  pantryItemId?: string;
  quantityValue?: number;
  quantityUnit?: string;
  isAvailable: boolean;
  isOptional?: boolean;
};

export type Recipe = {
  id: string;
  title: string;
  description?: string;
  prepTimeMinutes?: number;
  usesExpiringItems?: boolean;
  isFavorite?: boolean;
  ingredients: RecipeIngredient[];
  missingIngredients: string[];
  instructions: string[];
  // Language the stored content was generated/saved in. Drives translate-on-view.
  language?: string;
};

export type UserPreferences = {
  dietaryPreferences: string[];
  cuisinePreferences: string[];
  avoidedIngredients: string[];
  maxPrepTimeMinutes?: number;
  languageCode?: string;
};

export type ShoppingListItem = {
  id: string;
  name: string;
  normalizedName: string;
  sourceRecipeId?: string;
  sourceRecipeTitle?: string;
  isChecked: boolean;
  createdAt: string;
  updatedAt: string;
};
