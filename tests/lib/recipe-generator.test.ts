import { describe, expect, it } from 'vitest';

import { readFunctionErrorPayload } from '@/lib/shared/function-errors';

describe('readFunctionErrorPayload', () => {
  it('reads JSON error response bodies from cloned responses', async () => {
    await expect(
      readFunctionErrorPayload(
        new Response(JSON.stringify({ error: 'Gemini rejected the request' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ).resolves.toEqual({ error: 'Gemini rejected the request' });
  });

  it('falls back to text response bodies', async () => {
    await expect(readFunctionErrorPayload(new Response('Function crashed', { status: 500 }))).resolves.toBe(
      'Function crashed',
    );
  });

  it('returns null for unknown contexts', async () => {
    await expect(readFunctionErrorPayload(null)).resolves.toBeNull();
  });
});
