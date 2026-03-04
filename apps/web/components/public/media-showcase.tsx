'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from 'react';
import { Image } from '@heroui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface MediaShowcaseProps {
  alt: string;
  images: Array<string | null | undefined>;
  className?: string;
  imageClassName?: string;
  dotsClassName?: string;
  fallback?: ReactNode;
}

function clampIndex(index: number, length: number) {
  if (length <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), length - 1);
}

export function MediaShowcase({
  alt,
  images,
  className,
  imageClassName,
  dotsClassName,
  fallback = null,
}: MediaShowcaseProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const normalizedImages = useMemo(
    () =>
      Array.from(
        new Set(
          images
            .map((value) => String(value || '').trim())
            .filter(Boolean),
        ),
      ),
    [images],
  );
  const imagesFingerprint = useMemo(() => normalizedImages.join('||'), [normalizedImages]);
  const hasMultipleImages = normalizedImages.length > 1;

  function scrollToIndex(nextIndex: number, behavior: ScrollBehavior = 'smooth') {
    const viewport = viewportRef.current;
    if (!viewport || normalizedImages.length === 0) {
      return;
    }

    const safeIndex = clampIndex(nextIndex, normalizedImages.length);
    const targetLeft = safeIndex * viewport.clientWidth;
    viewport.scrollTo({
      left: targetLeft,
      behavior,
    });
    setActiveIndex(safeIndex);
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    if (normalizedImages.length <= 1) {
      return;
    }

    const viewport = event.currentTarget;
    const width = viewport.clientWidth || 1;
    const nextIndex = clampIndex(Math.round(viewport.scrollLeft / width), normalizedImages.length);
    setActiveIndex(nextIndex);
  }

  useEffect(() => {
    const safeIndex = clampIndex(activeIndex, normalizedImages.length);
    setActiveIndex(safeIndex);

    if (!viewportRef.current) {
      return;
    }

    const viewport = viewportRef.current;
    const targetLeft = safeIndex * viewport.clientWidth;
    viewport.scrollTo({
      left: targetLeft,
      behavior: 'auto',
    });
  }, [imagesFingerprint]);

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      {normalizedImages.length > 0 ? (
        <div
          ref={viewportRef}
          className={cn(
            'relative h-full w-full overflow-x-auto overflow-y-hidden touch-pan-x snap-x snap-mandatory',
            '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
          onScroll={handleScroll}
          onPointerDown={(event) => {
            event.stopPropagation();
            setIsInteracting(true);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            setIsInteracting(false);
          }}
          onPointerCancel={(event) => {
            event.stopPropagation();
            setIsInteracting(false);
          }}
          onPointerLeave={() => setIsInteracting(false)}
          onClick={(event) => {
            if (isInteracting) {
              event.stopPropagation();
            }
          }}
        >
          <div className="flex h-full w-full">
            {normalizedImages.map((imageUrl, index) => (
              <div key={`${imageUrl}-${index}`} className="h-full min-w-full snap-start">
                <Image
                  removeWrapper
                  alt={normalizedImages.length > 1 ? `${alt} ${index + 1}` : alt}
                  src={imageUrl}
                  className={cn('h-full w-full object-cover', imageClassName)}
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        fallback
      )}

      {hasMultipleImages ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              scrollToIndex(activeIndex - 1);
            }}
            aria-label="Imagen anterior"
            className="absolute left-3 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-slate-950/55 text-white backdrop-blur-sm transition hover:bg-slate-950/75 md:inline-flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              scrollToIndex(activeIndex + 1);
            }}
            aria-label="Imagen siguiente"
            className="absolute right-3 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-slate-950/55 text-white backdrop-blur-sm transition hover:bg-slate-950/75 md:inline-flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : null}

      {hasMultipleImages ? (
        <div className={cn('absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5', dotsClassName)}>
          {normalizedImages.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-dot-${index}`}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                scrollToIndex(index);
              }}
              aria-label={`Ver imagen ${index + 1}`}
              className={cn(
                'h-2 w-2 rounded-full border border-white/70 transition-all',
                index === activeIndex ? 'w-5 bg-white' : 'bg-white/40',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
