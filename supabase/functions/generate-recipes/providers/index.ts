import { deepSeekProvider } from './deepseek.ts';
import { geminiProvider } from './gemini.ts';
import { openAIProvider } from './openai.ts';
import { RecipeProvider } from './types.ts';

const providers: Record<string, RecipeProvider> = {
  deepseek: deepSeekProvider,
  gemini: geminiProvider,
  openai: openAIProvider,
};

export function getRecipeProvider(name = 'gemini') {
  return providers[normalizeProviderName(name)] ?? providers.gemini;
}

export function getTranslationProvider(name: string | undefined, fallbackName = 'gemini') {
  return getRecipeProvider(name || fallbackName);
}

// Ordered list of providers to try: the primary first, then the configured
// fallbacks. Deduped by resolved provider name so repeats and unknown names
// (which resolve to the default) collapse.
export function buildProviderChain(primaryName: string, fallbackNames: string[] = []): RecipeProvider[] {
  const seen = new Set<string>();
  const chain: RecipeProvider[] = [];

  for (const name of [primaryName, ...fallbackNames]) {
    if (!name || !name.trim()) {
      continue;
    }

    const provider = getRecipeProvider(name);

    if (!seen.has(provider.name)) {
      seen.add(provider.name);
      chain.push(provider);
    }
  }

  if (!chain.length) {
    chain.push(getRecipeProvider());
  }

  return chain;
}

// Try each provider in order; return the first success along with which provider
// produced it (used to record the source in the cache). Throws the last error if
// they all fail.
export async function callWithFallback<T>(
  chain: RecipeProvider[],
  call: (provider: RecipeProvider) => Promise<T>,
): Promise<{ result: T; providerName: string }> {
  let lastError: unknown;

  for (const provider of chain) {
    try {
      return { result: await call(provider), providerName: provider.name };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All providers failed');
}

function normalizeProviderName(name: string) {
  return name.trim().toLowerCase();
}
