import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { normalizeGeneratedRecipes } from '@/lib/recipe-generation-mappers';
import { GenerateRecipesRequest, GenerateRecipesResponse } from '@/types/recipe-generation';

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
    const payload = await error.context.json().catch(() => null);

    if (isRecord(payload) && typeof payload.error === 'string') {
      return new Error(payload.error);
    }
  }

  return error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
