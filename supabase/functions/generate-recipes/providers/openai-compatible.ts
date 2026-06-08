import { RecipePrompt, TermsPrompt, TranslationPrompt } from '../shared/prompt.ts';
import { createProviderError, ProviderError } from '../shared/provider-errors.ts';
import { fetchWithTimeout } from '../shared/request.ts';
import { recipeSchema, termsSchema, translationSchema } from '../shared/schema.ts';
import { RecipeProvider } from './types.ts';

type OpenAICompatibleConfig = {
  apiKeyEnv: string;
  baseUrlEnv: string;
  defaultBaseUrl: string;
  defaultModel: string;
  maxOutputTokensEnv: string;
  modelEnv: string;
  name: string;
  temperatureEnv: string;
};

type JsonRequest = {
  prompt: {
    systemInstruction: string;
    userPayload: unknown;
  };
  responseSchema: unknown;
  temperature?: number;
};

export function createOpenAICompatibleProvider(config: OpenAICompatibleConfig): RecipeProvider {
  return {
    generate: (prompt: RecipePrompt) =>
      requestOpenAICompatibleJson(config, {
        prompt,
        responseSchema: recipeSchema,
      }),
    name: config.name,
    translateRecipes: (prompt: TranslationPrompt) =>
      requestOpenAICompatibleJson(config, {
        prompt,
        responseSchema: translationSchema,
        temperature: 0.2,
      }),
    translateTerms: (prompt: TermsPrompt) =>
      requestOpenAICompatibleJson(config, {
        prompt,
        responseSchema: termsSchema,
        temperature: 0.2,
      }),
  };
}

async function requestOpenAICompatibleJson(
  config: OpenAICompatibleConfig,
  { prompt, responseSchema, temperature }: JsonRequest,
) {
  const apiKey = Deno.env.get(config.apiKeyEnv);

  if (!apiKey) {
    throw new ProviderError(`Missing ${config.apiKeyEnv} secret`, 'invalid_api_key');
  }

  const baseUrl = normalizeBaseUrl(Deno.env.get(config.baseUrlEnv) ?? config.defaultBaseUrl);
  const model = Deno.env.get(config.modelEnv) ?? config.defaultModel;
  const maxTokens = readPositiveInteger(Deno.env.get(config.maxOutputTokensEnv), 8192);
  const resolvedTemperature =
    typeof temperature === 'number'
      ? temperature
      : readTemperature(Deno.env.get(config.temperatureEnv), 0.7);

  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      max_tokens: maxTokens,
      messages: [
        {
          content: [
            prompt.systemInstruction,
            'Return only valid JSON. Match this JSON schema exactly:',
            JSON.stringify(responseSchema),
          ].join(' '),
          role: 'system',
        },
        {
          content: JSON.stringify(prompt.userPayload),
          role: 'user',
        },
      ],
      model,
      response_format: { type: 'json_object' },
      temperature: resolvedTemperature,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw createProviderError(data?.error?.message ?? `${config.name} request failed`, response.status);
  }

  const outputText = data?.choices?.[0]?.message?.content;

  if (typeof outputText !== 'string' || !outputText.trim()) {
    throw new Error(`${config.name} returned no content`);
  }

  try {
    return JSON.parse(outputText);
  } catch {
    throw new Error(`${config.name} returned invalid JSON`);
  }
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

export function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function readTemperature(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 2 ? parsed : fallback;
}
