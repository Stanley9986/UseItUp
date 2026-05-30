import { generateWithGemini } from './gemini.ts';
import { generateWithOpenAI } from './openai.ts';
import { RecipeProvider } from './types.ts';

const providers: Record<string, RecipeProvider> = {
  gemini: {
    generate: generateWithGemini,
    name: 'gemini',
  },
  openai: {
    generate: generateWithOpenAI,
    name: 'openai',
  },
};

export function getRecipeProvider(name = 'gemini') {
  return providers[name] ?? providers.gemini;
}
