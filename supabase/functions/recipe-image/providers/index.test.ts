import { describe, expect, it } from 'vitest';

import { getImageProvider } from './index';

describe('image provider selection', () => {
  it('returns Pexels by default', () => {
    expect(getImageProvider().name).toBe('pexels');
  });

  it('normalizes provider names', () => {
    expect(getImageProvider(' OpenAI ').name).toBe('openai');
  });

  it('falls back to Pexels for unknown providers', () => {
    expect(getImageProvider('unknown').name).toBe('pexels');
  });
});
