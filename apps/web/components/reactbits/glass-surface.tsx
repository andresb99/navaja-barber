'use client';

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface GlassSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  mixBlendMode?: CSSProperties['mixBlendMode'];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toCssSize(value: number | string | undefined) {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'number' ? `${value}px` : value;
}

export default function GlassSurface({
  children,
  width,
  height,
  borderRadius = 24,
  brightness = 50,
  opacity = 0.93,
  blur = 12,
  displace = 0.35,
  backgroundOpacity = 0.16,
  saturation = 1.25,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  mixBlendMode = 'screen',
  className,
  style,
  ...props
}: GlassSurfaceProps) {
  const radius = toCssSize(borderRadius) ?? '24px';
  const safeOpacity = clamp(opacity, 0, 1);
  const safeBackgroundOpacity = clamp(backgroundOpacity, 0, 1);
  const brightnessScale = clamp(brightness / 50, 0.55, 2.1);
  const blurAmount = Math.max(0, blur);
  const sideShift = displace * 14;
  const chromaShift = (blueOffset - redOffset + greenOffset * 0.4) * 0.06;
  const distortionShift = Math.abs(distortionScale) * 0.003;
  const sideGlowAlpha = clamp(0.22 + safeOpacity * 0.22, 0.16, 0.5);

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={
        {
          ...style,
          width: toCssSize(width),
          height: toCssSize(height),
          borderRadius: radius,
        } as CSSProperties
      }
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          opacity: safeOpacity,
          border: '1px solid rgba(255,255,255,0.30)',
          background:
            'linear-gradient(128deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.10) 38%, rgba(255,255,255,0.20) 100%)',
          backdropFilter: `blur(${blurAmount}px) saturate(${saturation}) brightness(${brightnessScale})`,
          WebkitBackdropFilter: `blur(${blurAmount}px) saturate(${saturation}) brightness(${brightnessScale})`,
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.35) inset, 0 18px 34px -24px rgba(2,6,23,0.75), 0 0 0 1px rgba(255,255,255,0.06) inset',
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-24 rounded-l-[inherit]"
        style={{
          background: `linear-gradient(90deg, rgba(255,255,255,${sideGlowAlpha}), rgba(255,255,255,0.03))`,
          transform: `translateX(${-(sideShift + chromaShift)}px)`,
          filter: `blur(${3 + distortionShift}px)`,
          mixBlendMode,
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-24 rounded-r-[inherit]"
        style={{
          background: `linear-gradient(270deg, rgba(255,255,255,${sideGlowAlpha}), rgba(255,255,255,0.03))`,
          transform: `translateX(${sideShift + chromaShift}px)`,
          filter: `blur(${3 + distortionShift}px)`,
          mixBlendMode,
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            'radial-gradient(circle at 50% -28%, rgba(255,255,255,0.30), transparent 60%), radial-gradient(circle at 50% 125%, rgba(255,255,255,0.16), transparent 68%)',
          opacity: 0.85,
        }}
      />

      <div
        className="relative z-10 h-full w-full rounded-[inherit]"
        style={{
          backgroundColor: `rgba(255,255,255,${safeBackgroundOpacity})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
