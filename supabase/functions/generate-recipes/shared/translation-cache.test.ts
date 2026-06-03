import { describe, expect, it } from 'vitest';

import {
  buildIngredientNameMap,
  hashRecipeSource,
  mapTranslationRecord,
} from './translation-cache';

const source = {
  title: 'Lemon Herb Chicken',
  description: 'Juicy grilled chicken.',
  instructions: ['Season the chicken.', 'Grill until done.'],
  ingredientNames: ['Chicken', 'Lemon'],
};

describe('hashRecipeSource', () => {
  it('is deterministic for identical content', async () => {
    expect(await hashRecipeSource(source)).toBe(await hashRecipeSource({ ...source }));
  });

  it('changes when any content changes', async () => {
    const base = await hashRecipeSource(source);

    expect(await hashRecipeSource({ ...source, title: 'Different' })).not.toBe(base);
    expect(await hashRecipeSource({ ...source, ingredientNames: ['Chicken'] })).not.toBe(base);
  });

  it('returns a 64-character hex SHA-256 string', async () => {
    expect(await hashRecipeSource(source)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('buildIngredientNameMap', () => {
  it('zips source names to translated names by position', () => {
    expect(buildIngredientNameMap(['Chicken', 'Lemon'], ['鸡肉', '柠檬'])).toEqual({
      Chicken: '鸡肉',
      Lemon: '柠檬',
    });
  });

  it('skips entries with a missing or blank translation', () => {
    expect(buildIngredientNameMap(['Chicken', 'Lemon', 'Salt'], ['鸡肉', '', undefined as never])).toEqual({
      Chicken: '鸡肉',
    });
  });
});

describe('mapTranslationRecord', () => {
  it('maps a db record and defaults missing fields', () => {
    expect(
      mapTranslationRecord({
        title: '柠檬香草鸡',
        description: null,
        instructions: ['给鸡肉调味。', 42],
        ingredient_names: { Chicken: '鸡肉' },
      }),
    ).toEqual({
      title: '柠檬香草鸡',
      description: '',
      instructions: ['给鸡肉调味。'],
      ingredientNames: { Chicken: '鸡肉' },
    });
  });

  it('defaults non-object ingredient maps and non-array instructions', () => {
    expect(
      mapTranslationRecord({
        title: null,
        description: null,
        instructions: null,
        ingredient_names: null,
      }),
    ).toEqual({
      title: '',
      description: '',
      instructions: [],
      ingredientNames: {},
    });
  });
});
