import { formatCurrency } from '@navaja/shared';

export { formatCurrency };

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('es-UY', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
