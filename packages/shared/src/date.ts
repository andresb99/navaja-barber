export function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
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

