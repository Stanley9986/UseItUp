import { describe, expect, it } from 'vitest';

import {
  classifyProviderError,
  createProviderError,
  getPublicProviderError,
  isRetryableProviderError,
  ProviderError,
} from './provider-errors';

describe('classifyProviderError', () => {
  it('classifies retryable provider failures', () => {
    expect(classifyProviderError({ status: 429, message: 'Too many requests' })).toBe('rate_limited');
    expect(classifyProviderError({ status: 402, message: 'Insufficient balance' })).toBe('quota_exceeded');
    expect(classifyProviderError({ status: 503, message: 'Unavailable' })).toBe('provider_unavailable');
    expect(classifyProviderError({ message: 'Provider request timed out after 100ms' })).toBe('timeout');
    expect(classifyProviderError({ message: 'fetch failed' })).toBe('provider_unavailable');
  });

  it('classifies non-retryable failures', () => {
    expect(classifyProviderError({ status: 401, message: 'Bad key' })).toBe('invalid_api_key');
    expect(classifyProviderError({ status: 400, message: 'Bad request' })).toBe('bad_request');
  });
});

describe('isRetryableProviderError', () => {
  it('only allows fallback for retryable provider errors', () => {
    expect(isRetryableProviderError(new ProviderError('limited', 'rate_limited', 429))).toBe(true);
    expect(isRetryableProviderError(new ProviderError('bad key', 'invalid_api_key', 401))).toBe(false);
  });
});

describe('getPublicProviderError', () => {
  it('maps provider quota failures to a user-safe message', () => {
    const error = createProviderError('Quota exceeded for model', 429);

    expect(getPublicProviderError(error, 'fallback')).toEqual({
      code: 'provider_rate_limited',
      error: 'fallback is busy right now. Please try again in a minute.',
      status: 503,
    });
  });
});
