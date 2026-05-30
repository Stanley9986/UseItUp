import { PantryItem, Recipe } from '@/types/useitup';

export type GenerateRecipesRequest = {
  pantryItems: PantryItem[];
  preferences?: {
    maxPrepTimeMinutes?: number;
    prioritizeExpiringSoon?: boolean;
  };
};

export type GenerateRecipesResponse = {
  recipes: Recipe[];
};
