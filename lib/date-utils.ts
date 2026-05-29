export function parseExpirationDate(value: string, today = new Date()) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (normalized === 'today') {
    return formatDateFromNow(0, today);
  }

  if (normalized === 'tomorrow') {
    return formatDateFromNow(1, today);
  }

  const daysMatch = normalized.match(/^(?:in\s*)?(\d+)\s*days?$/);

  if (daysMatch?.[1]) {
    return formatDateFromNow(Number(daysMatch[1]), today);
  }

  return undefined;
}

function formatDateFromNow(days: number, today: Date) {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
