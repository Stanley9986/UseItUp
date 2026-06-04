// Expiration dates are entered through a native date picker, so the only input
// is an ISO date string (YYYY-MM-DD) or an empty value. Validate and pass it
// through.
export function parseExpirationDate(value: string) {
  const normalized = value.trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined;
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateInMonth(date: Date, year: number, monthIndex: number) {
  const day = Math.min(date.getDate(), getDaysInMonth(year, monthIndex));
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

export function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getDateByMonthOffset(date: Date, offset: number) {
  const targetMonth = date.getMonth() + offset;
  const year = date.getFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  return getDateInMonth(date, year, month);
}

export function getCalendarMonthGrid(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const cells: Array<number | null> = [];

  for (let index = 0; index < firstDay; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function getDatePickerYearOptions(selectedYear: number, currentYear = new Date().getFullYear()) {
  const startYear = Math.min(currentYear, selectedYear);
  const endYear = Math.max(currentYear + 50, selectedYear);

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
}
