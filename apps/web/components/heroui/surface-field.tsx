'use client';

import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { parseDate, parseDateTime } from '@internationalized/date';
import type { DatePickerProps } from '@heroui/date-picker';
import { Checkbox } from '@heroui/react';
import { DatePicker } from '@heroui/react';
import { Input, Textarea } from '@heroui/input';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/cn';
import { mergeSlotClasses } from '@/lib/merge-slot-classes';

type InputClassNames = NonNullable<ComponentProps<typeof Input>['classNames']>;
type TextareaClassNames = NonNullable<ComponentProps<typeof Textarea>['classNames']>;
type CheckboxClassNames = NonNullable<ComponentProps<typeof Checkbox>['classNames']>;
type SurfaceDatePickerClassNames = NonNullable<DatePickerProps['classNames']>;
type SurfaceDateValue = ReturnType<typeof parseSurfaceCalendarDate>;
type SurfaceDateTimeValue = ReturnType<typeof parseSurfaceCalendarDateTime>;
const HeroDatePicker = DatePicker as any;

export type SurfaceInputUiVariant = 'default' | 'temporal';
export type SurfaceInputClassNames = InputClassNames;
export type SurfaceTextareaClassNames = TextareaClassNames;
export type SurfaceCheckboxClassNames = CheckboxClassNames;
export type SurfaceInputProps = ComponentProps<typeof Input> & {
  uiVariant?: SurfaceInputUiVariant;
};
export type SurfaceTextareaProps = ComponentProps<typeof Textarea>;
export type SurfaceCheckboxProps = ComponentProps<typeof Checkbox>;
export type SurfaceDatePickerProps = Omit<DatePickerProps, 'defaultValue' | 'name' | 'onChange' | 'value'> & {
  defaultValue?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  value?: string;
};
export type SurfaceDateTimePickerProps = Omit<
  DatePickerProps,
  'defaultValue' | 'name' | 'onChange' | 'value'
> & {
  defaultValue?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  value?: string;
};

export const surfaceInputClassNames: SurfaceInputClassNames = {
  label: 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate/60 dark:text-slate-400',
  inputWrapper:
    'min-h-[56px] rounded-[1.2rem] border border-white/70 bg-white/72 shadow-[0_18px_24px_-24px_rgba(15,23,42,0.22)] transition data-[hover=true]:border-[hsl(var(--primary)/0.34)] data-[hover=true]:bg-white/84 group-data-[focus=true]:border-[hsl(var(--primary)/0.42)] group-data-[focus=true]:bg-white/88 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none dark:data-[hover=true]:border-[hsl(var(--primary)/0.22)] dark:data-[hover=true]:bg-white/[0.08] dark:group-data-[focus=true]:border-[hsl(var(--primary)/0.3)] dark:group-data-[focus=true]:bg-white/[0.08]',
  input:
    'text-sm font-medium text-ink placeholder:text-slate/45 dark:text-slate-100 dark:placeholder:text-slate-500',
  description: 'text-xs text-slate/70 dark:text-slate-400',
  errorMessage: 'text-xs text-rose-600 dark:text-rose-300',
};

export const surfaceTemporalInputClassNames: SurfaceInputClassNames = {
  ...surfaceInputClassNames,
  input: cn(surfaceInputClassNames.input, 'temporal-placeholder-hidden'),
};

export const surfaceTextareaClassNames: SurfaceTextareaClassNames = {
  label: surfaceInputClassNames.label,
  inputWrapper: cn(surfaceInputClassNames.inputWrapper, 'py-2'),
  input: cn(surfaceInputClassNames.input, 'resize-y'),
  description: surfaceInputClassNames.description,
  errorMessage: surfaceInputClassNames.errorMessage,
};

export const surfaceCheckboxClassNames: SurfaceCheckboxClassNames = {
  base: 'group inline-flex max-w-fit items-center gap-2',
  wrapper:
    '!rounded-[4px] before:!rounded-[4px] after:!rounded-[4px] before:border before:border-white/65 before:bg-white/78 before:shadow-none group-data-[hover=true]:before:border-[hsl(var(--primary)/0.34)] group-data-[selected=true]:before:border-[hsl(var(--primary))] group-data-[selected=true]:before:bg-[hsl(var(--primary))] dark:before:border-white/25 dark:before:bg-white/[0.08] dark:group-data-[hover=true]:before:border-[hsl(var(--primary)/0.34)] dark:group-data-[selected=true]:before:border-[hsl(var(--primary))] dark:group-data-[selected=true]:before:bg-[hsl(var(--primary))]',
  label: 'text-sm font-medium text-ink dark:text-slate-100',
  icon: 'text-white',
};

export const surfaceDatePickerClassNames: SurfaceDatePickerClassNames = {
  base: 'w-full',
  label: surfaceInputClassNames.label,
  inputWrapper: cn(surfaceInputClassNames.inputWrapper, 'px-4'),
  input: 'flex items-center gap-0.5',
  innerWrapper: 'gap-2',
  segment:
    'rounded-[0.55rem] px-1 py-0.5 text-sm font-medium text-ink outline-none transition data-[placeholder=true]:text-slate/45 data-[editable=true]:text-ink data-[focused=true]:bg-[hsl(var(--primary)/0.14)] data-[focused=true]:text-ink dark:text-slate-100 dark:data-[placeholder=true]:text-slate-500 dark:data-[editable=true]:text-slate-100 dark:data-[focused=true]:bg-[hsl(var(--primary)/0.2)] dark:data-[focused=true]:text-white',
  helperWrapper: 'px-1 pt-2',
  description: surfaceInputClassNames.description,
  errorMessage: surfaceInputClassNames.errorMessage,
  selectorButton:
    'h-9 min-h-9 w-9 min-w-9 rounded-[0.95rem] border border-white/65 bg-white/78 text-slate/72 shadow-none transition data-[hover=true]:bg-white/90 data-[hover=true]:text-ink data-[pressed=true]:scale-[0.98] dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:data-[hover=true]:bg-white/[0.08] dark:data-[hover=true]:text-white',
  selectorIcon: 'h-4 w-4',
  popoverContent:
    'rounded-[1.45rem] border border-white/70 bg-white/96 p-0 shadow-[0_30px_70px_-34px_rgba(15,23,42,0.34)] dark:border-white/10 dark:bg-[rgb(17,12,30)]',
  calendar: 'p-3',
  calendarContent: 'p-0',
  timeInput: cn(surfaceInputClassNames.inputWrapper, 'min-h-[48px] px-3'),
  timeInputLabel: surfaceInputClassNames.label,
};

