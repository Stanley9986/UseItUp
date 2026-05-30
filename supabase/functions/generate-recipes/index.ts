// @ts-nocheck
import { corsHeaders, jsonResponse } from './shared/http.ts';
import { createRecipePrompt } from './shared/prompt.ts';
import { getRecipeProvider } from './providers/index.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const body = await request.json().catch(() => null);
  const pantryItems = Array.isArray(body?.pantryItems) ? body.pantryItems : [];

  if (!pantryItems.length) {
    return jsonResponse({ recipes: [] });
  }

  const prompt = createRecipePrompt({
    pantryItems,
    preferences: body?.preferences ?? {
      maxPrepTimeMinutes: 30,
      prioritizeExpiringSoon: true,
    },
  });

  const provider = getRecipeProvider(Deno.env.get('AI_PROVIDER') ?? 'gemini');

  try {
    const recipes = await provider.generate(prompt);

    return jsonResponse(recipes);
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Recipe generation failed',
      },
      500,
    );
  }
});
