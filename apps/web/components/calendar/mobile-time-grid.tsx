'use client';

import { Button } from '@heroui/button';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import type { CalendarEvent } from './calendar';
import { EventCard } from './event-card';

interface MobileTimeGridProps {
  days: Date[];
  events: CalendarEvent[];
  startHour: number;
  endHour: number;
  locale: string;
  onEventClick?: ((event: CalendarEvent) => void) | undefined;
}

interface DayEventSegment {
  event: CalendarEvent;
  renderStart: Date;
  renderEnd: Date;
}

interface DayEventLayoutSegment extends DayEventSegment {
  columnIndex: number;
  columnCount: number;
}

const SLOT_MINUTES = 30;
const PIXELS_PER_MINUTE = 1.1;

function startOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function createDayBoundary(date: Date, hour = 0) {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return next;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatWeekday(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).replace('.', '');
}

function formatDayNumber(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date);
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

function formatTimeLabel(totalMinutes: number, locale: string) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const value = new Date(2026, 0, 1, hours, minutes, 0, 0);

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);
}

function eventOverlapsDay(event: CalendarEvent, day: Date) {
  const dayStart = startOfDay(day);
  const dayEndExclusive = createDayBoundary(day, 24);

  return event.end.getTime() > dayStart.getTime() && event.start.getTime() < dayEndExclusive.getTime();
}

function resolveInitialSelectedDate(days: Date[]) {
  const today = new Date();
  const todayMatch = days.find((day) => isSameDay(day, today));
  return startOfDay(todayMatch ?? days[0] ?? today);
}

