import { Recipe } from '@/types/useitup';

export type RecipeArtworkCategory =
  | 'beef'
  | 'egg'
  | 'grain'
  | 'pasta'
  | 'seafood'
  | 'soup'
  | 'vegetable';

export type RecipeArtwork = {
  category: RecipeArtworkCategory;
  imageUrl?: string;
  label: string;
  provider?: 'openai' | 'pexels';
  photographer?: string;
  photographerUrl?: string;
};

const artworkByCategory: Record<RecipeArtworkCategory, RecipeArtwork> = {
  beef: {
    category: 'beef',
    label: 'Hearty skillet',
  },
  egg: {
    category: 'egg',
    label: 'Egg dish',
  },
  grain: {
    category: 'grain',
    label: 'Rice bowl',
  },
  pasta: {
    category: 'pasta',
    label: 'Pasta',
  },
  seafood: {
    category: 'seafood',
    label: 'Seafood',
  },
  soup: {
    category: 'soup',
    label: 'Soup',
  },
  vegetable: {
    category: 'vegetable',
    label: 'Vegetable dish',
  },
};

const categoryKeywords: { category: RecipeArtworkCategory; keywords: string[] }[] = [
  { category: 'beef', keywords: ['beef', 'steak', 'ribeye', 'ground beef', 'burger', 'meatball'] },
  { category: 'seafood', keywords: ['fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'cod', 'seafood'] },
  { category: 'egg', keywords: ['egg', 'omelet', 'omelette', 'frittata', 'scramble'] },
  { category: 'pasta', keywords: ['pasta', 'spaghetti', 'noodle', 'linguine', 'macaroni', 'penne'] },
  { category: 'soup', keywords: ['soup', 'stew', 'broth', 'chili', 'curry'] },
  { category: 'grain', keywords: ['rice', 'quinoa', 'farro', 'barley', 'grain', 'bowl'] },
  {
    category: 'vegetable',
    keywords: ['broccoli', 'spinach', 'asparagus', 'lettuce', 'pepper', 'tomato', 'vegetable', 'salad'],
  },
];

export function getRecipeArtwork(recipe: Recipe): RecipeArtwork {
  return artworkByCategory[getRecipeArtworkCategory(recipe)];
}

export function getRecipeArtworkCategory(recipe: Recipe): RecipeArtworkCategory {
  const haystack = [recipe.title, recipe.description, ...recipe.ingredients.map((ingredient) => ingredient.name)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const match = categoryKeywords.find(({ keywords }) => keywords.some((keyword) => haystack.includes(keyword)));

  return match?.category ?? 'vegetable';
}

export function getRecipeImageSearchQuery(recipe: Recipe) {
  const title = recipe.title.trim();
  const category = getRecipeArtworkCategory(recipe);

  return [title, category, 'cooked plated finished dish recipe food photography']
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
