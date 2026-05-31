import { PantryItem, Recipe, UserPreferences } from '@/types/useitup';

export type GenerateRecipesRequest = {
  pantryItems: PantryItem[];
  preferences?: UserPreferences & {
    prioritizeExpiringSoon?: boolean;
  };
};

export type GenerateRecipesResponse = {
  recipes: Recipe[];
};
