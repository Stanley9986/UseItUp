import { RecipePrompt } from '../shared/prompt.ts';
import { recipeSchema } from '../shared/schema.ts';

export async function generateWithGemini(prompt: RecipePrompt) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY secret');
  }

  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash';
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
          temperature: 0.7,
          maxOutputTokens: 4000,
        },
      }),
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Gemini recipe generation failed');
  }

  const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!outputText) {
    throw new Error('Gemini recipe generation returned no content');
  }

  try {
    return JSON.parse(outputText);
  } catch {
    throw new Error('Gemini returned incomplete recipe JSON. Please try again.');
  }
}
