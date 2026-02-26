import * as React from 'react';
import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-2xl border border-slate/25 bg-white px-3.5 text-[15px] font-medium text-ink shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_14px_24px_-24px_rgba(15,23,42,0.7)] placeholder:text-slate/55 outline-none transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-focusLight/70 hover:shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_16px_28px_-24px_rgba(139,92,246,0.35)] focus:border-focusLight focus:ring-2 focus:ring-focusLight/35 focus:shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_0_0_1px_rgba(139,92,246,0.22),0_18px_30px_-24px_rgba(139,92,246,0.45)] dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:placeholder:text-slate-400 dark:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_18px_26px_-24px_rgba(2,6,23,0.9)] dark:hover:border-focusDark/65 dark:hover:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_16px_28px_-24px_rgba(234,176,72,0.42)] dark:focus:border-focusDark/70 dark:focus:ring-focusDark/30 dark:focus:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_0_0_1px_rgba(234,176,72,0.3),0_18px_28px_-24px_rgba(234,176,72,0.45)]',
        className,
      )}
      {...props}
    />
  );
});

