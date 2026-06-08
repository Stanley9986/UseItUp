import { beforeEach, describe, expect, it, vi } from 'vitest';

const asyncStorageMock = vi.hoisted(() => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}));

const supabaseFunctionsMock = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: asyncStorageMock,
}));

vi.mock('@/lib/shared/supabase', () => ({
  supabase: {
    functions: supabaseFunctionsMock,
  },
}));

import {
  applyRecipeTranslation,
  clearRecipeTranslationClientCache,
  getRecipeTranslationSignature,
  prepareTranslatedRecipesWithStatus,
  shouldTranslateRecipe,
  translateRecipes,
  translateRecipesWithStatus,
} from '@/lib/recipes/recipe-translation';
import { Recipe } from '@/types/useitup';

const recipe: Recipe = {
  id: 'recipe-1',
  title: 'Lemon Herb Chicken',
  description: 'Juicy grilled chicken.',
  prepTimeMinutes: 25,
  usesExpiringItems: true,
  language: 'pt',
  ingredients: [
    { name: 'Chicken', isAvailable: true },
    { name: 'Lemon', isAvailable: false },
  ],
  missingIngredients: ['Lemon'],
  instructions: ['Season the chicken.', 'Grill until done.'],
};

describe('shouldTranslateRecipe', () => {
  it('translates when the source language differs from the target', () => {
    expect(shouldTranslateRecipe(recipe, 'zh')).toBe(true);
  });

  it('skips when already in the target language', () => {
    expect(shouldTranslateRecipe(recipe, 'pt')).toBe(false);
  });

  it('translates likely non-English content into English even when bad metadata says English', () => {
    expect(
      shouldTranslateRecipe(
        {
          ...recipe,
          title: '黄油菠菜炒蛋',
          instructions: ['翻炒菠菜。'],
          language: 'en',
        },
        'en',
      ),
    ).toBe(true);
  });

  it('translates an unknown-language recipe into a non-English language', () => {
    expect(shouldTranslateRecipe({ ...recipe, language: undefined }, 'zh')).toBe(true);
  });

  it('skips a likely English unknown-language recipe when the target is English', () => {
    expect(shouldTranslateRecipe({ ...recipe, language: undefined }, 'en')).toBe(false);
  });

  it('translates a likely non-English unknown-language recipe into English', () => {
    expect(
      shouldTranslateRecipe(
        {
          ...recipe,
          title: '柠檬香草鸡',
          instructions: ['给鸡肉调味。'],
          language: undefined,
        },
        'en',
      ),
    ).toBe(true);
  });
});

describe('getRecipeTranslationSignature', () => {
  it('changes when the stored source language changes under the same recipe id', () => {
    expect(getRecipeTranslationSignature({ ...recipe, language: 'zh' })).not.toBe(
      getRecipeTranslationSignature({ ...recipe, language: 'en' }),
    );
  });

  it('changes when refreshed recipe text changes under the same recipe id', () => {
    expect(getRecipeTranslationSignature(recipe)).not.toBe(
      getRecipeTranslationSignature({ ...recipe, title: 'Chinese Spinach Eggs' }),
    );
  });
});

describe('applyRecipeTranslation', () => {
  it('returns the original recipe when there is no translation', () => {
    expect(applyRecipeTranslation(recipe, undefined)).toBe(recipe);
  });

  it('applies translated text and ingredient names', () => {
    const translated = applyRecipeTranslation(recipe, {
      title: '柠檬香草鸡',
      description: '多汁的烤鸡。',
      instructions: ['给鸡肉调味。', '烤至完成。'],
      ingredientNames: { Chicken: '鸡肉', Lemon: '柠檬' },
    });

    expect(translated.title).toBe('柠檬香草鸡');
    expect(translated.description).toBe('多汁的烤鸡。');
    expect(translated.instructions).toEqual(['给鸡肉调味。', '烤至完成。']);
    expect(translated.ingredients.map((ingredient) => ingredient.name)).toEqual(['鸡肉', '柠檬']);
    expect(translated.missingIngredients).toEqual(['柠檬']);
  });

  it('falls back to original fields the translation omits', () => {
    const translated = applyRecipeTranslation(recipe, {
      title: '柠檬香草鸡',
      description: '',
      instructions: [],
      ingredientNames: { Chicken: '鸡肉' },
    });

    expect(translated.title).toBe('柠檬香草鸡');
    expect(translated.description).toBe('Juicy grilled chicken.');
    expect(translated.instructions).toEqual(['Season the chicken.', 'Grill until done.']);
    expect(translated.ingredients.map((ingredient) => ingredient.name)).toEqual(['鸡肉', 'Lemon']);
  });
});

