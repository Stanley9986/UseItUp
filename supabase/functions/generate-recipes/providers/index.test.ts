import { describe, expect, it } from 'vitest';

import { buildProviderChain, callWithFallback, getRecipeProvider, getTranslationProvider } from './index';
import { RecipeProvider } from './types';

function fakeProvider(name: string, generate: () => Promise<unknown>): RecipeProvider {
  return {
    name,
    generate,
    translateRecipes: async () => ({}),
    translateTerms: async () => ({}),
  };
}

describe('recipe provider selection', () => {
  it('returns Gemini by default', () => {
    expect(getRecipeProvider().name).toBe('gemini');
  });

  it('normalizes provider names', () => {
    expect(getRecipeProvider(' DeepSeek ').name).toBe('deepseek');
    expect(getRecipeProvider('OPENAI').name).toBe('openai');
  });

  it('falls back to Gemini for unknown providers', () => {
    expect(getRecipeProvider('unknown').name).toBe('gemini');
  });
});

describe('translation provider selection', () => {
  it('uses an explicit translation provider when present', () => {
    expect(getTranslationProvider('openai', 'deepseek').name).toBe('openai');
  });

  it('falls back to the recipe provider when no translation provider is set', () => {
    expect(getTranslationProvider(undefined, 'deepseek').name).toBe('deepseek');
  });
});

describe('buildProviderChain', () => {
  it('puts the primary first, then the fallbacks', () => {
    expect(buildProviderChain('deepseek', ['gemini', 'openai']).map((p) => p.name)).toEqual([
      'deepseek',
      'gemini',
      'openai',
    ]);
  });

  it('dedupes and ignores blanks (unknown names resolve to the default)', () => {
    expect(buildProviderChain('gemini', ['', 'gemini', 'deepseek']).map((p) => p.name)).toEqual([
      'gemini',
      'deepseek',
    ]);
  });
});

describe('callWithFallback', () => {
  it('returns the first success and which provider produced it', async () => {
    const chain = [
      fakeProvider('a', async () => {
        throw new Error('a down');
      }),
      fakeProvider('b', async () => 'from-b'),
    ];

    await expect(callWithFallback(chain, (p) => p.generate())).resolves.toEqual({
      result: 'from-b',
      providerName: 'b',
    });
  });

  it('throws the last error when every provider fails', async () => {
    const chain = [
      fakeProvider('a', async () => {
        throw new Error('a down');
      }),
      fakeProvider('b', async () => {
        throw new Error('b down');
      }),
    ];

    await expect(callWithFallback(chain, (p) => p.generate())).rejects.toThrow('b down');
  });
});
