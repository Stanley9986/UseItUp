import { Recipe } from '@/types/useitup';

export function normalizeRecipeTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Favorites and suggestions are independent: a suggested recipe is "favorited"
// when a favorite with the same normalized title exists.
export function isRecipeFavorited(favorites: Recipe[], title: string) {
  const normalizedTitle = normalizeRecipeTitle(title);

  return favorites.some((favorite) => normalizeRecipeTitle(favorite.title) === normalizedTitle);
}
