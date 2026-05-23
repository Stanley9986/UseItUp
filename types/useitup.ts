export type QuantityUnit = 'count' | 'portion' | 'level';
export type StorageLocation = 'fridge' | 'freezer' | 'pantry';
export type QuantityLabel = 'empty' | 'low' | 'medium' | 'half' | 'full';

export type PantryItem = {
  id: string;
  name: string;
  category?: string;
  storageLocation: StorageLocation;
  quantityValue?: number;
  quantityUnit: QuantityUnit;
  quantityLabel?: QuantityLabel;
  expirationDate?: string;
  notes?: string;
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
  ingredients: RecipeIngredient[];
  missingIngredients: string[];
  instructions: string[];
};
