'use client';

import { Select, type SelectProps } from '@heroui/select';
import { cn } from '@/lib/cn';

type AdminSelectUiVariant = 'default' | 'compact';
type SelectClassNames = NonNullable<SelectProps<object>['classNames']>;
type SelectListboxProps = NonNullable<SelectProps<object>['listboxProps']>;
type SelectListboxClassNames = NonNullable<SelectListboxProps['classNames']>;
type SelectItemClassNames = NonNullable<SelectListboxProps['itemClasses']>;

export interface AdminSelectProps<T extends object = object> extends SelectProps<T> {
  uiVariant?: AdminSelectUiVariant;
}

const defaultSelectClassNames: SelectClassNames = {
  label: 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate/60 dark:text-slate-400',
  trigger:
    'min-h-[56px] rounded-[1.2rem] border border-white/70 bg-white/72 shadow-[0_18px_24px_-24px_rgba(15,23,42,0.22)] transition data-[hover=true]:border-[hsl(var(--primary)/0.34)] data-[hover=true]:bg-white/84 data-[focus=true]:border-[hsl(var(--primary)/0.42)] data-[focus=true]:bg-white/88 data-[open=true]:border-[hsl(var(--primary)/0.34)] data-[open=true]:bg-white/86 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none dark:data-[hover=true]:border-[hsl(var(--primary)/0.22)] dark:data-[hover=true]:bg-white/[0.08] dark:data-[focus=true]:border-[hsl(var(--primary)/0.3)] dark:data-[focus=true]:bg-white/[0.08] dark:data-[open=true]:border-[hsl(var(--primary)/0.24)] dark:data-[open=true]:bg-white/[0.08]',
  value: 'text-sm font-medium text-ink dark:text-slate-100',
  selectorIcon:
    'text-slate/60 transition-transform duration-150 group-data-[open=true]:text-[hsl(var(--primary))] dark:text-slate-400 dark:group-data-[open=true]:text-[hsl(var(--primary))]',
  popoverContent:
    'admin-premium-card overflow-hidden rounded-[1.35rem] border border-white/80 p-1 dark:border-white/10',
  listboxWrapper: 'max-h-72 p-0',
  description: 'text-xs text-slate/70 dark:text-slate-400',
  errorMessage: 'text-xs text-rose-600 dark:text-rose-300',
};

const compactSelectClassNames: SelectClassNames = {
  ...defaultSelectClassNames,
  label:
    'text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300/90 dark:text-slate-300/90',
  trigger:
    'h-11 min-h-[44px] rounded-xl border border-white/12 bg-white/[0.06] shadow-none transition data-[hover=true]:border-[hsl(var(--primary)/0.22)] data-[hover=true]:bg-white/[0.08] data-[focus=true]:border-[hsl(var(--primary)/0.28)] data-[focus=true]:bg-white/[0.08] data-[open=true]:border-[hsl(var(--primary)/0.24)] data-[open=true]:bg-white/[0.08] dark:border-white/12 dark:bg-white/[0.05] dark:data-[hover=true]:border-[hsl(var(--primary)/0.24)] dark:data-[hover=true]:bg-white/[0.08] dark:data-[focus=true]:border-[hsl(var(--primary)/0.3)] dark:data-[focus=true]:bg-white/[0.08] dark:data-[open=true]:border-[hsl(var(--primary)/0.24)] dark:data-[open=true]:bg-white/[0.08]',
  value: 'text-sm font-medium text-slate-100',
  selectorIcon:
    'text-slate-300 transition-transform duration-150 group-data-[open=true]:text-[hsl(var(--primary))]',
};

const defaultListboxClassNames: SelectListboxClassNames = {
  base: 'p-0',
  list: 'gap-1 p-0',
  emptyContent: 'px-3 py-2 text-sm text-slate/70 dark:text-slate-400',
};

const defaultItemClasses: SelectItemClassNames = {
  base: 'rounded-[1rem] px-3 py-2.5 transition data-[hover=true]:bg-[hsl(var(--primary)/0.08)] data-[focus-visible=true]:bg-[hsl(var(--primary)/0.1)] data-[selected=true]:bg-[hsl(var(--primary)/0.12)] dark:data-[hover=true]:bg-[hsl(var(--primary)/0.12)] dark:data-[focus-visible=true]:bg-[hsl(var(--primary)/0.14)] dark:data-[selected=true]:bg-[hsl(var(--primary)/0.16)]',
  title: 'text-sm font-medium text-ink dark:text-slate-100',
  description: 'text-xs text-slate/70 dark:text-slate-400',
  selectedIcon: 'text-[hsl(var(--primary))]',
  wrapper: 'gap-1',
};

function mergeSlotClasses<T extends Record<string, unknown>>(
  base: T,
  overrides?: Record<string, unknown>,
): T {
  const next = { ...base } as Record<string, unknown>;

  if (!overrides) {
    return next as T;
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (!value) {
      continue;
    }

    next[key] = cn(next[key] as string | undefined, value as string | undefined);
  }

  return next as T;
}

export function AdminSelect<T extends object = object>({
  uiVariant = 'default',
  classNames,
  listboxProps,
  popoverProps,
  ...props
}: AdminSelectProps<T>) {
  const selectClassNames =
    uiVariant === 'compact' ? compactSelectClassNames : defaultSelectClassNames;

  return (
    <Select
      {...props}
      classNames={mergeSlotClasses(selectClassNames, classNames)}
      popoverProps={{
        offset: 10,
        ...popoverProps,
      }}
      listboxProps={{
        ...listboxProps,
        classNames: mergeSlotClasses(defaultListboxClassNames, listboxProps?.classNames),
        itemClasses: mergeSlotClasses(defaultItemClasses, listboxProps?.itemClasses),
      }}
    />
  );
}
