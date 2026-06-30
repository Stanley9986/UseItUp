// @ts-nocheck
import { corsHeaders, jsonResponse } from './shared/http.ts';
import {
  createIntakePrompt,
  createRecipePrompt,
  createTermsPrompt,
  createTranslationPrompt,
  normalizeLanguageCode,
  sanitizeTranslationRecipe,
} from './shared/prompt.ts';
import { buildProviderChain, callWithFallback } from './providers/index.ts';
import { createRecipeStreamParser } from './shared/recipe-stream.ts';
import { getPublicProviderError, isRetryableProviderError } from './shared/provider-errors.ts';
import { checkRateLimit, getJwtSubjectFromRequest, readPositiveIntegerEnv } from './shared/rate-limit.ts';
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

  const requestSubject = getJwtSubjectFromRequest(request);
  const body = await request.json().catch(() => null);

  // Translate-on-view: clients send recipe content (recipes) or short item
  // names (terms) plus the target language and get back translations cached in
  // recipe_translations.
  if (isRecord(body?.translate)) {
    const translateInput = body.translate;

    if (Array.isArray(translateInput.terms)) {
      return handleTranslateTerms(translateInput, requestSubject);
    }

    return handleTranslate(translateInput, requestSubject);
  }

  // Natural-language pantry intake: clients send a free-text description and get
  // back structured item drafts to confirm before saving.
  if (isRecord(body?.intake)) {
    return handleIntake(body.intake, requestSubject);
  }

  const pantryItems = Array.isArray(body?.pantryItems) ? body.pantryItems : [];

  if (!pantryItems.length) {
    return jsonResponse({ recipes: [] });
  }

  const generationLimit = await checkRateLimit({
    key: `generate-recipes:generation:${requestSubject}`,
    limit: getGenerationRateLimit(),
  });

  if (!generationLimit.allowed) {
    return rateLimitResponse('generation_rate_limited', generationLimit.retryAfterSeconds);
  }

  const prompt = createRecipePrompt({
    pantryItems,
    preferences: body?.preferences ?? {
      maxPrepTimeMinutes: 30,
      prioritizeExpiringSoon: true,
    },
  });

  // Streaming clients get recipes one at a time as NDJSON so the UI can render
  // cards progressively instead of waiting for the whole batch.
  if (body?.stream === true) {
    return streamGenerationResponse(prompt);
  }

  try {
    const { result: recipes } = await callWithFallback(getGenerationChain(), (provider) =>
      provider.generate(prompt),
    );

    return jsonResponse(recipes);
  } catch (error) {
    const publicError = getPublicProviderError(error, 'Recipe generation');

    return jsonResponse(
      {
        code: publicError.code,
        error: publicError.error,
      },
      publicError.status,
    );
  }
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function handleTranslate(input: Record<string, unknown>, requestSubject: string) {
  const targetLanguage = normalizeLanguageCode(input.targetLanguage);
  const sources = Array.isArray(input.recipes) ? input.recipes.map(sanitizeTranslationRecipe) : [];

  if (!sources.length) {
    return jsonResponse({ error: 'Nothing to translate' }, 400);
  }

  // Resolve every recipe from cache first; only the misses go to the configured
  // translation provider, and they go in a single batched call.
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
    const translationLimit = await checkRateLimit({
      key: `generate-recipes:translation:${requestSubject}`,
      limit: getTranslationRateLimit(),
    });

    if (!translationLimit.allowed) {
      return rateLimitResponse('translation_rate_limited', translationLimit.retryAfterSeconds);
    }

    try {
      const { result, providerName } = await callWithFallback(getTranslationChain(), (provider) =>
        provider.translateRecipes(createTranslationPrompt({ targetLanguage, recipes: missSources })),
      );
      const translated = Array.isArray(result?.recipes) ? result.recipes : [];
      missTranslations = missSources.map((source, index) => buildTranslation(source, translated[index]));

      await Promise.all(
        missIndexes.map((sourceIndex, missIndex) =>
          cacheTranslation(hashes[sourceIndex], targetLanguage, missTranslations[missIndex], providerName),
        ),
      );
    } catch (error) {
      const publicError = getPublicProviderError(error, 'Recipe translation');

      return jsonResponse(
        { code: publicError.code, error: publicError.error },
        publicError.status,
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

async function handleTranslateTerms(input: Record<string, unknown>, requestSubject: string) {
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
    const translationLimit = await checkRateLimit({
      key: `generate-recipes:translation:${requestSubject}`,
      limit: getTranslationRateLimit(),
    });

    if (!translationLimit.allowed) {
      return rateLimitResponse('translation_rate_limited', translationLimit.retryAfterSeconds);
    }

    try {
      const { result, providerName } = await callWithFallback(getTranslationChain(), (provider) =>
        provider.translateTerms(createTermsPrompt({ targetLanguage, terms: missTerms })),
      );
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
          await cacheTerm(hashes[missIndexes[missIndex]], targetLanguage, translation, providerName);
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

async function handleIntake(input: Record<string, unknown>, requestSubject: string) {
  const text = typeof input.text === 'string' ? input.text.trim() : '';

  if (!text) {
    return jsonResponse({ items: [] });
  }

  const intakeLimit = await checkRateLimit({
    key: `generate-recipes:intake:${requestSubject}`,
    limit: getIntakeRateLimit(),
  });

  if (!intakeLimit.allowed) {
    return rateLimitResponse('intake_rate_limited', intakeLimit.retryAfterSeconds);
  }

  try {
    const { result } = await callWithFallback(getGenerationChain(), (provider) =>
      provider.parseIntake(createIntakePrompt({ text, targetLanguage: input.targetLanguage })),
    );
    const items = Array.isArray(result?.items) ? result.items : [];

    return jsonResponse({ items });
  } catch (error) {
    const publicError = getPublicProviderError(error, 'Item parsing');

    return jsonResponse({ code: publicError.code, error: publicError.error }, publicError.status);
  }
}

function rateLimitResponse(
  code: 'generation_rate_limited' | 'translation_rate_limited' | 'intake_rate_limited',
  retryAfterSeconds = 0,
) {
  const error = {
    generation_rate_limited: 'Recipe generation is temporarily limited. Please try again later.',
    translation_rate_limited: 'Translation is temporarily limited. Please try again later.',
    intake_rate_limited: 'Item parsing is temporarily limited. Please try again later.',
  }[code];

  return jsonResponse(
    {
      code,
      error,
      retryAfterSeconds,
    },
    429,
  );
}

// Per-user hourly ceilings tuned for abuse prevention, not normal usage: a real
// user exploring recipes, switching languages, or adding groceries should never
// hit these, while a runaway client or scripted abuse is still capped. Override
// per environment with the matching secret.
function getGenerationRateLimit() {
  return readPositiveIntegerEnv('GENERATION_RATE_LIMIT_PER_HOUR', 30);
}

function getIntakeRateLimit() {
  return readPositiveIntegerEnv('INTAKE_RATE_LIMIT_PER_HOUR', 60);
}

function getTranslationRateLimit() {
  return readPositiveIntegerEnv('TRANSLATION_RATE_LIMIT_PER_HOUR', 240);
}

async function getCachedTerm(sourceHash: string, targetLanguage: string) {
  const record = await readCacheRow(sourceHash, targetLanguage, 'title');

  return record && typeof record.title === 'string' ? record.title : null;
}

async function cacheTerm(sourceHash: string, targetLanguage: string, translation: string, provider: string) {
  await upsertCacheRow({
    source_hash: sourceHash,
    target_language: targetLanguage,
    title: translation,
    provider,
    updated_at: new Date().toISOString(),
  });
}

function parseFallbackOrder() {
  return (Deno.env.get('PROVIDER_FALLBACK_ORDER') ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name && name.toLowerCase() !== 'none');
}

function getGenerationChain() {
  return buildProviderChain(Deno.env.get('AI_PROVIDER') ?? 'gemini', parseFallbackOrder());
}

// Emits recipes as newline-delimited JSON: a `status` event, one `recipe` event
// per recipe, then `done` (or `error`). Provider-agnostic: it walks the same
// generation chain used elsewhere and asks each provider that supports streaming
// (Gemini, DeepSeek, OpenAI, ...) to stream, with retryable fallback to the next.
// If no provider streams, it falls back to a buffered generation and emits that
// batch, so switching AI_PROVIDER needs no code change here.
function streamGenerationResponse(prompt) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      let emittedAny = false;

      try {
        emit({ type: 'status', stage: 'generating' });

        const chain = getGenerationChain();

        for (const provider of chain) {
          if (typeof provider.generateStream !== 'function') {
            continue;
          }

          const parser = createRecipeStreamParser();

          try {
            for await (const text of provider.generateStream(prompt)) {
              for (const recipe of parser.push(text)) {
                emittedAny = true;
                emit({ type: 'recipe', recipe });
              }
            }

            // This provider streamed to completion.
            break;
          } catch (streamError) {
            // Once recipes have gone out we cannot cleanly restart on another
            // provider; surface the error. Otherwise only a retryable failure
            // moves on to the next streaming provider.
            if (emittedAny || !isRetryableProviderError(streamError)) {
              throw streamError;
            }
          }
        }

        // No provider streamed anything: fall back to a single buffered batch.
        if (!emittedAny) {
          const { result } = await callWithFallback(chain, (provider) => provider.generate(prompt));
          const recipes = Array.isArray(result?.recipes) ? result.recipes : [];

          for (const recipe of recipes) {
            emittedAny = true;
            emit({ type: 'recipe', recipe });
          }
        }

        emit({ type: 'done' });
      } catch (error) {
        const publicError = getPublicProviderError(error, 'Recipe generation');

        emit({ type: 'error', code: publicError.code, error: publicError.error });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  });
}

function getTranslationChain() {
  const primary = Deno.env.get('TRANSLATION_PROVIDER') || Deno.env.get('AI_PROVIDER') || 'gemini';

  return buildProviderChain(primary, parseFallbackOrder());
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
  provider: string,
) {
  await upsertCacheRow({
    source_hash: sourceHash,
    target_language: targetLanguage,
    title: translation.title,
    description: translation.description,
    instructions: translation.instructions,
    ingredient_names: translation.ingredientNames,
    provider,
    updated_at: new Date().toISOString(),
  });
}
