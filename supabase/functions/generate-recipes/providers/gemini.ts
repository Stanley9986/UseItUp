import { RecipePrompt } from '../shared/prompt.ts';
import { recipeSchema } from '../shared/schema.ts';

export async function generateWithGemini(prompt: RecipePrompt) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY secret');
  }

  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash';
  const maxOutputTokens = readPositiveInteger(Deno.env.get('GEMINI_MAX_OUTPUT_TOKENS'), 8192);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
          temperature: 0.6,
          maxOutputTokens,
        },
      }),
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Gemini recipe generation failed');
  }

  const candidate = data?.candidates?.[0];
  const outputText = Array.isArray(candidate?.content?.parts)
    ? candidate.content.parts
        .map((part: { text?: unknown }) => (typeof part.text === 'string' ? part.text : ''))
        .join('')
    : '';

  if (!outputText) {
    throw new Error('Gemini recipe generation returned no content');
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
      `Gemini returned incomplete recipe JSON${
        candidate?.finishReason ? ` (${candidate.finishReason})` : ''
      }. Please try again.`,
    );
  }
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
