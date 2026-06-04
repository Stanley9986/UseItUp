import { PantryItem } from '@/types/useitup';

export type PantryArtworkCategory =
  | 'dairy'
  | 'grain'
  | 'meat'
  | 'pantry'
  | 'produce';

export type PantryArtwork = {
  category: PantryArtworkCategory;
  imageUrl?: string;
  label: string;
  provider?: 'openai' | 'pexels';
  photographer?: string;
  photographerUrl?: string;
};

const artworkByCategory: Record<PantryArtworkCategory, PantryArtwork> = {
  dairy: {
    category: 'dairy',
    label: 'Dairy ingredient',
  },
  grain: {
    category: 'grain',
    label: 'Grain ingredient',
  },
  meat: {
    category: 'meat',
    label: 'Meat ingredient',
  },
  pantry: {
    category: 'pantry',
    label: 'Pantry ingredient',
  },
  produce: {
    category: 'produce',
    label: 'Fresh produce',
  },
};

const categoryKeywords: { category: PantryArtworkCategory; keywords: string[] }[] = [
  { category: 'meat', keywords: ['beef', 'chicken', 'pork', 'steak', 'turkey', 'meat', 'sausage', 'bacon'] },
  { category: 'dairy', keywords: ['milk', 'cheese', 'yogurt', 'cream', 'butter', 'dairy'] },
  { category: 'grain', keywords: ['rice', 'pasta', 'bread', 'oat', 'quinoa', 'flour', 'grain', 'cereal', 'noodle'] },
  {
    category: 'produce',
    keywords: [
      'apple',
      'asparagus',
      'banana',
      'broccoli',
      'carrot',
      'lettuce',
      'onion',
      'pepper',
      'produce',
      'spinach',
      'tomato',
      'vegetable',
    ],
  },
  { category: 'pantry', keywords: ['beans', 'canned', 'oil', 'sauce', 'salt', 'spice', 'sugar', 'vinegar'] },
];

export function getPantryArtwork(item: PantryItem): PantryArtwork {
  return artworkByCategory[getPantryArtworkCategory(item)];
}

export function getPantryArtworkCategory(item: PantryItem): PantryArtworkCategory {
  const haystack = [item.name, item.normalizedName, item.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const match = categoryKeywords.find(({ keywords }) => keywords.some((keyword) => haystack.includes(keyword)));

  if (match) {
    return match.category;
  }

  if (item.category === 'dairy' || item.category === 'grain' || item.category === 'meat' || item.category === 'produce') {
    return item.category;
  }

  return 'pantry';
}

export function getPantryImageSearchQuery(item: PantryItem) {
  return [item.name.trim(), item.category, 'food ingredient']
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
