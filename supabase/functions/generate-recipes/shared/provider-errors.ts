export type ProviderErrorKind =
  | 'bad_request'
  | 'invalid_api_key'
  | 'provider_unavailable'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'timeout'
  | 'unknown';

const retryableKinds = new Set<ProviderErrorKind>([
  'provider_unavailable',
  'quota_exceeded',
  'rate_limited',
  'timeout',
]);

export class ProviderError extends Error {
  kind: ProviderErrorKind;
  status?: number;

  constructor(message: string, kind: ProviderErrorKind = 'unknown', status?: number) {
    super(message);
    this.name = 'ProviderError';
    this.kind = kind;
    this.status = status;
  }
}

export function createProviderError(message: string, status?: number) {
  return new ProviderError(message, classifyProviderError({ message, status }), status);
}

export function classifyProviderError(input: { message?: string; status?: number }): ProviderErrorKind {
  const message = input.message?.toLowerCase() ?? '';
  const status = input.status;

  if (message.includes('timed out') || message.includes('timeout')) {
    return 'timeout';
  }

  if (status === 401 || status === 403) {
    return 'invalid_api_key';
  }

  if (status === 400 || status === 422) {
    return 'bad_request';
  }

  if (status === 402 || message.includes('insufficient balance') || message.includes('quota exceeded')) {
    return 'quota_exceeded';
  }

  if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
    return 'rate_limited';
  }

  if (status && status >= 500) {
    return 'provider_unavailable';
  }

  if (message.includes('fetch failed') || message.includes('network')) {
    return 'provider_unavailable';
  }

  return 'unknown';
}

export function isRetryableProviderError(error: unknown) {
  if (error instanceof ProviderError) {
    return retryableKinds.has(error.kind);
  }

  if (error instanceof Error) {
    return retryableKinds.has(classifyProviderError({ message: error.message }));
  }

  return false;
}

export function getPublicProviderError(error: unknown, operationLabel: string) {
  const kind = error instanceof ProviderError
    ? error.kind
    : error instanceof Error
      ? classifyProviderError({ message: error.message })
      : 'unknown';

  if (kind === 'rate_limited' || kind === 'quota_exceeded') {
    return {
      code: 'provider_rate_limited',
      error: `${operationLabel} is busy right now. Please try again in a minute.`,
      status: 503,
    };
  }

  if (kind === 'timeout' || kind === 'provider_unavailable') {
    return {
      code: 'provider_unavailable',
      error: `${operationLabel} is temporarily unavailable. Please try again soon.`,
      status: 503,
    };
  }

  if (kind === 'invalid_api_key') {
    return {
      code: 'provider_config_error',
      error: `${operationLabel} is not configured correctly.`,
      status: 500,
    };
  }

  return {
    code: 'provider_error',
    error: `${operationLabel} failed. Please try again.`,
    status: 500,
  };
}
