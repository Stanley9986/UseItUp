import { openAIImageProvider } from './openai.ts';
import { pexelsImageProvider } from './pexels.ts';
import { FoodImageProvider } from './types.ts';

const providers: Record<string, FoodImageProvider> = {
  openai: openAIImageProvider,
  pexels: pexelsImageProvider,
};

export function getImageProvider(name = 'pexels') {
  return providers[name.trim().toLowerCase()] ?? providers.pexels;
}
