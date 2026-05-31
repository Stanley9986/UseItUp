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

export function updateGeneratedRecipe(recipe: Recipe) {
  generatedRecipes = generatedRecipes.map((current) => (current.id === recipe.id ? recipe : current));
}

export function removeGeneratedRecipe(id: string) {
  generatedRecipes = generatedRecipes.filter((recipe) => recipe.id !== id);
}
