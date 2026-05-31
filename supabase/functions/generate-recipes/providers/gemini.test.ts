import { describe, expect, it } from 'vitest';

import { readTemperature } from './gemini';

describe('readTemperature', () => {
  it('accepts valid Gemini temperature values', () => {
    expect(readTemperature('0.7', 0.6)).toBe(0.7);
    expect(readTemperature('0', 0.6)).toBe(0);
    expect(readTemperature('2', 0.6)).toBe(2);
  });

  it('falls back for invalid temperature values', () => {
    expect(readTemperature(undefined, 0.7)).toBe(0.7);
    expect(readTemperature('hot', 0.7)).toBe(0.7);
    expect(readTemperature('-0.1', 0.7)).toBe(0.7);
    expect(readTemperature('2.1', 0.7)).toBe(0.7);
  });
});
