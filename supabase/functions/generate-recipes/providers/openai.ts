import { createOpenAICompatibleProvider } from './openai-compatible.ts';

export const openAIProvider = createOpenAICompatibleProvider({
  apiKeyEnv: 'OPENAI_API_KEY',
  baseUrlEnv: 'OPENAI_BASE_URL',
  defaultBaseUrl: 'https://api.openai.com/v1',
  defaultModel: 'gpt-4.1-mini',
  maxOutputTokensEnv: 'OPENAI_MAX_OUTPUT_TOKENS',
  modelEnv: 'OPENAI_MODEL',
  name: 'openai',
  temperatureEnv: 'OPENAI_TEMPERATURE',
});

export const generateWithOpenAI = openAIProvider.generate;
export const translateTermsWithOpenAI = openAIProvider.translateTerms;
export const translateWithOpenAI = openAIProvider.translateRecipes;
