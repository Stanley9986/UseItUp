import { RecipePrompt } from '../shared/prompt.ts';

export async function generateWithOpenAI(_prompt: RecipePrompt) {
  throw new Error('OpenAI provider is not enabled yet. Set AI_PROVIDER=gemini or implement providers/openai.ts.');
}
