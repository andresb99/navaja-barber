'use client';

import type { ReactNode } from 'react';
import { Button } from '@heroui/button';
import { cn } from '@/lib/cn';
import type { CalendarView } from './calendar';
import { CALENDAR_EVENT_TONE_LEGEND } from './event-tone';

interface CalendarHeaderProps {
  title: string;
  description: string;
  view: CalendarView;
  rangeLabel: string;
  visibleDayLabel: string;
  visibleEventCount: number;
  supplementaryContent?: ReactNode;
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
  onViewChange: (view: CalendarView) => void;
  onPreviousPeriod: () => void;
  onCurrentPeriod: () => void;
  onNextPeriod: () => void;
}

const VIEW_OPTIONS: Array<{ id: CalendarView; label: string }> = [
  { id: 'day', label: 'Dia' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
];

const VIEW_COPY: Record<
  CalendarView,
  {
    eyebrow: string;
    previousLabel: string;
    nextLabel: string;
  }
> = {
  day: {
    eyebrow: 'Vista diaria',
    previousLabel: 'Dia anterior',
    nextLabel: 'Dia siguiente',
  },
  week: {
    eyebrow: 'Vista semanal',
    previousLabel: 'Semana anterior',
    nextLabel: 'Semana siguiente',
  },
  month: {
    eyebrow: 'Vista mensual',
    previousLabel: 'Mes anterior',
    nextLabel: 'Mes siguiente',
  },
};

function CalendarGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.15rem] w-[1.15rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.75" y="5.25" width="16.5" height="14.5" rx="3.2" />
      <path d="M8 3.75v3" />
      <path d="M16 3.75v3" />
      <path d="M3.75 9.5h16.5" />
      <path d="M8.5 13h.01" />
      <path d="M12 13h.01" />
      <path d="M15.5 13h.01" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === 'left' ? <path d="M9.75 3.5 5.25 8l4.5 4.5" /> : <path d="M6.25 3.5 10.75 8l-4.5 4.5" />}
    </svg>
  );
}

function LegendPill({
  label,
  dotClassName,
}: {
  label: string;
  dotClassName: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:bg-white/[0.03] dark:shadow-none">
      <span className={cn('h-2 w-2 rounded-full ring-2 ring-white/55 dark:ring-white/10', dotClassName)} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/72 dark:text-slate-200/78">
        {label}
      </span>
    </div>
  );
}

export function CalendarHeader({
  title,
  description,
  view,
  rangeLabel,
  visibleDayLabel,
  visibleEventCount,
  supplementaryContent,
  canNavigatePrevious,
  canNavigateNext,
  onViewChange,
  onPreviousPeriod,
  onCurrentPeriod,
  onNextPeriod,
}: CalendarHeaderProps) {
  const currentViewCopy = VIEW_COPY[view];

  return (
    <div className="relative overflow-hidden border-b border-white/10 px-4 pb-4 pt-4 dark:border-white/[0.04] md:px-6 md:pb-6 md:pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/30 to-transparent dark:from-violet-500/[0.06] dark:to-transparent" />

      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-white/8 text-ink shadow-[0_14px_32px_-24px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] dark:bg-violet-500/[0.09] dark:text-violet-100 dark:shadow-[0_18px_28px_-22px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.03)] md:h-14 md:w-14 md:rounded-[1.35rem]">
              <CalendarGlyph />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate/58 dark:text-slate-400">
                  {currentViewCopy.eyebrow}
                </span>
                <span className="meta-chip border-transparent bg-white/8 text-slate/76 dark:bg-white/[0.03] dark:text-violet-100/82">
                  {visibleEventCount} eventos visibles
                </span>
              </div>

              <h2 className="mt-2 text-[clamp(1.35rem,6vw,2rem)] font-semibold tracking-[-0.03em] text-ink dark:text-slate-50">
                {title}
              </h2>
              <p className="mt-2 max-w-3xl text-[13px] leading-5 text-slate/82 dark:text-slate-300/88 md:text-sm md:leading-6">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col items-start gap-3 xl:w-auto xl:min-w-[21rem] xl:flex-none xl:items-end xl:pl-6">
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <span className="meta-chip border-transparent bg-white/8 text-slate/76 dark:bg-white/[0.03] dark:text-violet-100/82">
              {rangeLabel}
            </span>
            <span className="meta-chip border-transparent bg-white/8 text-slate/76 dark:bg-white/[0.03] dark:text-violet-100/82">
              {visibleDayLabel}
            </span>
          </div>

          <div className="-mx-1 w-[calc(100%+0.5rem)] overflow-x-auto px-1 xl:mx-0 xl:w-auto xl:overflow-visible xl:px-0">
            <div className="inline-flex min-w-max gap-1 rounded-full bg-white/6 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:bg-white/[0.03] dark:shadow-none">
              {VIEW_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  radius="full"
                  variant="flat"
                  className={cn(
                    'h-10 border border-transparent px-4 text-xs font-semibold uppercase tracking-[0.12em] whitespace-nowrap',
                    view === option.id
                      ? 'bg-white/16 text-ink shadow-[0_12px_20px_-18px_rgba(15,23,42,0.14)] dark:bg-violet-500/[0.16] dark:text-violet-50'
                      : 'bg-transparent text-slate/74 dark:text-slate-200/78',
                  )}
                  onPress={() => onViewChange(option.id)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="inline-flex items-center gap-1 rounded-full bg-white/6 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:bg-white/[0.03] dark:shadow-none">
            <Button
              isIconOnly
              size="sm"
              radius="full"
              variant="light"
              aria-label={currentViewCopy.previousLabel}
              isDisabled={!canNavigatePrevious}
              className="h-10 w-10 border border-transparent bg-transparent text-slate/74 shadow-none disabled:opacity-45 dark:text-slate-200/78"
              onPress={onPreviousPeriod}
            >
              <ChevronIcon direction="left" />
            </Button>
            <Button
              size="sm"
              radius="full"
              variant="flat"
              className="h-10 border border-transparent bg-white/14 px-4 text-sm font-semibold text-ink shadow-[0_12px_20px_-18px_rgba(15,23,42,0.14)] dark:bg-violet-500/[0.12] dark:text-violet-50 dark:shadow-none"
              onPress={onCurrentPeriod}
            >
              Hoy
            </Button>
            <Button
              isIconOnly
              size="sm"
              radius="full"
              variant="light"
              aria-label={currentViewCopy.nextLabel}
              isDisabled={!canNavigateNext}
              className="h-10 w-10 border border-transparent bg-transparent text-slate/74 shadow-none disabled:opacity-45 dark:text-slate-200/78"
              onPress={onNextPeriod}
            >
              <ChevronIcon direction="right" />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative mt-5 flex flex-col gap-4">
        <div className="-mx-1 hidden overflow-x-auto px-1 pb-1 md:flex md:flex-wrap md:items-center md:gap-2 md:overflow-visible md:px-0 md:pb-0">
          {CALENDAR_EVENT_TONE_LEGEND.map((item) => (
            <LegendPill key={item.label} label={item.label} dotClassName={item.dotClassName} />
          ))}
        </div>

        {supplementaryContent ? <div className="min-w-0">{supplementaryContent}</div> : null}
      </div>
    </div>
  );
}

export default CalendarHeader;
