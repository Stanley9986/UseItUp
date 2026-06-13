import { describe, expect, it } from 'vitest';

import { areGeneratedRecipesDuplicate, dedupeGeneratedRecipes } from '@/lib/recipes/recipe-dedupe';
import { Recipe, RecipeIngredient } from '@/types/useitup';

function ingredient(name: string): RecipeIngredient {
  return { name, isAvailable: true };
}

function recipe(title: string, ingredientNames: string[] = []): Recipe {
  return {
    id: title,
    title,
    ingredients: ingredientNames.map(ingredient),
    missingIngredients: [],
    instructions: [],
  };
}

describe('areGeneratedRecipesDuplicate', () => {
  it('treats reordered and filler-word titles as duplicates', () => {
    expect(
      areGeneratedRecipesDuplicate(recipe('Tomato Pasta'), recipe('Pasta with Tomatoes')),
    ).toBe(true);
  });

  it('treats singular and plural titles as duplicates', () => {
    expect(areGeneratedRecipesDuplicate(recipe('Egg Fried Rice'), recipe('Eggs Fried Rice'))).toBe(true);
  });

  it('keeps different dishes that share a word', () => {
    expect(areGeneratedRecipesDuplicate(recipe('Chicken Soup'), recipe('Chicken Salad'))).toBe(false);
    expect(areGeneratedRecipesDuplicate(recipe('Beef Tacos'), recipe('Beef Burrito'))).toBe(false);
  });

  it('collapses a more specific title only when ingredients overlap', () => {
    const soup = recipe('Chicken Soup', ['chicken', 'onion', 'carrot', 'celery']);
    const spicySoup = recipe('Spicy Chicken Soup', ['chicken', 'onion', 'carrot', 'chili']);
    expect(areGeneratedRecipesDuplicate(soup, spicySoup)).toBe(true);
  });

  it('does not collapse a shared-word subset when ingredients differ', () => {
    const salad = recipe('Salad', ['lettuce', 'tomato', 'cucumber']);
    const chickenSalad = recipe('Chicken Salad', ['chicken', 'mayonnaise', 'celery']);
    expect(areGeneratedRecipesDuplicate(salad, chickenSalad)).toBe(false);
  });
});

describe('dedupeGeneratedRecipes', () => {
  it('keeps the first occurrence and drops later duplicates', () => {
    const result = dedupeGeneratedRecipes([
      recipe('Tomato Pasta'),
      recipe('Pasta with Tomatoes'),
      recipe('Garlic Butter Shrimp'),
    ]);

    expect(result.map((item) => item.title)).toEqual(['Tomato Pasta', 'Garlic Butter Shrimp']);
  });

  it('leaves a batch of distinct recipes untouched', () => {
    const batch = [recipe('Tomato Pasta'), recipe('Chicken Salad'), recipe('Beef Tacos')];
    expect(dedupeGeneratedRecipes(batch)).toHaveLength(3);
  });
});
