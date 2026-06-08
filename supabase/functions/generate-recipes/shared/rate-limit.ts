export type RateLimitResult = {
  allowed: boolean;
  limit?: number | null;
  remaining?: number | null;
  retryAfterSeconds?: number;
  status: 'allowed' | 'blocked' | 'disabled' | 'error';
};

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds?: number;
};

export async function checkRateLimit({
  key,
  limit,
  windowSeconds = 3600,
}: RateLimitOptions): Promise<RateLimitResult> {
  if (limit <= 0) {
    return { allowed: true, limit, remaining: null, retryAfterSeconds: 0, status: 'disabled' };
  }

  const config = getRateLimitConfig();

  if (!config) {
    return { allowed: true, limit, remaining: null, retryAfterSeconds: 0, status: 'disabled' };
  }

  try {
    const response = await fetch(`${config.restUrl}/rpc/check_edge_function_rate_limit`, {
      body: JSON.stringify({
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      }),
      headers: config.headers,
      method: 'POST',
    });

    if (!response.ok) {
      return { allowed: true, limit, remaining: null, retryAfterSeconds: 0, status: 'error' };
    }

    const payload = await response.json().catch(() => null);

    if (!isRecord(payload) || typeof payload.allowed !== 'boolean') {
      return { allowed: true, limit, remaining: null, retryAfterSeconds: 0, status: 'error' };
    }

    return {
      allowed: payload.allowed,
      limit: typeof payload.limit === 'number' ? payload.limit : limit,
      remaining: typeof payload.remaining === 'number' ? payload.remaining : null,
      retryAfterSeconds:
        typeof payload.retryAfterSeconds === 'number' ? payload.retryAfterSeconds : 0,
      status: payload.allowed ? 'allowed' : 'blocked',
    };
  } catch {
    // Rate-limit storage should fail open so a transient database/cache issue
    // does not make recipe generation unavailable.
    return { allowed: true, limit, remaining: null, retryAfterSeconds: 0, status: 'error' };
  }
}

export function getJwtSubjectFromRequest(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  const [, payload] = token.split('.');

  if (!payload) {
    return 'anonymous';
  }

  try {
    const decoded = JSON.parse(decodeBase64Url(payload));
    const subject = typeof decoded.sub === 'string' && decoded.sub.trim()
      ? decoded.sub.trim()
      : '';

    return subject || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

export function readPositiveIntegerEnv(name: string, fallback: number) {
  const parsed = Number(Deno.env.get(name));

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function getRateLimitConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    restUrl: `${supabaseUrl}/rest/v1`,
  };
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  return atob(padded);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
