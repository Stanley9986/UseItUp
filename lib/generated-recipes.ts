import { Recipe } from '@/types/useitup';

let generatedRecipes: Recipe[] = [];

export function setGeneratedRecipes(recipes: Recipe[]) {
  generatedRecipes = recipes;
}

export function getGeneratedRecipes() {
  return generatedRecipes;
}

export function findGeneratedRecipe(id?: string) {
  return generatedRecipes.find((recipe) => recipe.id === id);
}
