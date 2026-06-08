import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/shared/supabase';
import { normalizeGeneratedRecipes } from '@/lib/recipes/recipe-generation-mappers';
import { GenerateRecipesRequest, GenerateRecipesResponse } from '@/types/recipe-generation';
import { readFunctionErrorPayload } from '@/lib/shared/function-errors';
import { RecipeGenerationError } from '@/lib/recipes/recipe-generation-errors';

export async function generateRecipes(request: GenerateRecipesRequest) {
  const { data, error } = await supabase.functions.invoke<GenerateRecipesResponse>('generate-recipes', {
    body: request,
  });

  if (error) {
    throw await getFunctionError(error);
  }

  return normalizeGeneratedRecipes(data);
}

export { normalizeGeneratedRecipes };

async function getFunctionError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const payload = await readFunctionErrorPayload(error.context);

    if (isRecord(payload) && typeof payload.error === 'string') {
      return new RecipeGenerationError(payload.error, {
        code: typeof payload.code === 'string' ? payload.code : undefined,
        retryAfterSeconds: typeof payload.retryAfterSeconds === 'number' ? payload.retryAfterSeconds : undefined,
      });
    }

    if (typeof payload === 'string' && payload.trim()) {
      return new Error(payload);
    }
  }

  return error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export {
  getRecipeGenerationErrorKey,
  getRecipeGenerationErrorMessage,
  RecipeGenerationError,
} from '@/lib/recipes/recipe-generation-errors';
