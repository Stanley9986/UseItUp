import { describe, expect, it } from 'vitest';

import { getRecipeProvider, getTranslationProvider } from './index';

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
