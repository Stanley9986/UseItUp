export async function readFunctionErrorPayload(context: unknown) {
  if (!isRecord(context)) {
    return null;
  }

  const response = 'clone' in context && typeof context.clone === 'function' ? context.clone() : context;

  if (isRecord(response) && 'json' in response && typeof response.json === 'function') {
    const payload = await response.json().catch(() => null);

    if (payload !== null) {
      return payload;
    }
  }

  const textResponse = 'clone' in context && typeof context.clone === 'function' ? context.clone() : context;

  if (isRecord(textResponse) && 'text' in textResponse && typeof textResponse.text === 'function') {
    return textResponse.text().catch(() => null);
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
