'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import type { CalendarEvent } from './calendar';
import {
  CALENDAR_EVENT_TONE_MONTH_CLASSNAME,
  resolveCalendarEventTone,
} from './event-tone';

interface MobileMonthGridProps {
  referenceDate: Date;
  events: CalendarEvent[];
  locale: string;
  onEventClick?: ((event: CalendarEvent) => void) | undefined;
}

const DAYS_IN_WEEK = 7;
const WEEK_STARTS_ON = 1;
const MAX_PREVIEW_EVENTS = 2;

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

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function formatWeekdayNarrow(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date);
}

function formatSelectedDay(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
    .format(date)
    .replace('.', '');
}

function formatTime(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);
}

function eventOverlapsDay(event: CalendarEvent, day: Date) {
  const dayStart = startOfDay(day);
  const dayEndExclusive = addDays(dayStart, 1);

  return event.end.getTime() > dayStart.getTime() && event.start.getTime() < dayEndExclusive.getTime();
}

function buildMonthEventLabel(event: CalendarEvent, locale: string) {
  const baseLabel = event.clientName?.trim() || event.title;
  return `${formatTime(event.start, locale)} ${baseLabel}`;
}

function resolveInitialSelectedDay(referenceDate: Date, monthStart: Date, monthEndExclusive: Date) {
  const today = startOfDay(new Date());

  if (today.getTime() >= monthStart.getTime() && today.getTime() < monthEndExclusive.getTime()) {
    return today;
  }

  const normalizedReference = startOfDay(referenceDate);

  if (
    normalizedReference.getTime() >= monthStart.getTime() &&
    normalizedReference.getTime() < monthEndExclusive.getTime()
  ) {
    return normalizedReference;
  }

  return monthStart;
}

export function MobileMonthGrid({
  referenceDate,
  events,
  locale,
  onEventClick,
}: MobileMonthGridProps) {
  const today = new Date();
  const monthStart = useMemo(() => startOfMonth(referenceDate), [referenceDate]);
  const monthEndExclusive = useMemo(() => startOfMonth(addMonths(monthStart, 1)), [monthStart]);
  const firstGridDay = useMemo(() => startOfWeek(monthStart), [monthStart]);
  const lastGridDay = useMemo(
    () => addDays(startOfWeek(addDays(monthEndExclusive, -1)), DAYS_IN_WEEK - 1),
    [monthEndExclusive],
  );
  const initialSelectedDay = useMemo(
    () => resolveInitialSelectedDay(referenceDate, monthStart, monthEndExclusive),
    [monthEndExclusive, monthStart, referenceDate],
  );
  const initialSelectedKey = useMemo(() => initialSelectedDay.toISOString(), [initialSelectedDay]);
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date(initialSelectedKey));

  useEffect(() => {
    setSelectedDay(new Date(initialSelectedKey));
  }, [initialSelectedKey]);

  const weekdayHeaders = useMemo(
    () => Array.from({ length: DAYS_IN_WEEK }, (_, index) => addDays(firstGridDay, index)),
    [firstGridDay],
  );

  const gridDays = useMemo(() => {
    const days: Date[] = [];
    let cursor = firstGridDay;

    while (cursor.getTime() <= lastGridDay.getTime()) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }

    return days;
  }, [firstGridDay, lastGridDay]);

  const selectedDayEvents = useMemo(
    () =>
      events
        .filter((event) => eventOverlapsDay(event, selectedDay))
        .sort((left, right) => left.start.getTime() - right.start.getTime()),
    [events, selectedDay],
  );

  return (
    <div
      data-mobile-month-grid="true"
      className="relative overflow-hidden rounded-[1.7rem] bg-white/35 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.1)] dark:bg-[rgba(16,10,28,0.96)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.5)] md:hidden"
    >
      <div className="relative space-y-3 rounded-[1.45rem] bg-white/30 p-3 dark:bg-[rgba(12,7,22,0.94)]">
        <div className="grid grid-cols-7 gap-1 px-0.5">
          {weekdayHeaders.map((day) => (
            <span
              key={day.toISOString()}
              className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/54 dark:text-slate-300/54"
            >
              {formatWeekdayNarrow(day, locale)}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {gridDays.map((day) => {
            const dayEvents = events
              .filter((event) => eventOverlapsDay(event, day))
              .sort((left, right) => left.start.getTime() - right.start.getTime());
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isActive = isSameDay(day, selectedDay);

            return (
              <button
                key={day.toISOString()}
                type="button"
                aria-label={`${formatSelectedDay(day, locale)}${dayEvents.length ? `, ${dayEvents.length} bloques` : ''}`}
                className={cn(
                  'relative flex min-h-[5.35rem] flex-col rounded-[1.15rem] p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/25',
                  isCurrentMonth
                    ? 'bg-white/10 dark:bg-white/[0.025]'
                    : 'bg-white/[0.04] opacity-70 dark:bg-white/[0.01] dark:opacity-60',
                  isActive &&
                    'bg-white/18 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.2)] dark:bg-violet-500/[0.12] dark:shadow-[0_18px_28px_-22px_rgba(0,0,0,0.46)]',
                )}
                onClick={() => setSelectedDay(startOfDay(day))}
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={cn(
                      'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-semibold',
                      isToday
                        ? 'bg-white/72 text-violet-700 dark:bg-violet-500/[0.2] dark:text-violet-50'
                        : 'text-ink dark:text-slate-100',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {dayEvents.length > MAX_PREVIEW_EVENTS ? (
                    <span className="text-[9px] font-semibold text-slate/56 dark:text-slate-300/58">
                      +{dayEvents.length - MAX_PREVIEW_EVENTS}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1.5 space-y-1">
                  {dayEvents.slice(0, MAX_PREVIEW_EVENTS).map((event) => {
                    const resolvedTone = resolveCalendarEventTone(event);

                    return (
                      <span
                        key={event.id}
                        data-event-tone={resolvedTone}
                        className={cn(
                          'block truncate rounded-[0.65rem] px-1.5 py-1 text-[8px] font-semibold leading-3',
                          CALENDAR_EVENT_TONE_MONTH_CLASSNAME[resolvedTone],
                        )}
                      >
                        {buildMonthEventLabel(event, locale)}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-[1.3rem] bg-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:bg-white/[0.025] dark:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate/56 dark:text-slate-300/56">
                Dia seleccionado
              </p>
              <p className="mt-1 text-sm font-semibold capitalize text-ink dark:text-slate-50">
                {formatSelectedDay(selectedDay, locale)}
              </p>
            </div>
            <span className="meta-chip border-transparent bg-white/10 text-slate/76 dark:bg-white/[0.04] dark:text-violet-100/82">
              {selectedDayEvents.length} bloques
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((event) => {
                const resolvedTone = resolveCalendarEventTone(event);

                return (
                  <button
                    key={event.id}
                    type="button"
                    data-event-tone={resolvedTone}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-[1rem] px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/25',
                      CALENDAR_EVENT_TONE_MONTH_CLASSNAME[resolvedTone],
                      onEventClick ? 'cursor-pointer' : 'cursor-default',
                    )}
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {event.clientName?.trim() || event.title}
                      </p>
                      <p className="mt-1 truncate text-[11px] font-medium opacity-78">
                        {event.title}
                        {event.resourceName ? ` · ${event.resourceName}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold">
                      {formatTime(event.start, locale)}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-slate/74 dark:text-slate-300/78">
                No hay reservas ni ausencias para este dia.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileMonthGrid;
