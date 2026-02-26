import { appointmentStatusSchema } from './schemas';

export interface AvailabilityWorkingHours {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface AvailabilityBlockedInterval {
  start_at: string;
  end_at: string;
  status?: string;
}

export interface GenerateAvailabilityParams {
  date: string;
  serviceDurationMinutes: number;
  slotMinutes?: number;
  workingHours: AvailabilityWorkingHours[];
  appointments: AvailabilityBlockedInterval[];
  timeOff: AvailabilityBlockedInterval[];
  referenceNowIso?: string;
}

export interface AvailabilitySlot {
  start_at: string;
  end_at: string;
}

const BLOCKING_STATUSES = new Set(
  appointmentStatusSchema.options.filter((status) => status === 'pending' || status === 'confirmed'),
);

const MINUTE = 60 * 1000;

function parseTimeToMinutes(value: string): number {
  const [hours = 0, minutes = 0] = value
    .split(':')
    .slice(0, 2)
    .map((part) => Number(part) || 0);
  return hours * 60 + minutes;
}

function toIso(date: Date): string {
  return date.toISOString();
}

function normalizeDateStart(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function clampInterval(
  startAt: Date,
  endAt: Date,
  min: Date,
  max: Date,
): { start: Date; end: Date } | null {
  const start = startAt > min ? startAt : min;
  const end = endAt < max ? endAt : max;
  if (start >= end) {
    return null;
  }
  return { start, end };
}

function intervalsOverlap(
  left: { start: number; end: number },
  right: { start: number; end: number },
): boolean {
  return left.start < right.end && right.start < left.end;
}

function blockedIntervalsForDay(
  date: string,
  appointments: AvailabilityBlockedInterval[],
  timeOff: AvailabilityBlockedInterval[],
): Array<{ start: number; end: number }> {
  const dayStart = normalizeDateStart(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * MINUTE);

  const fromIsoInterval = (interval: AvailabilityBlockedInterval): { start: number; end: number } | null => {
    const clamped = clampInterval(new Date(interval.start_at), new Date(interval.end_at), dayStart, dayEnd);
    if (!clamped) {
      return null;
    }
    return {
      start: Math.max(0, Math.round((clamped.start.getTime() - dayStart.getTime()) / MINUTE)),
      end: Math.min(24 * 60, Math.round((clamped.end.getTime() - dayStart.getTime()) / MINUTE)),
    };
  };

  const appointmentIntervals = appointments
    .filter((item) => !item.status || BLOCKING_STATUSES.has(item.status as 'pending' | 'confirmed'))
    .map(fromIsoInterval)
    .filter((item): item is { start: number; end: number } => item !== null);

  const timeOffIntervals = timeOff
    .map(fromIsoInterval)
    .filter((item): item is { start: number; end: number } => item !== null);

  return [...appointmentIntervals, ...timeOffIntervals];
}

export function generateAvailabilitySlots(params: GenerateAvailabilityParams): AvailabilitySlot[] {
  const {
    date,
    serviceDurationMinutes,
    workingHours,
    appointments,
    timeOff,
    slotMinutes = 15,
    referenceNowIso,
  } = params;

  const dayStart = normalizeDateStart(date);
  const dayOfWeek = dayStart.getUTCDay();
  const blockedIntervals = blockedIntervalsForDay(date, appointments, timeOff);

  let minStartMinute = 0;
  if (referenceNowIso) {
    const now = new Date(referenceNowIso);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * MINUTE);
    if (now >= dayStart && now < dayEnd) {
      minStartMinute = Math.ceil((now.getTime() - dayStart.getTime()) / MINUTE / slotMinutes) * slotMinutes;
    }
  }

  const slots: AvailabilitySlot[] = [];

  const intervals = workingHours
    .filter((item) => item.day_of_week === dayOfWeek)
    .map((item) => ({
      start: parseTimeToMinutes(item.start_time),
      end: parseTimeToMinutes(item.end_time),
    }))
    .filter((item) => item.start < item.end);

  for (const interval of intervals) {
    let cursor = Math.max(interval.start, minStartMinute);
    if (cursor % slotMinutes !== 0) {
      cursor += slotMinutes - (cursor % slotMinutes);
    }

    while (cursor + serviceDurationMinutes <= interval.end) {
      const candidate = { start: cursor, end: cursor + serviceDurationMinutes };
      const isBlocked = blockedIntervals.some((blocked) => intervalsOverlap(candidate, blocked));
      if (!isBlocked) {
        const startDate = new Date(dayStart.getTime() + candidate.start * MINUTE);
        const endDate = new Date(dayStart.getTime() + candidate.end * MINUTE);
        slots.push({ start_at: toIso(startDate), end_at: toIso(endDate) });
      }
      cursor += slotMinutes;
    }
  }

  return slots.sort((a, b) => (a.start_at < b.start_at ? -1 : 1));
}

export function calculateBookedMinutes(
  appointments: AvailabilityBlockedInterval[],
  dateFromIso: string,
  dateToIso: string,
): number {
  const from = new Date(dateFromIso).getTime();
  const to = new Date(dateToIso).getTime();

  return appointments
    .filter((item) => item.status === 'done' || item.status === 'confirmed' || item.status === 'pending')
    .map((item) => ({ start: new Date(item.start_at).getTime(), end: new Date(item.end_at).getTime() }))
    .map((item) => ({ start: Math.max(from, item.start), end: Math.min(to, item.end) }))
    .filter((item) => item.start < item.end)
    .reduce((acc, item) => acc + Math.round((item.end - item.start) / MINUTE), 0);
}

