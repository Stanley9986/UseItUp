import { FoodImageProvider } from './types.ts';

export const openAIImageProvider: FoodImageProvider = {
  name: 'openai',
  search: async () => {
    throw new Error(
      'OpenAI image provider needs Supabase Storage support before it can return stable image URLs.',
    );
  },
};
