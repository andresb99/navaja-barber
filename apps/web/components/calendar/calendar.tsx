'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Card, CardBody } from '@heroui/card';
import { CalendarHeader } from '@/components/calendar/calendar-header';
import { MonthGrid } from '@/components/calendar/month-grid';
import { WeekGrid } from '@/components/calendar/week-grid';
import { cn } from '@/lib/cn';
import { useMediaQuery } from './use-media-query';
import type { CalendarEventTone } from './event-tone';

export type CalendarEventStatus = 'confirmed' | 'pending' | 'cancelled';
export type CalendarView = 'day' | 'week' | 'month';

export type CalendarEvent = {
  id: string;
  title: string;
  clientName?: string | undefined;
  resourceName?: string | undefined;
  start: Date;
  end: Date;
  status?: CalendarEventStatus | undefined;
  tone?: CalendarEventTone | undefined;
  statusLabel?: string | undefined;
};

interface CalendarProps {
  events: CalendarEvent[];
  startHour?: number;
  endHour?: number;
  initialDate?: Date;
  initialView?: CalendarView;
  locale?: string;
  title?: string;
  description?: string;
  headerAddon?: ReactNode;
  className?: string;
  availableRangeStart?: Date | undefined;
  availableRangeEndExclusive?: Date | undefined;
  onEventClick?: (event: CalendarEvent) => void;
}

interface CalendarWindow {
  rangeStart: Date;
  rangeEnd: Date;
  rangeEndExclusive: Date;
  days: Date[];
  visibleDayCount: number;
}

const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 20;
const DAYS_IN_WEEK = 7;
const WEEK_STARTS_ON = 1;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function isValidDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function sanitizeHour(value: number | undefined, fallback: number) {
  const normalized = Number.isFinite(value) ? Math.floor(Number(value)) : fallback;
  return Math.min(24, Math.max(0, normalized));
}

function resolveInitialReference(initialDate?: Date) {
  if (isValidDate(initialDate)) {
    return new Date(initialDate.getTime());
  }

  return new Date();
}

function startOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function startOfWeek(date: Date) {
  const normalized = startOfDay(date);
  const diff = (normalized.getDay() - WEEK_STARTS_ON + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  normalized.setDate(normalized.getDate() - diff);
  return normalized;
}

function startOfMonth(date: Date) {
  const normalized = startOfDay(date);
  normalized.setDate(1);
  return normalized;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function buildCalendarWindow(view: CalendarView, referenceDate: Date): CalendarWindow {
  if (view === 'day') {
    const rangeStart = startOfDay(referenceDate);
    const rangeEndExclusive = addDays(rangeStart, 1);

    return {
      rangeStart,
      rangeEnd: rangeStart,
      rangeEndExclusive,
      days: [rangeStart],
      visibleDayCount: 1,
    };
  }

  if (view === 'month') {
    const rangeStart = startOfMonth(referenceDate);
    const rangeEndExclusive = startOfMonth(addMonths(rangeStart, 1));

    return {
      rangeStart,
      rangeEnd: addDays(rangeEndExclusive, -1),
      rangeEndExclusive,
      days: [],
      visibleDayCount: Math.max(1, Math.round((rangeEndExclusive.getTime() - rangeStart.getTime()) / DAY_IN_MS)),
    };
  }

  const rangeStart = startOfWeek(referenceDate);
  const days = Array.from({ length: DAYS_IN_WEEK }, (_, index) => addDays(rangeStart, index));
  const rangeEnd = days[days.length - 1] ?? rangeStart;

  return {
    rangeStart,
    rangeEnd,
    rangeEndExclusive: addDays(rangeStart, DAYS_IN_WEEK),
    days,
    visibleDayCount: DAYS_IN_WEEK,
  };
}

function shiftReferenceDate(referenceDate: Date, view: CalendarView, direction: -1 | 1) {
  if (view === 'day') {
    return addDays(referenceDate, direction);
  }

  if (view === 'month') {
    return addMonths(referenceDate, direction);
  }

  return addDays(referenceDate, direction * DAYS_IN_WEEK);
}

function formatRangeLabel(view: CalendarView, rangeStart: Date, rangeEnd: Date, locale: string) {
  if (view === 'day') {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
      .format(rangeStart)
      .replace('.', '');
  }

  if (view === 'month') {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(rangeStart);
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  });

  return `${formatter.format(rangeStart).replace('.', '')} - ${formatter.format(rangeEnd).replace('.', '')}`;
}

function formatVisibleDayLabel(view: CalendarView, visibleDayCount: number) {
  if (view === 'day') {
    return '1 dia en foco';
  }

  if (view === 'week') {
    return '7 dias visibles';
  }

  return `${visibleDayCount} dias visibles`;
}

function isWithinLoadedRange(
  candidateView: CalendarWindow,
  availableRangeStart?: Date,
  availableRangeEndExclusive?: Date,
) {
  const normalizedStart = isValidDate(availableRangeStart) ? startOfDay(availableRangeStart) : null;
  const normalizedEndExclusive = isValidDate(availableRangeEndExclusive)
    ? startOfDay(availableRangeEndExclusive)
    : null;

  if (normalizedStart && candidateView.rangeStart.getTime() < normalizedStart.getTime()) {
    return false;
  }

  if (normalizedEndExclusive && candidateView.rangeEndExclusive.getTime() > normalizedEndExclusive.getTime()) {
    return false;
  }

  return true;
}

export function Calendar({
  events,
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
  initialDate,
  initialView = 'week',
  locale = 'es-UY',
  title = 'Agenda semanal',
  description = 'Una vista limpia para entender reservas, huecos y estados de un vistazo.',
  headerAddon,
  className,
  availableRangeStart,
  availableRangeEndExclusive,
  onEventClick,
}: CalendarProps) {
  const [referenceDate, setReferenceDate] = useState<Date>(() => resolveInitialReference(initialDate));
  const [view, setView] = useState<CalendarView>(initialView);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const normalizedStartHour = Math.min(23, sanitizeHour(startHour, DEFAULT_START_HOUR));
  const normalizedEndHour = Math.min(
    24,
    Math.max(normalizedStartHour + 1, sanitizeHour(endHour, DEFAULT_END_HOUR)),
  );

  const calendarWindow = useMemo(() => buildCalendarWindow(view, referenceDate), [referenceDate, view]);
  const rangeLabel = useMemo(
    () => formatRangeLabel(view, calendarWindow.rangeStart, calendarWindow.rangeEnd, locale),
    [calendarWindow.rangeEnd, calendarWindow.rangeStart, locale, view],
  );
  const visibleDayLabel = useMemo(
    () => formatVisibleDayLabel(view, calendarWindow.visibleDayCount),
    [calendarWindow.visibleDayCount, view],
  );

  const visibleEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            isValidDate(event.start) &&
            isValidDate(event.end) &&
            event.end.getTime() > event.start.getTime() &&
            event.end.getTime() > calendarWindow.rangeStart.getTime() &&
            event.start.getTime() < calendarWindow.rangeEndExclusive.getTime(),
        )
        .sort((left, right) => left.start.getTime() - right.start.getTime()),
    [calendarWindow.rangeEndExclusive, calendarWindow.rangeStart, events],
  );

  const canNavigatePrevious = useMemo(() => {
    const candidateWindow = buildCalendarWindow(
      view,
      shiftReferenceDate(referenceDate, view, -1),
    );

    return isWithinLoadedRange(candidateWindow, availableRangeStart, availableRangeEndExclusive);
  }, [availableRangeEndExclusive, availableRangeStart, referenceDate, view]);

  const canNavigateNext = useMemo(() => {
    const candidateWindow = buildCalendarWindow(
      view,
      shiftReferenceDate(referenceDate, view, 1),
    );

    return isWithinLoadedRange(candidateWindow, availableRangeStart, availableRangeEndExclusive);
  }, [availableRangeEndExclusive, availableRangeStart, referenceDate, view]);

  return (
    <Card
      shadow="none"
      data-calendar-view={view}
      className={cn(
        "soft-panel relative overflow-hidden rounded-[2.15rem] border-0 shadow-none",
        className,
      )}
    >
      <CardBody className="relative z-10 gap-0 p-0">
        <CalendarHeader
          title={title}
          description={description}
          view={view}
          rangeLabel={rangeLabel}
          visibleDayLabel={visibleDayLabel}
          visibleEventCount={visibleEvents.length}
          supplementaryContent={headerAddon}
          canNavigatePrevious={canNavigatePrevious}
          canNavigateNext={canNavigateNext}
          onViewChange={setView}
          onPreviousPeriod={() => setReferenceDate((current) => shiftReferenceDate(current, view, -1))}
          onCurrentPeriod={() => setReferenceDate(new Date())}
          onNextPeriod={() => setReferenceDate((current) => shiftReferenceDate(current, view, 1))}
        />

        <div className="px-4 pb-4 pt-1 md:px-5 md:pb-5">
          {view === 'month' ? (
            <MonthGrid
              referenceDate={referenceDate}
              events={visibleEvents}
              locale={locale}
              isMobile={isMobile}
              onEventClick={onEventClick}
            />
          ) : (
            <WeekGrid
              days={calendarWindow.days}
              events={visibleEvents}
              startHour={normalizedStartHour}
              endHour={normalizedEndHour}
              locale={locale}
              isMobile={isMobile}
              onEventClick={onEventClick}
            />
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default Calendar;
