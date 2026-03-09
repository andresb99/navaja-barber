import type { BookingRefundMode } from '@navaja/shared';

export interface ShopBookingPolicySource {
  booking_cancellation_notice_hours?: number | null;
  booking_staff_cancellation_refund_mode?: string | null;
  booking_cancellation_policy_text?: string | null;
}

export interface ShopBookingPolicy {
  cancellationNoticeHours: number;
  refundMode: BookingRefundMode;
  policyText: string | null;
}

const DEFAULT_NOTICE_HOURS = 6;
const DEFAULT_REFUND_MODE: BookingRefundMode = 'automatic_full';

export function normalizeShopBookingPolicy(source: ShopBookingPolicySource | null | undefined): ShopBookingPolicy {
  const noticeHours = Number(source?.booking_cancellation_notice_hours);
  const normalizedNoticeHours =
    Number.isInteger(noticeHours) && noticeHours >= 0 && noticeHours <= 168
      ? noticeHours
      : DEFAULT_NOTICE_HOURS;

  const rawRefundMode = String(source?.booking_staff_cancellation_refund_mode || '')
    .trim()
    .toLowerCase();
  const refundMode: BookingRefundMode =
    rawRefundMode === 'manual_review' ? 'manual_review' : DEFAULT_REFUND_MODE;

  const policyText = String(source?.booking_cancellation_policy_text || '').trim() || null;

  return {
    cancellationNoticeHours: normalizedNoticeHours,
    refundMode,
    policyText,
  };
}

export function describeShopBookingPolicy(policy: ShopBookingPolicy) {
  return {
    noticeLabel:
      policy.cancellationNoticeHours === 0
        ? 'Cancelaciones permitidas hasta el momento de la cita.'
        : `Cancelaciones sin friccion hasta ${policy.cancellationNoticeHours}h antes de la cita.`,
    refundLabel:
      policy.refundMode === 'automatic_full'
        ? 'Si la barberia cancela una cita pagada, se devuelve el 100% automaticamente.'
        : 'Si la barberia cancela una cita pagada, el reembolso queda marcado para revision manual.',
  };
}
