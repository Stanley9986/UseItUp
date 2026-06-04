import { createClientCache } from '@/lib/shared/client-cache';
import { supabase } from '@/lib/shared/supabase';

type TermsResponse = {
  terms?: Record<string, string>;
};

const termCache = createClientCache<string>({
  prefix: 'useitup:term-translation-cache:v1:',
  ttlMs: 30 * 24 * 60 * 60 * 1000,
  isValid: (value) => typeof value === 'string',
});

function normalizeTerm(term: string) {
  return term.trim().toLowerCase();
}

function cacheKey(term: string, targetLanguage: string) {
  return `${normalizeTerm(term)}:${targetLanguage}`;
}

// Translate short item/ingredient names into the target language, returned as a
// map keyed by the original input name. Cache hits are served locally; misses go
// to the batched terms endpoint in a single call.
export async function translateTerms(
  names: string[],
  targetLanguage: string,
): Promise<Record<string, string>> {
  const cleaned = names.filter((name) => typeof name === 'string' && name.trim().length > 0);

  if (!cleaned.length) {
    return {};
  }

  const unique = Array.from(new Set(cleaned.map((name) => name.trim())));
  const resolved: Record<string, string> = {};
  const uncached: string[] = [];

  for (const term of unique) {
    const cached = await termCache.get(cacheKey(term, targetLanguage));

    if (cached != null) {
      resolved[term] = cached;
    } else {
      uncached.push(term);
    }
  }

  if (uncached.length) {
    const fetched = await fetchTerms(uncached, targetLanguage);

    await Promise.all(
      uncached.map(async (term) => {
        const translation = fetched[term];

        if (typeof translation === 'string') {
          resolved[term] = translation;
          await termCache.set(cacheKey(term, targetLanguage), translation);
        }
      }),
    );
  }

  const out: Record<string, string> = {};
  names.forEach((name) => {
    if (typeof name === 'string') {
      out[name] = resolved[name.trim()] ?? name;
    }
  });

  return out;
}

async function fetchTerms(terms: string[], targetLanguage: string) {
  const { data, error } = await supabase.functions.invoke<TermsResponse>('generate-recipes', {
    body: { translate: { targetLanguage, terms } },
  });

  if (error || !data?.terms || typeof data.terms !== 'object') {
    return {} as Record<string, string>;
  }

  return data.terms;
}
