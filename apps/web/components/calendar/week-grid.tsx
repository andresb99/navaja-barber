'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import type { CalendarEvent } from './calendar';
import { DayColumn } from './day-column';
import { MobileTimeGrid } from './mobile-time-grid';

interface WeekGridProps {
  days: Date[];
  events: CalendarEvent[];
  startHour: number;
  endHour: number;
  locale: string;
  isMobile?: boolean;
  onEventClick?: ((event: CalendarEvent) => void) | undefined;
}

const SLOT_MINUTES = 30;
const PIXELS_PER_MINUTE = 1.35;

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

function formatDayDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
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

export function WeekGrid({
  days,
  events,
  startHour,
  endHour,
  locale,
  isMobile = false,
  onEventClick,
}: WeekGridProps) {
  const today = new Date();
  const totalMinutes = (endHour - startHour) * 60;
  const gridHeight = totalMinutes * PIXELS_PER_MINUTE;
  const dayTemplateColumn =
    days.length === 1 ? 'minmax(22rem, 1fr)' : days.length <= 3 ? 'minmax(14rem, 1fr)' : 'minmax(10.5rem, 1fr)';
  const gridTemplateColumns = `4.4rem repeat(${days.length}, ${dayTemplateColumn})`;
  const contentMinWidthClass =
    days.length === 1 ? 'min-w-[30rem]' : days.length <= 3 ? 'min-w-[44rem]' : 'min-w-[72rem]';

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

  if (isMobile) {
    return (
      <MobileTimeGrid
        days={days}
        events={events}
        startHour={startHour}
        endHour={endHour}
        locale={locale}
        onEventClick={onEventClick}
      />
    );
  }

  return (
    <div className="relative hidden overflow-hidden rounded-[1.9rem] bg-white/20 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.1)] dark:bg-[rgba(14,9,24,0.7)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.5)] md:block">
      <div className="relative max-h-[40rem] overflow-auto rounded-[1.55rem] bg-white/20 dark:bg-[rgba(13,8,24,0.92)]">
        <div className={contentMinWidthClass}>
          <div
            className="sticky top-0 z-30 grid border-b border-white/10 bg-white/60 dark:border-white/[0.04] dark:bg-[rgba(14,9,24,0.95)]"
            style={{ gridTemplateColumns }}
          >
            <div className="sticky left-0 z-30 flex items-center border-r border-white/10 bg-white/20 px-3 py-3 dark:border-white/[0.04] dark:bg-[rgba(14,9,24,0.85)]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate/54 dark:text-slate-300/58">
                Hora
              </span>
            </div>

            {days.map((day) => {
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-r border-white/10 px-4 py-3 last:border-r-0 dark:border-white/[0.04]',
                    isToday
                      ? 'bg-white/25 dark:bg-violet-500/[0.08]'
                      : 'bg-white/14 dark:bg-white/[0.02]',
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/54 dark:text-slate-300/56">
                    {formatWeekday(day, locale)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className={cn(
                        'inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-transparent px-3.5 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
                        isToday
                          ? 'bg-white/14 text-ink shadow-[0_0_0_1px_rgba(139,92,246,0.04)] dark:bg-violet-500/[0.18] dark:text-violet-50 dark:shadow-[0_14px_26px_-22px_rgba(139,92,246,0.36)]'
                          : 'bg-white/8 text-ink dark:bg-white/[0.035] dark:text-slate-100 dark:shadow-none',
                      )}
                    >
                      {formatDayDate(day, locale)}
                    </div>
                    {isToday ? (
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:bg-fuchsia-500/[0.12] dark:text-violet-100">
                        Hoy
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid" style={{ gridTemplateColumns }}>
            <div className="sticky left-0 z-20 border-r border-white/10 bg-white/16 dark:border-white/[0.04] dark:bg-[rgba(12,7,22,0.85)]">
              <div className="relative" style={{ height: gridHeight }}>
                {hourOffsets.map((offset) => {
                  const top = offset * PIXELS_PER_MINUTE;
                  const labelTop = Math.min(gridHeight - 18, Math.max(top - 7, 0));

                  return (
                    <div
                      key={`time-${offset}`}
                      className="pointer-events-none absolute inset-x-0 px-3"
                      style={{ top: labelTop }}
                    >
                      <span className="block text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate/44 dark:text-slate-300/42">
                        {formatTimeLabel(startHour * 60 + offset, locale)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {days.map((day) => (
              <DayColumn
                key={day.toISOString()}
                date={day}
                events={events}
                startHour={startHour}
                endHour={endHour}
                pixelsPerMinute={PIXELS_PER_MINUTE}
                slotMinutes={SLOT_MINUTES}
                locale={locale}
                isToday={isSameDay(day, today)}
                onEventClick={onEventClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
