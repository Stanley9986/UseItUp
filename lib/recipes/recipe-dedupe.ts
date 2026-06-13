import { normalizeRecipeTitle } from '@/lib/recipes/recipe-list';
import { Recipe } from '@/types/useitup';

// Words that carry no dish identity, so two titles that differ only by these are
// still the same recipe ("Tomato Pasta" vs "Pasta with Tomatoes").
const titleStopwords = new Set([
  'a',
  'an',
  'and',
  'easy',
  'for',
  'fresh',
  'homemade',
  'in',
  'of',
  'on',
  'or',
  'quick',
  'simple',
  'style',
  'the',
  'to',
  'with',
  'without',
]);

// Minimum share of ingredient names two recipes must have in common before a
// subset title match (e.g. "Chicken Soup" vs "Spicy Chicken Soup") is treated as
// a duplicate. Keeps genuinely different dishes that happen to share a word
// (e.g. "Salad" vs "Chicken Salad") from collapsing into each other.
const subsetIngredientOverlapThreshold = 0.5;

// Reduces a recipe title to its set of identity-bearing tokens: normalized,
// stopwords removed, and singularized so "Tomatoes" and "tomato" align.
export function recipeTitleTokens(title: string): Set<string> {
  return new Set(
    normalizeRecipeTitle(title)
      .split(' ')
      .map(singularize)
      .filter((token) => token.length > 0 && !titleStopwords.has(token)),
  );
}

// Two generated recipes are duplicates when their title token sets are equal, or
// when one set is contained in the other and they share most ingredients. The
// ingredient guard prevents dropping different dishes whose titles merely
// overlap.
export function areGeneratedRecipesDuplicate(a: Recipe, b: Recipe): boolean {
  const tokensA = recipeTitleTokens(a.title);
  const tokensB = recipeTitleTokens(b.title);

  // Titles made entirely of stopwords leave nothing to compare; fall back to the
  // existing exact normalized-title check.
  if (!tokensA.size || !tokensB.size) {
    return normalizeRecipeTitle(a.title) === normalizeRecipeTitle(b.title);
  }

  if (areSetsEqual(tokensA, tokensB)) {
    return true;
  }

  if (isSubset(tokensA, tokensB) || isSubset(tokensB, tokensA)) {
    return (
      jaccard(ingredientNameSet(a), ingredientNameSet(b)) >= subsetIngredientOverlapThreshold
    );
  }

  return false;
}

// Drops later recipes that duplicate an earlier one in the batch, keeping the
// first occurrence so the generator's preferred ordering is preserved.
export function dedupeGeneratedRecipes(recipes: Recipe[]): Recipe[] {
  const kept: Recipe[] = [];

  for (const recipe of recipes) {
    if (!kept.some((existing) => areGeneratedRecipesDuplicate(existing, recipe))) {
      kept.push(recipe);
    }
  }

  return kept;
}

function ingredientNameSet(recipe: Recipe): Set<string> {
  return new Set(
    recipe.ingredients
      .map((ingredient) => singularize(normalizeRecipeTitle(ingredient.name)))
      .filter((name) => name.length > 0),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) {
    return 0;
  }

  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) {
      intersection += 1;
    }
  }

  return intersection / (a.size + b.size - intersection);
}

function isSubset(maybeSubset: Set<string>, superset: Set<string>): boolean {
  for (const value of maybeSubset) {
    if (!superset.has(value)) {
      return false;
    }
  }

  return true;
}

function areSetsEqual(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && isSubset(a, b);
}

function singularize(token: string): string {
  if (token.endsWith('ies') && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith('es') && token.length > 3) {
    return token.slice(0, -2);
  }

  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 2) {
    return token.slice(0, -1);
  }

  return token;
}
