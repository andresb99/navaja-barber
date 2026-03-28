/**
 * Pure metric computation functions shared across web and mobile.
 *
 * These functions perform math on data that has already been fetched.
 * They have zero dependencies on Supabase, React Native, or any I/O layer.
 */

import type { BookingMetricsChannelView, StaffPerformanceMetric } from './metrics-types';

// ---------------------------------------------------------------------------
// Numeric utilities
// ---------------------------------------------------------------------------

function parseTimePart(value: string | number | null | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clampRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Source channel helpers
// ---------------------------------------------------------------------------

export function normalizeSourceChannel(value: unknown) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return normalized || 'WEB';
}

export function isOnlineChannel(value: unknown) {
  return normalizeSourceChannel(value) === 'WEB';
}

export function isWalkInChannel(value: unknown) {
  const channel = normalizeSourceChannel(value);
  return channel === 'WALK_IN' || channel === 'ADMIN_CREATED';
}

export function getSourceChannelLabel(value: unknown) {
  const channel = normalizeSourceChannel(value);

  if (channel === 'WEB') {
    return 'Web';
  }

  if (channel === 'WALK_IN') {
    return 'Walk-in';
  }

  if (channel === 'ADMIN_CREATED') {
    return 'Admin';
  }

  if (channel === 'WHATSAPP') {
    return 'WhatsApp';
  }

  if (channel === 'INSTAGRAM') {
    return 'Instagram';
  }

  if (channel === 'PHONE') {
    return 'Telefono';
  }

  return channel;
}

export function filterAppointmentsByChannel<T extends { source_channel?: unknown }>(
  rows: T[],
  channelView: BookingMetricsChannelView,
) {
  if (channelView === 'ONLINE_ONLY') {
    return rows.filter((item) => isOnlineChannel(item.source_channel));
  }

  if (channelView === 'WALK_INS_ONLY') {
    return rows.filter((item) => isWalkInChannel(item.source_channel));
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Time calculations
// ---------------------------------------------------------------------------

export function calculateWorkedMinutes(
  rangeDates: Date[],
  workingHours: Array<{
    day_of_week: number | null;
    start_time: string | null;
    end_time: string | null;
  }>,
) {
  return workingHours.reduce((acc, item) => {
    const [startHourRaw, startMinuteRaw] = String(item.start_time)
      .split(':')
      .slice(0, 2)
      .map(Number);
    const [endHourRaw, endMinuteRaw] = String(item.end_time)
      .split(':')
      .slice(0, 2)
      .map(Number);
    const startHour = parseTimePart(startHourRaw);
    const startMinute = parseTimePart(startMinuteRaw);
    const endHour = parseTimePart(endHourRaw);
    const endMinute = parseTimePart(endMinuteRaw);
    const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    const matchingDays = rangeDates.filter((date) => date.getUTCDay() === Number(item.day_of_week || 0)).length;
    return acc + Math.max(0, minutes) * matchingDays;
  }, 0);
}

export function calculateTimeOffMinutes(
  timeOff: Array<{
    start_at: string | null;
    end_at: string | null;
  }>,
) {
  return timeOff.reduce((acc, item) => {
    const intervalMinutes = Math.round(
      (new Date(String(item.end_at)).getTime() - new Date(String(item.start_at)).getTime()) / 60000,
    );
    return acc + Math.max(0, intervalMinutes);
  }, 0);
}

// ---------------------------------------------------------------------------
// Date range helpers
// ---------------------------------------------------------------------------

export function getDateRange(range: 'today' | 'last7' | 'month') {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);

  if (range === 'today') {
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end, label: 'Hoy' };
  }

  if (range === 'last7') {
    start.setUTCDate(start.getUTCDate() - 6);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end, label: 'Ultimos 7 dias' };
  }

  start.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(1);
  return { start, end, label: 'Este mes' };
}

export function getRangeDates(start: Date, end: Date) {
  const rangeDates: Date[] = [];
  for (let cursor = new Date(start); cursor < end; cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
    rangeDates.push(new Date(cursor));
  }
  return rangeDates;
}

// ---------------------------------------------------------------------------
// Rating & health
// ---------------------------------------------------------------------------

export function calculateTrustedRating(
  averageRating: number,
  reviewCount: number,
  shopAverageRating: number,
  minimumReviewWeight = 5,
) {
  const v = Math.max(0, reviewCount);
  const m = Math.max(1, minimumReviewWeight);
  const r = Math.max(0, averageRating);
  const c = Math.max(0, shopAverageRating);
  return Number(((v / (v + m)) * r + (m / (v + m)) * c).toFixed(2));
}

export function getHealthStatus(metric: {
  occupancyRatio: number;
  trustedRating: number;
  reviewCount: number;
  staffCancellations: number;
  totalCancellations: number;
  completedAppointments: number;
}): Pick<StaffPerformanceMetric, 'health' | 'healthLabel' | 'healthTone'> {
  const trackedAppointments = metric.completedAppointments + metric.totalCancellations;
  const staffCancellationRate =
    trackedAppointments > 0 ? metric.staffCancellations / trackedAppointments : 0;

  if (
    metric.occupancyRatio >= 0.8 &&
    metric.trustedRating >= 4.6 &&
    staffCancellationRate <= 0.04 &&
    metric.completedAppointments >= 3
  ) {
    return {
      health: 'top',
      healthLabel: 'Top',
      healthTone: 'success',
    };
  }

  if (
    metric.occupancyRatio < 0.55 ||
    staffCancellationRate > 0.08 ||
    (metric.reviewCount >= 5 && metric.trustedRating < 4.3)
  ) {
    return {
      health: 'attention',
      healthLabel: 'Atencion',
      healthTone: 'danger',
    };
  }

  return {
    health: 'healthy',
    healthLabel: 'Saludable',
    healthTone: 'warning',
  };
}