export function MobileTimeGrid({
  days,
  events,
  startHour,
  endHour,
  locale,
  onEventClick,
}: MobileTimeGridProps) {
  const totalMinutes = (endHour - startHour) * 60;
  const gridHeight = totalMinutes * PIXELS_PER_MINUTE;
  const initialSelectedDate = useMemo(() => resolveInitialSelectedDate(days), [days]);
  const initialSelectedKey = useMemo(() => initialSelectedDate.toISOString(), [initialSelectedDate]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(initialSelectedKey));
  const [liveNow, setLiveNow] = useState<Date | null>(null);
  const isWeekly = days.length > 1;

  useEffect(() => {
    setSelectedDate(new Date(initialSelectedKey));
  }, [initialSelectedKey]);

  useEffect(() => {
    const updateNow = () => setLiveNow(new Date());

    updateNow();
    const intervalId = window.setInterval(updateNow, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const eventCountByDay = useMemo(
    () =>
      new Map(
        days.map((day) => [
          startOfDay(day).toISOString(),
          events.filter((event) => eventOverlapsDay(event, day)).length,
        ]),
      ),
    [days, events],
  );

  const slotOffsets = useMemo(
    () =>
      Array.from(
        { length: Math.floor(totalMinutes / SLOT_MINUTES) + 1 },
        (_, index) => index * SLOT_MINUTES,
      ),
    [totalMinutes],
  );

  const hourOffsets = useMemo(
    () => slotOffsets.filter((offset) => offset % 60 === 0),
    [slotOffsets],
  );

  const dayStart = useMemo(() => createDayBoundary(selectedDate), [selectedDate]);
  const dayEnd = useMemo(() => createDayBoundary(selectedDate, 24), [selectedDate]);
  const calendarStart = useMemo(() => createDayBoundary(selectedDate, startHour), [selectedDate, startHour]);
  const calendarEnd = useMemo(() => createDayBoundary(selectedDate, endHour), [selectedDate, endHour]);

  const visibleSegments = useMemo<DayEventSegment[]>(
    () =>
      events
        .filter(
          (event) =>
            event.end.getTime() > dayStart.getTime() && event.start.getTime() < dayEnd.getTime(),
        )
        .map((event) => {
          const renderStart = new Date(
            Math.max(event.start.getTime(), calendarStart.getTime(), dayStart.getTime()),
          );
          const renderEnd = new Date(
            Math.min(event.end.getTime(), calendarEnd.getTime(), dayEnd.getTime()),
          );

          if (renderEnd.getTime() <= renderStart.getTime()) {
            return null;
          }

          return {
            event,
            renderStart,
            renderEnd,
          };
        })
        .filter((item): item is DayEventSegment => item !== null)
        .sort((left, right) => left.renderStart.getTime() - right.renderStart.getTime()),
    [calendarEnd, calendarStart, dayEnd, dayStart, events],
  );

  const positionedSegments = useMemo<DayEventLayoutSegment[]>(() => {
    const segments = visibleSegments.map((segment) => ({
      ...segment,
      columnIndex: 0,
      columnCount: 1,
    }));
    let active: DayEventLayoutSegment[] = [];
    let cluster: DayEventLayoutSegment[] = [];
    let clusterMaxColumns = 1;

    const finalizeCluster = () => {
      const resolvedColumns = Math.max(1, clusterMaxColumns);
      cluster.forEach((segment) => {
        segment.columnCount = resolvedColumns;
      });
      cluster = [];
      clusterMaxColumns = 1;
    };

    segments.forEach((segment) => {
      active = active.filter(
        (activeSegment) => activeSegment.renderEnd.getTime() > segment.renderStart.getTime(),
      );

      if (active.length === 0 && cluster.length > 0) {
        finalizeCluster();
      }

      const occupiedColumns = new Set(active.map((activeSegment) => activeSegment.columnIndex));
      let nextColumnIndex = 0;

      while (occupiedColumns.has(nextColumnIndex)) {
        nextColumnIndex += 1;
      }

      segment.columnIndex = nextColumnIndex;
      active.push(segment);
      cluster.push(segment);
      clusterMaxColumns = Math.max(clusterMaxColumns, active.length, nextColumnIndex + 1);
    });

    if (cluster.length > 0) {
      finalizeCluster();
    }

    return segments;
  }, [visibleSegments]);

  const nowPosition = useMemo(() => {
    if (!liveNow) {
      return null;
    }

    if (!isSameDay(selectedDate, liveNow)) {
      return null;
    }

    if (liveNow.getTime() <= calendarStart.getTime() || liveNow.getTime() >= calendarEnd.getTime()) {
      return null;
    }

    return ((liveNow.getTime() - calendarStart.getTime()) / 60000) * PIXELS_PER_MINUTE;
  }, [calendarEnd, calendarStart, liveNow, selectedDate]);

  return (
    <div
      data-mobile-time-grid={isWeekly ? 'week' : 'day'}
      className="relative overflow-hidden rounded-[1.7rem] bg-white/35 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.1)] dark:bg-[rgba(16,10,28,0.96)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.5)] md:hidden"
    >
      <div className="relative space-y-3 rounded-[1.45rem] bg-white/30 p-3 dark:bg-[rgba(12,7,22,0.94)]">
        {isWeekly ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate/56 dark:text-slate-300/56">
                  Semana en foco
                </p>
                <p className="mt-1 text-sm font-semibold capitalize text-ink dark:text-slate-50">
                  {formatSelectedDay(selectedDate, locale)}
                </p>
              </div>
              <span className="meta-chip border-transparent bg-white/10 text-slate/76 dark:bg-white/[0.04] dark:text-violet-100/82">
                {visibleSegments.length} bloques
              </span>
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {days.map((day) => {
                const normalizedDay = startOfDay(day);
                const isActive = isSameDay(day, selectedDate);
                const eventCount = eventCountByDay.get(normalizedDay.toISOString()) ?? 0;

                return (
                  <Button
                    key={normalizedDay.toISOString()}
                    radius="lg"
                    variant="flat"
                    aria-label={`${formatSelectedDay(day, locale)}${eventCount ? `, ${eventCount} bloques` : ''}`}
                    className={cn(
                      'h-auto min-w-[4.75rem] shrink-0 flex-col items-start gap-1 rounded-[1.25rem] px-3 py-2.5 text-left shadow-none',
                      isActive
                        ? 'bg-white/18 text-ink shadow-[0_18px_30px_-24px_rgba(15,23,42,0.2)] dark:bg-violet-500/[0.18] dark:text-violet-50'
                        : 'bg-white/8 text-slate/82 dark:bg-white/[0.03] dark:text-slate-200/78',
                    )}
                    onPress={() => setSelectedDate(normalizedDay)}
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-[0.16em] opacity-70">
                      {formatWeekday(day, locale)}
                    </span>
                    <span className="text-lg font-semibold leading-none">{formatDayNumber(day, locale)}</span>
                    <span className="text-[10px] font-medium opacity-65">
                      {eventCount > 0 ? `${eventCount} act.` : 'Libre'}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-[1.3rem] bg-white/12 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:bg-white/[0.03] dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-white/18 text-xl font-semibold text-ink shadow-[0_14px_24px_-20px_rgba(15,23,42,0.18)] dark:bg-violet-500/[0.16] dark:text-violet-50 dark:shadow-none">
                {formatDayNumber(selectedDate, locale)}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate/56 dark:text-slate-300/56">
                  Vista diaria
                </p>
                <p className="mt-1 text-sm font-semibold capitalize text-ink dark:text-slate-50">
                  {formatSelectedDay(selectedDate, locale)}
                </p>
              </div>
            </div>
            <span className="meta-chip border-transparent bg-white/10 text-slate/76 dark:bg-white/[0.04] dark:text-violet-100/82">
              {visibleSegments.length} bloques
            </span>
          </div>
        )}

        <div className="relative overflow-hidden rounded-[1.35rem] bg-white/16 dark:bg-[rgba(13,8,24,0.96)]">
          <div className="max-h-[32rem] overflow-auto">
            <div className="grid grid-cols-[3.25rem_minmax(0,1fr)]">
              <div className="relative bg-white/6 dark:bg-white/[0.015]">
                <div className="relative" style={{ height: gridHeight }}>
                  {hourOffsets.map((offset) => {
                    const top = offset * PIXELS_PER_MINUTE;

                    return (
                      <div
                        key={`mobile-time-${offset}`}
                        className="pointer-events-none absolute inset-x-0 px-2.5"
                        style={{ top: Math.min(gridHeight - 18, Math.max(top - 7, 0)) }}
                      >
                        <span className="block text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate/42 dark:text-slate-300/42">
                          {formatTimeLabel(startHour * 60 + offset, locale)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="relative border-l border-white/10 dark:border-white/[0.05]">
                <div className="relative" style={{ height: gridHeight }}>
                  {hourOffsets.map((offset, index) => (
                    <div
                      key={`mobile-hour-band-${offset}`}
                      className={cn(
                        'pointer-events-none absolute inset-x-0',
                        index % 2 === 0
                          ? 'bg-slate-900/[0.008] dark:bg-violet-400/[0.016]'
                          : 'bg-transparent',
                      )}
                      style={{
                        top: offset * PIXELS_PER_MINUTE,
                        height: 60 * PIXELS_PER_MINUTE,
                      }}
                    />
                  ))}

                  {slotOffsets.map((offset) => (
                    <div
                      key={`mobile-slot-line-${offset}`}
                      className={cn(
                        'pointer-events-none absolute inset-x-0 border-t',
                        offset % 60 === 0
                          ? 'border-slate-900/[0.05] dark:border-white/[0.05]'
                          : 'border-slate-900/[0.024] dark:border-white/[0.025]',
                      )}
                      style={{ top: offset * PIXELS_PER_MINUTE }}
                    />
                  ))}

                  {nowPosition !== null ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20"
                      style={{ top: nowPosition }}
                    >
                      <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-violet-400/20 dark:bg-violet-400/30" />
                      <div className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-violet-500 shadow-[0_0_0_6px_rgba(139,92,246,0.14)] dark:border-[rgba(12,7,22,0.96)] dark:bg-violet-300" />
                      <div className="h-px bg-violet-400/72 dark:bg-violet-200/88" />
                    </div>
                  ) : null}

                  {positionedSegments.map((segment) => {
                    const top =
                      ((segment.renderStart.getTime() - calendarStart.getTime()) / 60000) * PIXELS_PER_MINUTE;
                    const height =
                      ((segment.renderEnd.getTime() - segment.renderStart.getTime()) / 60000) *
                      PIXELS_PER_MINUTE;
                    const width =
                      segment.columnCount > 1
                        ? `calc(${100 / segment.columnCount}% - 0.32rem)`
                        : 'calc(100% - 0.8rem)';
                    const left =
                      segment.columnCount > 1
                        ? `calc(${(segment.columnIndex * 100) / segment.columnCount}% + 0.18rem)`
                        : '0.4rem';

                    return (
                      <div
                        key={`${segment.event.id}-${segment.renderStart.toISOString()}`}
                        className="absolute z-10"
                        style={{ top, height, left, width }}
                      >
                        <EventCard
                          event={segment.event}
                          locale={locale}
                          height={height}
                          compact={segment.columnCount > 1 || height < 112}
                          onClick={onEventClick}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {visibleSegments.length === 0 ? (
          <div className="rounded-[1.15rem] bg-white/8 px-3 py-3 text-sm text-slate/74 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:bg-white/[0.025] dark:text-slate-300/78 dark:shadow-none">
            No hay bloques para este dia en el rango visible.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default MobileTimeGrid;
