import { describe, expect, it } from 'vitest';

import { readFunctionErrorPayload } from '@/lib/shared/function-errors';
import {
  getRecipeGenerationErrorKey,
  getRecipeGenerationErrorMessage,
  RecipeGenerationError,
} from '@/lib/recipes/recipe-generation-errors';
import { translate } from '@/lib/i18n/translations';

describe('readFunctionErrorPayload', () => {
  it('reads JSON error response bodies from cloned responses', async () => {
    await expect(
      readFunctionErrorPayload(
        new Response(JSON.stringify({ error: 'Gemini rejected the request' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ).resolves.toEqual({ error: 'Gemini rejected the request' });
  });

  it('falls back to text response bodies', async () => {
    await expect(readFunctionErrorPayload(new Response('Function crashed', { status: 500 }))).resolves.toBe(
      'Function crashed',
    );
  });

  it('returns null for unknown contexts', async () => {
    await expect(readFunctionErrorPayload(null)).resolves.toBeNull();
  });
});

describe('getRecipeGenerationErrorMessage', () => {
  it('localizes generation rate-limit errors from function codes', () => {
    const error = new RecipeGenerationError('Recipe generation is temporarily limited.', {
      code: 'generation_rate_limited',
    });

    expect(getRecipeGenerationErrorKey(error)).toBe('recipeGenerationLimited');
    expect(getRecipeGenerationErrorMessage(error, (key) => translate('vi', key))).toBe(
      'Tính năng tạo công thức tạm thời bị giới hạn. Vui lòng thử lại sau.',
    );
  });

  it('does not expose unknown function error strings to users', () => {
    const error = new RecipeGenerationError('Internal provider details', {
      code: 'unexpected_code',
    });

    expect(getRecipeGenerationErrorMessage(error, (key) => translate('es', key))).toBe(
      'Aún no se pudieron generar recetas. Intenta de nuevo.',
    );
  });
});
