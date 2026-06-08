import { describe, expect, it } from 'vitest';

import { getJwtSubjectFromRequest } from './rate-limit';

function testJwt(payload: Record<string, unknown>) {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${encode({ alg: 'none' })}.${encode(payload)}.signature`;
}

describe('getJwtSubjectFromRequest', () => {
  it('reads the Supabase user subject from the bearer token', () => {
    const request = new Request('https://example.com', {
      headers: {
        Authorization: `Bearer ${testJwt({ sub: 'user-1' })}`,
      },
    });

    expect(getJwtSubjectFromRequest(request)).toBe('user-1');
  });

  it('falls back to anonymous when the token is missing or invalid', () => {
    expect(getJwtSubjectFromRequest(new Request('https://example.com'))).toBe('anonymous');
    expect(
      getJwtSubjectFromRequest(
        new Request('https://example.com', { headers: { Authorization: 'Bearer not-a-jwt' } }),
      ),
    ).toBe('anonymous');
  });
});
