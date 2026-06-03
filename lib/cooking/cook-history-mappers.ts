export type CookSessionWithRecipeRow = {
  cooked_at: string;
  id: string;
  recipe_id: string;
  recipes:
    | {
        title: string | null;
      }
    | {
        title: string | null;
      }[]
    | null;
};

export type CookHistoryItem = {
  cookedAt: string;
  id: string;
  recipeId: string;
  recipeTitle: string;
};

export function mapCookHistoryRow(row: CookSessionWithRecipeRow): CookHistoryItem {
  const recipe = Array.isArray(row.recipes) ? row.recipes[0] : row.recipes;

  return {
    cookedAt: row.cooked_at,
    id: row.id,
    recipeId: row.recipe_id,
    recipeTitle: recipe?.title ?? 'Saved recipe',
  };
}
