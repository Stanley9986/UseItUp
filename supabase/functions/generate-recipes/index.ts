// @ts-nocheck
import { corsHeaders, jsonResponse } from './shared/http.ts';
import { createRecipePrompt, createTranslationPrompt, normalizeLanguageCode } from './shared/prompt.ts';
import { getRecipeProvider } from './providers/index.ts';
import { translateWithGemini } from './providers/gemini.ts';
import {
  buildIngredientNameMap,
  hashRecipeSource,
  mapTranslationRecord,
} from './shared/translation-cache.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const body = await request.json().catch(() => null);

  // Translate-on-view: clients send a recipe's stored content plus the target
  // language and get back translated content (cached in recipe_translations).
  if (isRecord(body?.translate)) {
    return handleTranslate(body.translate);
  }

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function handleTranslate(input: Record<string, unknown>) {
  const targetLanguage = normalizeLanguageCode(input.targetLanguage);
  const source = {
    title: typeof input.title === 'string' ? input.title : '',
    description: typeof input.description === 'string' ? input.description : '',
    instructions: Array.isArray(input.instructions)
      ? input.instructions.filter((value) => typeof value === 'string')
      : [],
    ingredientNames: Array.isArray(input.ingredientNames)
      ? input.ingredientNames.filter((value) => typeof value === 'string')
      : [],
  };

  if (!source.title && !source.description && !source.instructions.length && !source.ingredientNames.length) {
    return jsonResponse({ error: 'Nothing to translate' }, 400);
  }

  const sourceHash = await hashRecipeSource(source);
  const cached = await getCachedTranslation(sourceHash, targetLanguage);

  if (cached.translation) {
    return jsonResponse({
      translation: cached.translation,
      source: 'cache',
      cache: { status: cached.status },
    });
  }

  try {
    const result = await translateWithGemini(createTranslationPrompt({ targetLanguage, ...source }));
    const translation = {
      title: typeof result?.title === 'string' ? result.title : source.title,
      description: typeof result?.description === 'string' ? result.description : source.description,
      instructions: Array.isArray(result?.instructions)
        ? result.instructions.filter((value: unknown) => typeof value === 'string')
        : source.instructions,
      ingredientNames: buildIngredientNameMap(
        source.ingredientNames,
        Array.isArray(result?.ingredientNames) ? result.ingredientNames : [],
      ),
    };

    const cacheStatus = await cacheTranslation(sourceHash, targetLanguage, translation);

    return jsonResponse({
      translation,
      source: 'gemini',
      cache: { status: `${cached.status}_${cacheStatus}` },
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Recipe translation failed' },
      500,
    );
  }
}

function getTranslationCacheConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    restUrl: `${supabaseUrl}/rest/v1/recipe_translations`,
  };
}

async function getCachedTranslation(sourceHash: string, targetLanguage: string) {
  const config = getTranslationCacheConfig();

  if (!config) {
    return { translation: null, status: 'disabled' };
  }

  const url = new URL(config.restUrl);
  url.searchParams.set('source_hash', `eq.${sourceHash}`);
  url.searchParams.set('target_language', `eq.${targetLanguage}`);
  url.searchParams.set('select', 'title,description,instructions,ingredient_names');
  url.searchParams.set('limit', '1');

  try {
    const response = await fetch(url, { headers: config.headers });

    if (!response.ok) {
      return { translation: null, status: `read_failed_${response.status}` };
    }

    const records = await response.json();
    const record = Array.isArray(records) ? records[0] : null;

    if (!record) {
      return { translation: null, status: 'miss' };
    }

    return { translation: mapTranslationRecord(record), status: 'hit' };
  } catch {
    return { translation: null, status: 'read_error' };
  }
}

async function cacheTranslation(
  sourceHash: string,
  targetLanguage: string,
  translation: {
    title: string;
    description: string;
    instructions: string[];
    ingredientNames: Record<string, string>;
  },
) {
  const config = getTranslationCacheConfig();

  if (!config) {
    return 'write_disabled';
  }

  const url = new URL(config.restUrl);
  url.searchParams.set('on_conflict', 'source_hash,target_language');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...config.headers,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        source_hash: sourceHash,
        target_language: targetLanguage,
        title: translation.title,
        description: translation.description,
        instructions: translation.instructions,
        ingredient_names: translation.ingredientNames,
        provider: 'gemini',
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      return `write_failed_${response.status}`;
    }

    return 'write_succeeded';
  } catch {
    // Cache writes must not block returning the translation.
    return 'write_error';
  }
}
