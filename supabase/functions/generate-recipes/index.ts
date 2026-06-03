// @ts-nocheck
import { corsHeaders, jsonResponse } from './shared/http.ts';
import {
  createRecipePrompt,
  createTranslationPrompt,
  normalizeLanguageCode,
  sanitizeTranslationRecipe,
} from './shared/prompt.ts';
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
  const sources = Array.isArray(input.recipes) ? input.recipes.map(sanitizeTranslationRecipe) : [];

  if (!sources.length) {
    return jsonResponse({ error: 'Nothing to translate' }, 400);
  }

  // Resolve every recipe from cache first; only the misses go to Gemini, and
  // they go in a single batched call.
  const hashes = await Promise.all(sources.map(hashRecipeSource));
  const cached = await Promise.all(hashes.map((hash) => getCachedTranslation(hash, targetLanguage)));

  const missIndexes = [];
  const missSources = [];
  cached.forEach((entry, index) => {
    if (!entry.translation) {
      missIndexes.push(index);
      missSources.push(sources[index]);
    }
  });

  let missTranslations = [];

  if (missSources.length) {
    try {
      const result = await translateWithGemini(
        createTranslationPrompt({ targetLanguage, recipes: missSources }),
      );
      const translated = Array.isArray(result?.recipes) ? result.recipes : [];
      missTranslations = missSources.map((source, index) => buildTranslation(source, translated[index]));

      await Promise.all(
        missIndexes.map((sourceIndex, missIndex) =>
          cacheTranslation(hashes[sourceIndex], targetLanguage, missTranslations[missIndex]),
        ),
      );
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : 'Recipe translation failed' },
        500,
      );
    }
  }

  const translations = sources.map((_source, index) => {
    const hit = cached[index].translation;

    return hit ?? missTranslations[missIndexes.indexOf(index)];
  });

  return jsonResponse({
    translations,
    cache: {
      hits: sources.length - missSources.length,
      misses: missSources.length,
    },
  });
}

function buildTranslation(source, translated) {
  const record = translated && typeof translated === 'object' ? translated : {};

  return {
    title: typeof record.title === 'string' ? record.title : source.title,
    description: typeof record.description === 'string' ? record.description : source.description,
    instructions: Array.isArray(record.instructions)
      ? record.instructions.filter((value: unknown) => typeof value === 'string')
      : source.instructions,
    ingredientNames: buildIngredientNameMap(
      source.ingredientNames,
      Array.isArray(record.ingredientNames) ? record.ingredientNames : [],
    ),
  };
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
