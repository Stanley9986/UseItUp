// @ts-nocheck
import { corsHeaders, jsonResponse } from './shared/http.ts';
import {
  createRecipePrompt,
  createTermsPrompt,
  createTranslationPrompt,
  normalizeLanguageCode,
  sanitizeTranslationRecipe,
} from './shared/prompt.ts';
import { getRecipeProvider } from './providers/index.ts';
import { translateTermsWithGemini, translateWithGemini } from './providers/gemini.ts';
import {
  buildIngredientNameMap,
  hashRecipeSource,
  hashTerm,
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

  // Translate-on-view: clients send recipe content (recipes) or short item
  // names (terms) plus the target language and get back translations cached in
  // recipe_translations.
  if (isRecord(body?.translate)) {
    const translateInput = body.translate;

    if (Array.isArray(translateInput.terms)) {
      return handleTranslateTerms(translateInput);
    }

    return handleTranslate(translateInput);
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

async function handleTranslateTerms(input: Record<string, unknown>) {
  const targetLanguage = normalizeLanguageCode(input.targetLanguage);
  const terms = Array.isArray(input.terms)
    ? input.terms.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];

  if (!terms.length) {
    return jsonResponse({ terms: {} });
  }

  // Translate each distinct name once; map back to the original inputs at the end.
  const uniqueTerms = Array.from(new Set(terms.map((term) => term.trim())));
  const hashes = await Promise.all(uniqueTerms.map(hashTerm));
  const cached = await Promise.all(hashes.map((hash) => getCachedTerm(hash, targetLanguage)));

  const resolved: Record<string, string> = {};
  const missTerms: string[] = [];
  const missIndexes: number[] = [];

  cached.forEach((translation, index) => {
    if (typeof translation === 'string') {
      resolved[uniqueTerms[index]] = translation;
    } else {
      missTerms.push(uniqueTerms[index]);
      missIndexes.push(index);
    }
  });

  if (missTerms.length) {
    try {
      const result = await translateTermsWithGemini(createTermsPrompt({ targetLanguage, terms: missTerms }));
      const pairs = Array.isArray(result?.terms) ? result.terms : [];
      const bySource: Record<string, string> = {};

      pairs.forEach((pair: unknown) => {
        if (
          pair &&
          typeof pair === 'object' &&
          typeof (pair as Record<string, unknown>).source === 'string' &&
          typeof (pair as Record<string, unknown>).translation === 'string'
        ) {
          bySource[(pair as Record<string, string>).source.trim()] = (pair as Record<string, string>).translation;
        }
      });

      await Promise.all(
        missTerms.map(async (term, missIndex) => {
          const translation = bySource[term] ?? term;
          resolved[term] = translation;
          await cacheTerm(hashes[missIndexes[missIndex]], targetLanguage, translation);
        }),
      );
    } catch {
      // On failure, fall back to the original names rather than erroring.
      missTerms.forEach((term) => {
        resolved[term] = term;
      });
    }
  }

  const termsOut: Record<string, string> = {};
  terms.forEach((term) => {
    termsOut[term] = resolved[term.trim()] ?? term;
  });

  return jsonResponse({ terms: termsOut });
}

async function getCachedTerm(sourceHash: string, targetLanguage: string) {
  const record = await readCacheRow(sourceHash, targetLanguage, 'title');

  return record && typeof record.title === 'string' ? record.title : null;
}

async function cacheTerm(sourceHash: string, targetLanguage: string, translation: string) {
  await upsertCacheRow({
    source_hash: sourceHash,
    target_language: targetLanguage,
    title: translation,
    provider: 'gemini',
    updated_at: new Date().toISOString(),
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

// Shared recipe_translations read/write. Both recipe and term translations are
// content-addressed by (source_hash, target_language) in this one table.
async function readCacheRow(sourceHash: string, targetLanguage: string, select: string) {
  const config = getTranslationCacheConfig();

  if (!config) {
    return null;
  }

  const url = new URL(config.restUrl);
  url.searchParams.set('source_hash', `eq.${sourceHash}`);
  url.searchParams.set('target_language', `eq.${targetLanguage}`);
  url.searchParams.set('select', select);
  url.searchParams.set('limit', '1');

  try {
    const response = await fetch(url, { headers: config.headers });

    if (!response.ok) {
      return null;
    }

    const records = await response.json();

    return Array.isArray(records) ? records[0] ?? null : null;
  } catch {
    return null;
  }
}

async function upsertCacheRow(row: Record<string, unknown>) {
  const config = getTranslationCacheConfig();

  if (!config) {
    return;
  }

  const url = new URL(config.restUrl);
  url.searchParams.set('on_conflict', 'source_hash,target_language');

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        ...config.headers,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
    });
  } catch {
    // Cache writes must not block returning the translation.
  }
}

async function getCachedTranslation(sourceHash: string, targetLanguage: string) {
  const record = await readCacheRow(
    sourceHash,
    targetLanguage,
    'title,description,instructions,ingredient_names',
  );

  return { translation: record ? mapTranslationRecord(record) : null };
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
  await upsertCacheRow({
    source_hash: sourceHash,
    target_language: targetLanguage,
    title: translation.title,
    description: translation.description,
    instructions: translation.instructions,
    ingredient_names: translation.ingredientNames,
    provider: 'gemini',
    updated_at: new Date().toISOString(),
  });
}
