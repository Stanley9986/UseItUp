import { describe, expect, it } from 'vitest';

import { readPositiveInteger, readTemperature } from './openai-compatible';

describe('readPositiveInteger', () => {
  it('accepts positive integers', () => {
    expect(readPositiveInteger('1024', 8192)).toBe(1024);
  });

  it('falls back for invalid values', () => {
    expect(readPositiveInteger(undefined, 8192)).toBe(8192);
    expect(readPositiveInteger('0', 8192)).toBe(8192);
    expect(readPositiveInteger('1.5', 8192)).toBe(8192);
    expect(readPositiveInteger('many', 8192)).toBe(8192);
  });
});

describe('readTemperature', () => {
  it('accepts OpenAI-compatible temperature values', () => {
    expect(readTemperature('0', 0.7)).toBe(0);
    expect(readTemperature('1.2', 0.7)).toBe(1.2);
    expect(readTemperature('2', 0.7)).toBe(2);
  });

  it('falls back for invalid temperature values', () => {
    expect(readTemperature(undefined, 0.7)).toBe(0.7);
    expect(readTemperature('-0.1', 0.7)).toBe(0.7);
    expect(readTemperature('2.1', 0.7)).toBe(0.7);
    expect(readTemperature('warm', 0.7)).toBe(0.7);
  });
});
