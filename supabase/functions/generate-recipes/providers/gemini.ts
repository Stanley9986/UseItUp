import { RecipePrompt, TermsPrompt, TranslationPrompt } from '../shared/prompt.ts';
import { recipeSchema, termsSchema, translationSchema } from '../shared/schema.ts';
import { RecipeProvider } from './types.ts';

export const geminiProvider: RecipeProvider = {
  generate: generateWithGemini,
  name: 'gemini',
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
    throw new Error('Missing GEMINI_API_KEY secret');
  }

  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash';
  const maxOutputTokens = readPositiveInteger(Deno.env.get('GEMINI_MAX_OUTPUT_TOKENS'), 8192);
  const resolvedTemperature =
    typeof temperature === 'number'
      ? temperature
      : readTemperature(Deno.env.get('GEMINI_TEMPERATURE'), 0.7);
  const response = await fetch(
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
    throw new Error(data?.error?.message ?? 'Gemini request failed');
  }

  const candidate = data?.candidates?.[0];
  const outputText = Array.isArray(candidate?.content?.parts)
    ? candidate.content.parts
        .map((part: { text?: unknown }) => (typeof part.text === 'string' ? part.text : ''))
        .join('')
    : '';

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

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function readTemperature(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 2 ? parsed : fallback;
}
