import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

type TermsResponse = {
  terms?: Record<string, string>;
};

type ClientTermCacheEntry = {
  translation: string;
  expiresAt: string;
};

const termCachePrefix = 'useitup:term-translation-cache:v1:';
const termCacheTtlMs = 30 * 24 * 60 * 60 * 1000;
const memoryTermCache = new Map<string, ClientTermCacheEntry>();

function normalizeTerm(term: string) {
  return term.trim().toLowerCase();
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
    const cached = await getCachedTerm(term, targetLanguage);

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
          await setCachedTerm(term, targetLanguage, translation);
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

export function clearTermTranslationClientCache() {
  memoryTermCache.clear();
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

async function getCachedTerm(term: string, targetLanguage: string) {
  const key = getCacheKey(term, targetLanguage);
  const memoryEntry = memoryTermCache.get(key);

  if (memoryEntry && isFreshCacheEntry(memoryEntry)) {
    return memoryEntry.translation;
  }

  if (memoryEntry) {
    memoryTermCache.delete(key);
  }

  try {
    const raw = await AsyncStorage.getItem(getStorageKey(term, targetLanguage));
    const entry = parseCacheEntry(raw);

    if (!entry) {
      return null;
    }

    if (!isFreshCacheEntry(entry)) {
      await AsyncStorage.removeItem(getStorageKey(term, targetLanguage));
      return null;
    }

    memoryTermCache.set(key, entry);

    return entry.translation;
  } catch {
    return null;
  }
}

async function setCachedTerm(term: string, targetLanguage: string, translation: string) {
  const entry: ClientTermCacheEntry = {
    translation,
    expiresAt: new Date(Date.now() + termCacheTtlMs).toISOString(),
  };

  memoryTermCache.set(getCacheKey(term, targetLanguage), entry);

  try {
    await AsyncStorage.setItem(getStorageKey(term, targetLanguage), JSON.stringify(entry));
  } catch {
    // Local cache writes should not block rendering translated names.
  }
}

function getCacheKey(term: string, targetLanguage: string) {
  return `${normalizeTerm(term)}:${targetLanguage}`;
}

function getStorageKey(term: string, targetLanguage: string) {
  return `${termCachePrefix}${encodeURIComponent(getCacheKey(term, targetLanguage))}`;
}

function isFreshCacheEntry(entry: ClientTermCacheEntry) {
  return new Date(entry.expiresAt).getTime() > Date.now();
}

function parseCacheEntry(raw: string | null): ClientTermCacheEntry | null {
  if (!raw) {
    return null;
  }

  try {
    const entry = JSON.parse(raw) as Partial<ClientTermCacheEntry>;

    if (!entry.expiresAt || typeof entry.translation !== 'string') {
      return null;
    }

    return {
      translation: entry.translation,
      expiresAt: entry.expiresAt,
    };
  } catch {
    return null;
  }
}
