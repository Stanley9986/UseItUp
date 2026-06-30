import { IntakePrompt, RecipePrompt, TermsPrompt, TranslationPrompt } from '../shared/prompt.ts';
import { createProviderError, ProviderError } from '../shared/provider-errors.ts';
import { fetchWithTimeout } from '../shared/request.ts';
import { intakeSchema, recipeSchema, termsSchema, translationSchema } from '../shared/schema.ts';
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
    generateStream: (prompt: RecipePrompt) => streamOpenAICompatibleText(config, prompt),
    name: config.name,
    parseIntake: (prompt: IntakePrompt) =>
      requestOpenAICompatibleJson(config, {
        prompt,
        responseSchema: intakeSchema,
        temperature: 0.3,
      }),
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
      messages: buildChatMessages(prompt, responseSchema),
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

// Streams recipe JSON via the OpenAI-compatible SSE chat endpoint (DeepSeek,
// OpenAI, and other compatible providers). Yields each delta's text so the caller
// can feed the incremental recipe parser. Uses plain fetch (no request timeout)
// because the connection stays open for the whole generation.
export async function* streamOpenAICompatibleText(
  config: OpenAICompatibleConfig,
  prompt: RecipePrompt,
): AsyncGenerator<string> {
  const apiKey = Deno.env.get(config.apiKeyEnv);

  if (!apiKey) {
    throw new ProviderError(`Missing ${config.apiKeyEnv} secret`, 'invalid_api_key');
  }

  const baseUrl = normalizeBaseUrl(Deno.env.get(config.baseUrlEnv) ?? config.defaultBaseUrl);
  const model = Deno.env.get(config.modelEnv) ?? config.defaultModel;
  const maxTokens = readPositiveInteger(Deno.env.get(config.maxOutputTokensEnv), 8192);
  const temperature = readTemperature(Deno.env.get(config.temperatureEnv), 0.7);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      max_tokens: maxTokens,
      messages: buildChatMessages(prompt, recipeSchema),
      model,
      response_format: { type: 'json_object' },
      stream: true,
      temperature,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null);

    throw createProviderError(
      data?.error?.message ?? `${config.name} stream request failed`,
      response.status,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf('\n');

    while (newlineIndex !== -1) {
      const text = deltaFromSseLine(buffer.slice(0, newlineIndex).trim());
      buffer = buffer.slice(newlineIndex + 1);

      if (text) {
        yield text;
      }

      newlineIndex = buffer.indexOf('\n');
    }
  }

  const finalText = deltaFromSseLine(buffer.trim());

  if (finalText) {
    yield finalText;
  }
}

function deltaFromSseLine(line: string): string {
  if (!line.startsWith('data:')) {
    return '';
  }

  const payload = line.slice('data:'.length).trim();

  if (!payload || payload === '[DONE]') {
    return '';
  }

  try {
    const chunk = JSON.parse(payload);
    const content = chunk?.choices?.[0]?.delta?.content;

    return typeof content === 'string' ? content : '';
  } catch {
    return '';
  }
}

function buildChatMessages(
  prompt: { systemInstruction: string; userPayload: unknown },
  responseSchema: unknown,
) {
  return [
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
  ];
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
