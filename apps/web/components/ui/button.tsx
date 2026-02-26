'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import GlassSurface, { type GlassSurfaceProps } from '@/components/GlassSurface';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold tracking-[0.01em] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focusLight/45 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent dark:focus-visible:ring-focusDark/45 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-ink text-white shadow-[0_16px_28px_-16px_rgba(9,19,34,0.7)] hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-16px_rgba(9,19,34,0.8)] hover:brightness-110 active:translate-y-0',
        secondary:
          'bg-slate-900 text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.85)] hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_18px_30px_-16px_rgba(15,23,42,0.92)] active:translate-y-0 dark:bg-brass dark:text-black dark:shadow-[0_16px_30px_-18px_rgba(234,176,72,0.9)] dark:hover:bg-brass/90 dark:hover:shadow-[0_18px_30px_-16px_rgba(234,176,72,0.92)]',
        ghost:
          'bg-slate-900/90 text-white ring-1 ring-slate-900/20 hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_14px_24px_-20px_rgba(15,23,42,0.55)] dark:bg-slate-900/55 dark:text-white dark:ring-slate-600/40 dark:hover:bg-slate-900',
        danger: 'bg-red-600 text-white shadow-[0_12px_24px_-16px_rgba(220,38,38,0.9)] hover:bg-red-500',
      },
      size: {
        sm: 'h-9 px-3.5 text-[13px]',
        md: 'h-10 px-4.5',
        lg: 'h-11 px-6 text-[15px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  glass?: boolean;
  glassProps?: Partial<GlassSurfaceProps>;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, glass = false, glassProps, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  const { className: glassClassName, ...restGlassProps } = glassProps ?? {};

  const buttonNode = (
    <Comp
      className={cn(
        buttonVariants({ variant, size }),
        glass ? '!border-0 !bg-transparent !shadow-none !ring-0 hover:!bg-white/12 dark:hover:!bg-white/12' : '',
        className,
      )}
      ref={ref}
      {...props}
    />
  );

  if (!glass) {
    return buttonNode;
  }

  return (
    <GlassSurface
      width="auto"
      height="auto"
      borderRadius={16}
      borderWidth={0.07}
      blur={11}
      displace={0.5}
      brightness={50}
      opacity={0.93}
      backgroundOpacity={0.1}
      saturation={1}
      distortionScale={-180}
      redOffset={0}
      greenOffset={10}
      blueOffset={20}
      mixBlendMode="screen"
      className={cn('inline-flex overflow-hidden rounded-2xl', glassClassName)}
      {...restGlassProps}
    >
      {buttonNode}
    </GlassSurface>
  );
});
