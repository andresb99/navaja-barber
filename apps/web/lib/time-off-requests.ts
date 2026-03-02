const PENDING_TIME_OFF_REASON_PREFIX = '[PENDING_APPROVAL] ';

export function markPendingTimeOffReason(reason: string | null | undefined) {
  const normalized = (reason || '').trim();

  if (!normalized) {
    return `${PENDING_TIME_OFF_REASON_PREFIX}Sin motivo`;
  }

  if (normalized.startsWith(PENDING_TIME_OFF_REASON_PREFIX)) {
    return normalized;
  }

  return `${PENDING_TIME_OFF_REASON_PREFIX}${normalized}`;
}

export function isPendingTimeOffReason(reason: string | null | undefined) {
  return typeof reason === 'string' && reason.startsWith(PENDING_TIME_OFF_REASON_PREFIX);
}

export function stripPendingTimeOffReason(reason: string | null | undefined) {
  if (!reason) {
    return null;
  }

  if (!isPendingTimeOffReason(reason)) {
    return reason.trim() || null;
  }

  const cleaned = reason.slice(PENDING_TIME_OFF_REASON_PREFIX.length).trim();
  return cleaned || null;
}

export { PENDING_TIME_OFF_REASON_PREFIX };
