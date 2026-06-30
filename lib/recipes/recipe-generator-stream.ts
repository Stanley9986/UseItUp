import { fetch as expoFetch } from 'expo/fetch';

import { createLineBuffer } from '@/lib/recipes/ndjson';
import { normalizeGeneratedRecipes } from '@/lib/recipes/recipe-generation-mappers';
import { RecipeGenerationError } from '@/lib/recipes/recipe-generation-errors';
import { supabase } from '@/lib/shared/supabase';
import { GenerateRecipesRequest } from '@/types/recipe-generation';
import { Recipe } from '@/types/useitup';

export type RecipeStreamHandlers = {
  // Called with the cumulative, normalized, de-duplicated list every time a new
  // recipe arrives, so the UI can render cards progressively.
  onRecipes?: (recipes: Recipe[]) => void;
  onStatus?: (stage: string) => void;
};

type StreamEvent = {
  type?: string;
  stage?: string;
  recipe?: unknown;
  code?: string;
  error?: string;
};

// Streams recipe generation over NDJSON via expo/fetch (React Native's default
// fetch cannot read a streamed body). Falls back to a thrown RecipeGenerationError
// on an error event, mirroring the buffered generateRecipes contract. Resolves
// with the final normalized batch (same shape the non-streaming path returns).
export async function streamGenerateRecipes(
  request: GenerateRecipesRequest,
  handlers: RecipeStreamHandlers = {},
): Promise<Recipe[]> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new RecipeGenerationError('Missing Supabase configuration');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? anonKey;

  const response = await expoFetch(`${supabaseUrl}/functions/v1/generate-recipes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!response.ok || !response.body) {
    throw await readStreamError(response);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const lineBuffer = createLineBuffer();
  const rawRecipes: unknown[] = [];

  const handleLine = (line: string) => {
    const event = parseEvent(line);

    if (!event) {
      return;
    }

    if (event.type === 'recipe' && event.recipe && typeof event.recipe === 'object') {
      const recipe = event.recipe as Record<string, unknown>;

      // Give each streamed recipe a stable id so progressive re-renders do not
      // remount cards as later recipes arrive.
      if (recipe.id == null) {
        recipe.id = `streamed-${rawRecipes.length}`;
      }

      rawRecipes.push(recipe);
      handlers.onRecipes?.(normalizeGeneratedRecipes({ recipes: rawRecipes }));
    } else if (event.type === 'status' && typeof event.stage === 'string') {
      handlers.onStatus?.(event.stage);
    } else if (event.type === 'error') {
      throw new RecipeGenerationError(event.error ?? 'Recipe generation failed', {
        code: typeof event.code === 'string' ? event.code : undefined,
      });
    }
  };

  for (;;) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    for (const line of lineBuffer.push(decoder.decode(value, { stream: true }))) {
      handleLine(line);
    }
  }

  for (const line of lineBuffer.flush()) {
    handleLine(line);
  }

  return normalizeGeneratedRecipes({ recipes: rawRecipes });
}

function parseEvent(line: string): StreamEvent | null {
  try {
    return JSON.parse(line) as StreamEvent;
  } catch {
    return null;
  }
}

async function readStreamError(response: { text: () => Promise<string> }) {
  try {
    const text = await response.text();
    const payload = JSON.parse(text) as StreamEvent;

    if (payload?.error) {
      return new RecipeGenerationError(payload.error, {
        code: typeof payload.code === 'string' ? payload.code : undefined,
      });
    }
  } catch {
    // Fall through to the generic error below.
  }

  return new RecipeGenerationError('Recipe generation failed');
}
