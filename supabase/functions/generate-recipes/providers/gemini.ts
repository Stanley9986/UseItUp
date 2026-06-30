import { IntakePrompt, RecipePrompt, TermsPrompt, TranslationPrompt } from '../shared/prompt.ts';
import { createProviderError, ProviderError } from '../shared/provider-errors.ts';
import { fetchWithTimeout } from '../shared/request.ts';
import { intakeSchema, recipeSchema, termsSchema, translationSchema } from '../shared/schema.ts';
import { RecipeProvider } from './types.ts';

export const geminiProvider: RecipeProvider = {
  generate: generateWithGemini,
  generateStream: streamGeminiText,
  name: 'gemini',
  parseIntake: parseIntakeWithGemini,
  translateRecipes: translateWithGemini,
  translateTerms: translateTermsWithGemini,
};

export async function generateWithGemini(prompt: RecipePrompt) {
  return requestGeminiJson({
    systemInstruction: prompt.systemInstruction,
    userPayload: prompt.userPayload,
    responseSchema: recipeSchema,
  });
}

export async function parseIntakeWithGemini(prompt: IntakePrompt) {
  return requestGeminiJson({
    systemInstruction: prompt.systemInstruction,
    userPayload: prompt.userPayload,
    responseSchema: intakeSchema,
    temperature: 0.3,
  });
}

export async function translateWithGemini(prompt: TranslationPrompt) {
  // Faithful translation wants a low temperature regardless of the generation
  // temperature configured for recipe creation.
  return requestGeminiJson({
    systemInstruction: prompt.systemInstruction,
    userPayload: prompt.userPayload,
    responseSchema: translationSchema,
    temperature: 0.2,
  });
}

export async function translateTermsWithGemini(prompt: TermsPrompt) {
  return requestGeminiJson({
    systemInstruction: prompt.systemInstruction,
    userPayload: prompt.userPayload,
    responseSchema: termsSchema,
    temperature: 0.2,
  });
}

type GeminiJsonRequest = {
  systemInstruction: string;
  userPayload: unknown;
  responseSchema: unknown;
  temperature?: number;
};

async function requestGeminiJson({
  systemInstruction,
  userPayload,
  responseSchema,
  temperature,
}: GeminiJsonRequest) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    throw new ProviderError('Missing GEMINI_API_KEY secret', 'invalid_api_key');
  }

  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash';
  const maxOutputTokens = readPositiveInteger(Deno.env.get('GEMINI_MAX_OUTPUT_TOKENS'), 8192);
  const resolvedTemperature =
    typeof temperature === 'number'
      ? temperature
      : readTemperature(Deno.env.get('GEMINI_TEMPERATURE'), 0.7);
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: JSON.stringify(userPayload) }],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          response_json_schema: responseSchema,
          temperature: resolvedTemperature,
          maxOutputTokens,
        },
      }),
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw createProviderError(data?.error?.message ?? 'Gemini request failed', response.status);
  }

  const candidate = data?.candidates?.[0];
  const outputText = extractCandidateText(candidate);

  if (!outputText) {
    throw new Error('Gemini returned no content');
  }

  try {
    return JSON.parse(outputText);
  } catch {
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new Error(
        `Gemini stopped because it reached the ${maxOutputTokens} token output limit. Please try again.`,
      );
    }

    throw new Error(
      `Gemini returned incomplete JSON${
        candidate?.finishReason ? ` (${candidate.finishReason})` : ''
      }. Please try again.`,
    );
  }
}

// Streams the recipe JSON as it is produced. Yields text fragments (partial
// JSON) that the caller feeds into the incremental recipe parser. Uses Gemini's
// SSE endpoint and plain fetch (no request timeout) since the connection is held
// open for the whole generation.
export async function* streamGeminiText(
  prompt: RecipePrompt,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    throw new ProviderError('Missing GEMINI_API_KEY secret', 'invalid_api_key');
  }

  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash';
  const maxOutputTokens = readPositiveInteger(Deno.env.get('GEMINI_MAX_OUTPUT_TOKENS'), 8192);
  const temperature = readTemperature(Deno.env.get('GEMINI_TEMPERATURE'), 0.7);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: prompt.systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: JSON.stringify(prompt.userPayload) }],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          response_json_schema: recipeSchema,
          temperature,
          maxOutputTokens,
        },
      }),
      signal,
    },
  );

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null);

    throw createProviderError(data?.error?.message ?? 'Gemini stream request failed', response.status);
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
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      const text = textFromSseLine(line);

      if (text) {
        yield text;
      }

      newlineIndex = buffer.indexOf('\n');
    }
  }

  const finalText = textFromSseLine(buffer.trim());

  if (finalText) {
    yield finalText;
  }
}

function textFromSseLine(line: string): string {
  if (!line.startsWith('data:')) {
    return '';
  }

  const payload = line.slice('data:'.length).trim();

  if (!payload || payload === '[DONE]') {
    return '';
  }

  let chunk: unknown;

  try {
    chunk = JSON.parse(payload);
  } catch {
    return '';
  }

  const candidate = (chunk as { candidates?: unknown[] })?.candidates?.[0];

  return extractCandidateText(candidate);
}

function extractCandidateText(candidate: unknown): string {
  const parts = (candidate as { content?: { parts?: unknown[] } })?.content?.parts;

  return Array.isArray(parts)
    ? parts.map((part: { text?: unknown }) => (typeof part?.text === 'string' ? part.text : '')).join('')
    : '';
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function readTemperature(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 2 ? parsed : fallback;
}
