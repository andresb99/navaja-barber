export function formatCurrency(cents: number, currency = 'UYU', locale = 'es-UY'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export function parseCurrencyInputToCents(value: string | number | null | undefined): number {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return Number.NaN;
  }

  const cleaned = raw.replace(/[^\d.,-]/g, '');
  if (!cleaned) {
    return Number.NaN;
  }

  const hasDot = cleaned.includes('.');
  const hasComma = cleaned.includes(',');

  let normalized = cleaned;
  if (hasDot && hasComma) {
    normalized =
      cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.');
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    return Number.NaN;
  }

  return Math.round(amount * 100);
}

export function centsToCurrencyInput(cents: number | null | undefined): string {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) {
    return '';
  }

  const normalized = Number((cents / 100).toFixed(2));
  return String(normalized);
}

export function toDateOnly(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, amount: number): string {
  const current = new Date(`${date}T00:00:00.000Z`);
  current.setUTCDate(current.getUTCDate() + amount);
  return current.toISOString().slice(0, 10);
}

export function rangeOfDates(date: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addDays(date, index));
}

export function formatDateTime(value: string, locale = 'es-UY'): string {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(value: string, locale = 'es-UY'): string {
  return new Date(value).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

