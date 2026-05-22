# Codex Instructions for UseItUp

## Project Goal

Build UseItUp, a mobile pantry app that helps users track ingredients, cook meals from what they already have, and update pantry quantities after cooking.

## Current MVP Goal

Implement the MVP in phases. Do not build advanced features before the core flow works.

## Important Product Rule

This is not a generic recipe app. The main user flow is:

1. Add pantry items
2. See expiring food
3. Generate recipes from available ingredients
4. Cook a recipe
5. Confirm ingredient usage
6. Update pantry inventory

## Phase 1 Task: Static Mobile Prototype

Build the app screens using fake data only.

### Required Screens

- Home
- Pantry
- Add/Edit Item
- Recipe Suggestions
- Recipe Detail
- Update Pantry
- Profile/Settings placeholder

### Requirements

- Use React Native with Expo.
- Use Expo Router if setting up routing.
- Use TypeScript if possible.
- Use clean reusable components.
- Do not connect Supabase yet.
- Do not call any AI API yet.
- Use fake data stored in local files or constants.
- Keep the UI mobile-friendly and simple.

### Fake Data Needed

Create sample pantry items:

- Steak, 2 portions, fridge, expires tomorrow
- Spinach, medium level, fridge, expires in 2 days
- Milk, half level, fridge, expires in 3 days
- Eggs, 8 count, fridge, expires in 7 days
- Rice, medium level, pantry, no near expiration
- Soy sauce, low level, pantry, no near expiration

Create sample recipes:

- Steak Rice Bowl
- Spinach Omelet
- Egg Fried Rice

## Phase 2 Task: Supabase Auth and Pantry CRUD

Only start this after Phase 1 UI is complete.

### Requirements

- Create Supabase client.
- Add login and signup screens.
- Create `pantry_items` table.
- Add Row Level Security.
- Implement create, read, update, delete for pantry items.
- Sort pantry items by expiration date.

## Phase 3 Task: Recipe Generation

Only start this after pantry CRUD works.

### Requirements

- Create a recipe generation service.
- Send structured pantry item data to the backend/AI service.
- Ask for JSON recipe output.
- Validate the JSON before displaying it.
- Display recipe cards using generated data.

## Phase 4 Task: Pantry Update After Cooking

Only start this after recipe detail works.

### Requirements

- Add `I Cooked This` button on Recipe Detail screen.
- Open Update Pantry screen.
- Show suggested deductions.
- Let user choose used suggested amount, used all, used less, or skip.
- Update pantry item quantities.
- Store a cook session and pantry update history later.

## Component Guidelines

Recommended components:

- PantryItemCard
- RecipeCard
- ExpiringSoonCard
- QuantitySelector
- StorageLocationSelector
- PrimaryButton
- EmptyState
- ScreenHeader

## Data Types

Create TypeScript types for:

```ts
export type QuantityUnit = 'count' | 'portion' | 'level';
export type StorageLocation = 'fridge' | 'freezer' | 'pantry';

export type PantryItem = {
  id: string;
  name: string;
  category?: string;
  storageLocation: StorageLocation;
  quantityValue?: number;
  quantityUnit: QuantityUnit;
  quantityLabel?: 'empty' | 'low' | 'medium' | 'half' | 'full';
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
```

## UI Style Direction

- Warm, clean, minimal mobile app
- Large rounded cards
- Clear primary CTA buttons
- Green accent color
- Friendly spacing
- Avoid clutter
- Make "Cook What I Have" the most prominent action

## Do Not Build Yet

Do not build these in the MVP unless specifically requested:

- Video scanning
- Receipt scanning
- Barcode scanning
- Nutrition tracking
- Payments
- Social features
- Grocery delivery
- Complex recommendation engine

## Definition of Done for Phase 1

Phase 1 is complete when:

- User can navigate between all core screens.
- Home shows expiring items and suggested meals.
- Pantry screen shows fake pantry data.
- Add Item screen has a usable form UI.
- Recipe Suggestions screen shows fake recipes.
- Recipe Detail screen shows ingredients and instructions.
- Update Pantry screen shows suggested deductions.
- UI is clean enough to screenshot for a portfolio or continue into backend implementation.
