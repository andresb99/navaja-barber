'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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

export function MediaShowcase({
  alt,
  images,
  className,
  imageClassName,
  dotsClassName,
  fallback = null,
}: MediaShowcaseProps) {
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const hasMultipleImages = normalizedImages.length > 1;

  useEffect(() => {
    setActiveIndex((currentIndex) => {
      if (normalizedImages.length === 0) {
        return 0;
      }

      return Math.min(currentIndex, normalizedImages.length - 1);
    });
  }, [imagesFingerprint, normalizedImages.length]);

  function goToIndex(nextIndex: number) {
    if (!hasMultipleImages) {
      return;
    }

    const total = normalizedImages.length;
    const safeIndex = ((nextIndex % total) + total) % total;
    setActiveIndex(safeIndex);
  }

  function handlePrevious(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    goToIndex(activeIndex - 1);
  }

  function handleNext(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    goToIndex(activeIndex + 1);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (!hasMultipleImages) {
      return;
    }

    const firstTouch = event.touches[0];
    if (!firstTouch) {
      return;
    }

    setTouchStartX(firstTouch.clientX);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (!hasMultipleImages || touchStartX === null) {
      setTouchStartX(null);
      return;
    }

    const changedTouch = event.changedTouches[0];
    if (!changedTouch) {
      setTouchStartX(null);
      return;
    }

    const swipeDelta = changedTouch.clientX - touchStartX;
    const minimumSwipe = 28;

    if (swipeDelta > minimumSwipe) {
      goToIndex(activeIndex - 1);
    } else if (swipeDelta < -minimumSwipe) {
      goToIndex(activeIndex + 1);
    }

    setTouchStartX(null);
  }

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {normalizedImages.length > 0 ? (
        normalizedImages.map((imageUrl, index) => (
          <Image
            key={`${imageUrl}-${index}`}
            removeWrapper
            alt={normalizedImages.length > 1 ? `${alt} ${index + 1}` : alt}
            src={imageUrl}
            className={cn(
              'absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-300',
              index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0',
              imageClassName,
            )}
          />
        ))
      ) : (
        fallback
      )}

      {hasMultipleImages ? (
        <>
          <button
            type="button"
            onClick={handlePrevious}
            aria-label="Imagen anterior"
            className="absolute left-3 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-slate-950/55 text-white backdrop-blur-sm transition hover:bg-slate-950/75 md:inline-flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
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
                goToIndex(index);
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
