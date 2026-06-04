import { createOpenAICompatibleProvider } from './openai-compatible.ts';

export const deepSeekProvider = createOpenAICompatibleProvider({
  apiKeyEnv: 'DEEPSEEK_API_KEY',
  baseUrlEnv: 'DEEPSEEK_BASE_URL',
  defaultBaseUrl: 'https://api.deepseek.com',
  defaultModel: 'deepseek-v4-flash',
  maxOutputTokensEnv: 'DEEPSEEK_MAX_OUTPUT_TOKENS',
  modelEnv: 'DEEPSEEK_MODEL',
  name: 'deepseek',
  temperatureEnv: 'DEEPSEEK_TEMPERATURE',
});

export const generateWithDeepSeek = deepSeekProvider.generate;
export const translateTermsWithDeepSeek = deepSeekProvider.translateTerms;
export const translateWithDeepSeek = deepSeekProvider.translateRecipes;
