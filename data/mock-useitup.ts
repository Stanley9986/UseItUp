import { PantryItem, Recipe } from '@/types/useitup';

function daysFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export const pantryItems: PantryItem[] = [
  {
    id: 'steak',
    name: 'Steak',
    category: 'meat',
    storageLocation: 'fridge',
    quantityValue: 2,
    quantityUnit: 'portion',
    expirationDate: daysFromToday(1),
  },
  {
    id: 'spinach',
    name: 'Spinach',
    category: 'produce',
    storageLocation: 'fridge',
    quantityUnit: 'level',
    quantityLabel: 'medium',
    expirationDate: daysFromToday(2),
  },
  {
    id: 'milk',
    name: 'Milk',
    category: 'dairy',
    storageLocation: 'fridge',
    quantityUnit: 'level',
    quantityLabel: 'half',
    expirationDate: daysFromToday(3),
  },
  {
    id: 'eggs',
    name: 'Eggs',
    category: 'dairy',
    storageLocation: 'fridge',
    quantityValue: 8,
    quantityUnit: 'count',
    expirationDate: daysFromToday(7),
  },
  {
    id: 'rice',
    name: 'Rice',
    category: 'grain',
    storageLocation: 'pantry',
    quantityUnit: 'level',
    quantityLabel: 'medium',
  },
  {
    id: 'soy-sauce',
    name: 'Soy sauce',
    category: 'condiment',
    storageLocation: 'pantry',
    quantityUnit: 'level',
    quantityLabel: 'low',
  },
];

export const recipes: Recipe[] = [
  {
    id: 'steak-rice-bowl',
    title: 'Steak Rice Bowl',
    description: 'A quick bowl that uses the steak before it slips past dinner.',
    prepTimeMinutes: 20,
    usesExpiringItems: true,
    ingredients: [
      {
        name: 'Steak',
        pantryItemId: 'steak',
        quantityValue: 1,
        quantityUnit: 'portion',
        isAvailable: true,
      },
      { name: 'Rice', pantryItemId: 'rice', quantityUnit: 'some', isAvailable: true },
      { name: 'Soy sauce', pantryItemId: 'soy-sauce', quantityUnit: 'splash', isAvailable: true },
      { name: 'Spinach', pantryItemId: 'spinach', quantityUnit: 'handful', isAvailable: true },
      { name: 'Garlic', quantityValue: 1, quantityUnit: 'clove', isAvailable: false },
    ],
    missingIngredients: ['Garlic'],
    instructions: [
      'Cook rice until fluffy.',
      'Slice and season the steak.',
      'Sear steak in a hot pan until cooked to preference.',
      'Wilt spinach in the pan with soy sauce.',
      'Serve the steak and spinach over rice.',
    ],
  },
  {
    id: 'spinach-omelet',
    title: 'Spinach Omelet',
    description: 'Fast eggs with the fridge greens that need attention.',
    prepTimeMinutes: 12,
    usesExpiringItems: true,
    ingredients: [
      {
        name: 'Eggs',
        pantryItemId: 'eggs',
        quantityValue: 2,
        quantityUnit: 'count',
        isAvailable: true,
      },
      { name: 'Spinach', pantryItemId: 'spinach', quantityUnit: 'handful', isAvailable: true },
      { name: 'Milk', pantryItemId: 'milk', quantityUnit: 'splash', isAvailable: true },
      { name: 'Salt and pepper', quantityUnit: 'pinch', isAvailable: false, isOptional: true },
    ],
    missingIngredients: [],
    instructions: [
      'Whisk eggs with a splash of milk.',
      'Wilt spinach in a skillet.',
      'Pour in the eggs and cook until mostly set.',
      'Fold the omelet and serve warm.',
    ],
  },
  {
    id: 'egg-fried-rice',
    title: 'Egg Fried Rice',
    description: 'Pantry rice, eggs, and a little soy sauce for a simple meal.',
    prepTimeMinutes: 18,
    ingredients: [
      {
        name: 'Eggs',
        pantryItemId: 'eggs',
        quantityValue: 2,
        quantityUnit: 'count',
        isAvailable: true,
      },
      { name: 'Rice', pantryItemId: 'rice', quantityUnit: 'some', isAvailable: true },
      { name: 'Soy sauce', pantryItemId: 'soy-sauce', quantityUnit: 'splash', isAvailable: true },
      { name: 'Scallions', quantityUnit: 'handful', isAvailable: false, isOptional: true },
    ],
    missingIngredients: [],
    instructions: [
      'Scramble eggs in a skillet and set them aside.',
      'Stir-fry cooked rice until hot.',
      'Add soy sauce and return the eggs to the pan.',
      'Taste, adjust seasoning, and serve.',
    ],
  },
];

export const expiringItems = pantryItems.filter((item) => item.expirationDate).slice(0, 3);

export function findRecipe(id?: string) {
  return recipes.find((recipe) => recipe.id === id) ?? recipes[0];
}

export function findPantryItem(id?: string) {
  return pantryItems.find((item) => item.id === id) ?? pantryItems[0];
}
