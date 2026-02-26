'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

interface FadeContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  blur?: boolean;
  duration?: number;
  easing?: string;
  delay?: number;
  initialOpacity?: number;
}

export default function FadeContent({
  children,
  blur = false,
  duration = 700,
  easing = 'ease-out',
  delay = 0,
  initialOpacity = 0,
  className,
  style,
  ...props
}: FadeContentProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timerId = window.setTimeout(() => setVisible(true), Math.max(0, delay));
    return () => window.clearTimeout(timerId);
  }, [delay]);

  const transition = useMemo(() => {
    const ms = Math.max(0, duration);
    return `opacity ${ms}ms ${easing}, filter ${ms}ms ${easing}, transform ${ms}ms ${easing}`;
  }, [duration, easing]);

  return (
    <div
      className={cn(className)}
      style={{
        ...style,
        opacity: visible ? 1 : initialOpacity,
        filter: blur && !visible ? 'blur(8px)' : 'blur(0px)',
        transform: visible ? 'translateY(0px)' : 'translateY(8px)',
        transition,
        willChange: 'opacity, filter, transform',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
