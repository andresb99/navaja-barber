'use client';

import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface PillNavItem {
  label: string;
  href: string;
}

interface PillNavProps {
  logo?: string | StaticImageData;
  logoAlt?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  theme?: 'light' | 'dark';
  initialLoadAnimation?: boolean;
}

const easeMap: Record<string, string> = {
  'power1.easeOut': 'cubic-bezier(0.22, 1, 0.36, 1)',
  'power2.easeOut': 'cubic-bezier(0.16, 1, 0.3, 1)',
  'power3.easeOut': 'cubic-bezier(0.22, 1, 0.36, 1)',
  'power4.easeOut': 'cubic-bezier(0.23, 1, 0.32, 1)',
};

function resolveCssEase(value: string | undefined) {
  if (!value) {
    return easeMap['power2.easeOut'];
  }
  return easeMap[value] || value;
}

export default function PillNav({
  logo,
  logoAlt = 'Logo',
  items,
  activeHref,
  className,
  ease = 'power2.easeOut',
  baseColor = '#000000',
  pillColor = '#ffffff',
  hoveredPillTextColor = '#ffffff',
  pillTextColor = '#000000',
  theme = 'dark',
  initialLoadAnimation = true,
}: PillNavProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(!initialLoadAnimation);
  const [indicator, setIndicator] = useState({ x: 0, width: 0, visible: false });
  const cssEase = useMemo(() => resolveCssEase(ease), [ease]);
  const targetHref = hoveredHref ?? activeHref ?? items[0]?.href ?? null;

  const updateIndicator = useCallback(() => {
    if (!targetHref || !containerRef.current) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }

    const element = itemRefs.current[targetHref];
    if (!element) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const x = elementRect.left - containerRect.left;
    const width = elementRect.width;

    setIndicator({ x, width, visible: true });
  }, [targetHref]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const onResize = () => updateIndicator();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateIndicator]);

  useEffect(() => {
    if (!initialLoadAnimation) {
      return;
    }
    const timeout = window.setTimeout(() => setIsReady(true), 60);
    return () => window.clearTimeout(timeout);
  }, [initialLoadAnimation]);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full p-1',
        className,
      )}
      style={{
        backgroundColor: baseColor,
        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(15,23,42,0.12)',
      }}
    >
      {logo ? (
        <Link href="/" aria-label={logoAlt} className="ml-1 inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full">
          <Image src={logo} alt={logoAlt} width={22} height={22} className="h-5 w-5 object-contain" />
        </Link>
      ) : null}

      <div
        ref={containerRef}
        className="relative inline-flex items-center gap-0.5"
        onMouseLeave={() => setHoveredHref(null)}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${indicator.width}px`,
            transform: `translateX(${indicator.x}px)`,
            backgroundColor: pillColor,
            opacity: indicator.visible && isReady ? 1 : 0,
            transition: `transform 260ms ${cssEase}, width 260ms ${cssEase}, opacity 160ms ease`,
            boxShadow: theme === 'dark' ? '0 10px 22px -14px rgba(255,255,255,0.4)' : '0 10px 22px -14px rgba(15,23,42,0.35)',
          }}
        />

        {items.map((item) => {
          const active = targetHref === item.href;

          return (
            <Link
              key={item.href}
              ref={(node: HTMLAnchorElement | null) => {
                itemRefs.current[item.href] = node;
              }}
              href={item.href}
              className="relative z-10 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focusLight/45 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent dark:focus-visible:ring-focusDark/45"
              style={{
                color: active ? hoveredPillTextColor : pillTextColor,
                transition: `color 180ms ${cssEase}, transform 200ms ${cssEase}`,
                transform: active ? 'translateY(-1px)' : 'translateY(0px)',
              }}
              onMouseEnter={() => setHoveredHref(item.href)}
              onFocus={() => setHoveredHref(item.href)}
              onBlur={() => setHoveredHref(null)}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
