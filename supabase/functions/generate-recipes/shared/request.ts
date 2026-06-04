// DeepSeek (and others) can hold a connection open for minutes under load, far
// longer than the Edge Function's budget and the user's patience. Cap every
// provider request so a stall surfaces as an error the fallback layer can act on
// instead of hanging.

export function getProviderTimeoutMs() {
  const parsed = Number(Deno.env.get('PROVIDER_TIMEOUT_MS'));

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 45000;
}

export async function fetchWithTimeout(url: string, init: RequestInit) {
  const timeoutMs = getProviderTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Provider request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}
