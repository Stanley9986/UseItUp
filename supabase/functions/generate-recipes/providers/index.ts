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

function normalizeProviderName(name: string) {
  return name.trim().toLowerCase();
}
