// Expiration dates are entered through a native date picker, so the only input
// is an ISO date string (YYYY-MM-DD) or an empty value. Validate and pass it
// through.
export function parseExpirationDate(value: string) {
  const normalized = value.trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined;
}