function padDateSegment(value: number, length = 2) {
  return String(value).padStart(length, '0');
}

function isTzAwareDateTime(value: string) {
  return /z$|[+-]\d{2}:\d{2}$/i.test(value);
}

export function parseSurfaceCalendarDate(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  try {
    return parseDate(normalized);
  } catch {
    return null;
  }
}

export function parseSurfaceCalendarDateTime(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  try {
    return parseDateTime(
      isTzAwareDateTime(normalized)
        ? normalized.replace(/z$/i, '').replace(/[+-]\d{2}:\d{2}$/i, '')
        : normalized,
    );
  } catch {
    return null;
  }
}

export function serializeSurfaceCalendarDate(value?: SurfaceDateValue) {
  return value ? value.toString() : '';
}

export function serializeSurfaceCalendarDateTime(value?: SurfaceDateTimeValue) {
  if (!value) {
    return '';
  }

  return `${padDateSegment(value.year, 4)}-${padDateSegment(value.month)}-${padDateSegment(
    value.day,
  )}T${padDateSegment(value.hour)}:${padDateSegment(value.minute)}`;
}

function useSurfaceDateValue<TValue>(
  value: string | undefined,
  defaultValue: string | undefined,
  parseValue: (raw?: string | null) => TValue | null,
) {
  const [uncontrolledValue, setUncontrolledValue] = useState<TValue | null>(() =>
    parseValue(defaultValue),
  );
  const isControlled = value !== undefined;

  useEffect(() => {
    if (isControlled) {
      return;
    }

    setUncontrolledValue(parseValue(defaultValue));
  }, [defaultValue, isControlled, parseValue]);

  return {
    isControlled,
    setUncontrolledValue,
    value: isControlled ? parseValue(value) : uncontrolledValue,
  };
}

export function SurfaceInput({ uiVariant = 'default', classNames, ...props }: SurfaceInputProps) {
  const inputClassNames =
    uiVariant === 'temporal' ? surfaceTemporalInputClassNames : surfaceInputClassNames;

  return <Input {...props} classNames={mergeSlotClasses(inputClassNames, classNames)} />;
}

export function SurfaceTextarea({ classNames, ...props }: SurfaceTextareaProps) {
  return (
    <Textarea {...props} classNames={mergeSlotClasses(surfaceTextareaClassNames, classNames)} />
  );
}

export function SurfaceCheckbox({ classNames, ...props }: SurfaceCheckboxProps) {
  return (
    <Checkbox
      {...props}
      radius="sm"
      size="sm"
      classNames={mergeSlotClasses(surfaceCheckboxClassNames, classNames)}
    />
  );
}

export function SurfaceDatePicker({
  classNames,
  defaultValue,
  name,
  onValueChange,
  selectorIcon = <CalendarDays className="h-4 w-4" />,
  value,
  ...props
}: SurfaceDatePickerProps) {
  const state = useSurfaceDateValue(value, defaultValue, parseSurfaceCalendarDate);
  const serializedValue = serializeSurfaceCalendarDate(state.value);

  return (
    <>
      {name ? <input type="hidden" name={name} value={serializedValue} /> : null}
      <HeroDatePicker
        {...props}
        selectorIcon={selectorIcon}
        value={state.value}
        classNames={mergeSlotClasses(surfaceDatePickerClassNames, classNames)}
        onChange={(nextValue: unknown) => {
          if (!state.isControlled) {
            state.setUncontrolledValue(nextValue as SurfaceDateValue);
          }

          onValueChange?.(serializeSurfaceCalendarDate(nextValue as SurfaceDateValue));
        }}
      />
    </>
  );
}

export function SurfaceDateTimePicker({
  classNames,
  defaultValue,
  hideTimeZone = true,
  hourCycle = 24,
  name,
  onValueChange,
  selectorIcon = <CalendarDays className="h-4 w-4" />,
  value,
  ...props
}: SurfaceDateTimePickerProps) {
  const state = useSurfaceDateValue(value, defaultValue, parseSurfaceCalendarDateTime);
  const serializedValue = serializeSurfaceCalendarDateTime(state.value);

  return (
    <>
      {name ? <input type="hidden" name={name} value={serializedValue} /> : null}
      <HeroDatePicker
        {...props}
        granularity="minute"
        hideTimeZone={hideTimeZone}
        hourCycle={hourCycle}
        selectorIcon={selectorIcon}
        value={state.value}
        classNames={mergeSlotClasses(surfaceDatePickerClassNames, classNames)}
        onChange={(nextValue: unknown) => {
          if (!state.isControlled) {
            state.setUncontrolledValue(nextValue as SurfaceDateTimeValue);
          }

          onValueChange?.(serializeSurfaceCalendarDateTime(nextValue as SurfaceDateTimeValue));
        }}
      />
    </>
  );
}