describe('translateRecipes', () => {
  beforeEach(() => {
    clearRecipeTranslationClientCache();
    asyncStorageMock.getItem.mockReset().mockResolvedValue(null);
    asyncStorageMock.removeItem.mockReset();
    asyncStorageMock.setItem.mockReset().mockResolvedValue(undefined);
    supabaseFunctionsMock.invoke.mockReset();
  });

  it('does not call the function when no recipe needs translation', async () => {
    const result = await translateRecipes([{ ...recipe, language: 'zh' }], 'zh');

    expect(result).toEqual({});
    expect(supabaseFunctionsMock.invoke).not.toHaveBeenCalled();
  });

  it('batches cache-misses into one call keyed by recipe id', async () => {
    supabaseFunctionsMock.invoke.mockResolvedValue({
      data: {
        translations: [
          {
            title: '柠檬香草鸡',
            description: '多汁的烤鸡。',
            instructions: ['给鸡肉调味。'],
            ingredientNames: { Chicken: '鸡肉' },
          },
        ],
      },
      error: null,
    });

    const result = await translateRecipes([recipe], 'zh');

    expect(supabaseFunctionsMock.invoke).toHaveBeenCalledTimes(1);
    const [functionName, options] = supabaseFunctionsMock.invoke.mock.calls[0];
    expect(functionName).toBe('generate-recipes');
    expect(options.body.translate.targetLanguage).toBe('zh');
    expect(options.body.translate.recipes).toEqual([
      {
        title: 'Lemon Herb Chicken',
        description: 'Juicy grilled chicken.',
        instructions: ['Season the chicken.', 'Grill until done.'],
        ingredientNames: ['Chicken', 'Lemon'],
      },
    ]);
    expect(result['recipe-1'].title).toBe('柠檬香草鸡');
  });

  it('serves a repeat request from the in-memory cache without another call', async () => {
    supabaseFunctionsMock.invoke.mockResolvedValue({
      data: { translations: [{ title: '柠檬香草鸡', description: '', instructions: [], ingredientNames: {} }] },
      error: null,
    });

    await translateRecipes([recipe], 'zh');
    await translateRecipes([recipe], 'zh');

    expect(supabaseFunctionsMock.invoke).toHaveBeenCalledTimes(1);
  });

  it('reports uncached translation failures without blanking original recipes', async () => {
    supabaseFunctionsMock.invoke.mockResolvedValue({
      data: { code: 'translation_rate_limited', error: 'Translation is temporarily limited.' },
      error: new Error('Function returned 429'),
    });

    const result = await translateRecipesWithStatus([recipe], 'es');

    expect(result).toEqual({ translations: {}, failed: true });
  });

  it('prepares original recipe display with a failed status when translation is limited', async () => {
    supabaseFunctionsMock.invoke.mockResolvedValue({
      data: { code: 'translation_rate_limited', error: 'Translation is temporarily limited.' },
      error: new Error('Function returned 429'),
    });

    const result = await prepareTranslatedRecipesWithStatus([recipe], 'es');

    expect(result.recipeTranslationFailed).toBe(true);
    expect(result.recipes[0].title).toBe('Lemon Herb Chicken');
  });
});
