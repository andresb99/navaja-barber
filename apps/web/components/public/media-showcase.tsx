'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from 'react';
import { Button, Image } from '@heroui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface MediaShowcaseProps {
  alt: string;
  images: Array<string | null | undefined>;
  className?: string;
  imageClassName?: string;
  activeImageClassName?: string;
  blockParentInteractions?: boolean;
  dotsClassName?: string;
  fallback?: ReactNode;
}

function clampIndex(index: number, length: number) {
  if (length <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), length - 1);
}

function arraysEqualByStringValue(
  left: Array<string | null | undefined>,
  right: Array<string | null | undefined>,
) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (String(left[index] || '') !== String(right[index] || '')) {
      return false;
    }
  }

  return true;
}

function MediaShowcaseComponent({
  alt,
  images,
  className,
  imageClassName,
  activeImageClassName,
  blockParentInteractions = true,
  dotsClassName,
  fallback = null,
}: MediaShowcaseProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isInteractingRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);

  const normalizedImages = useMemo(
    () => Array.from(new Set(images.map((value) => String(value || '').trim()).filter(Boolean))),
    [images],
  );
  const imagesFingerprint = useMemo(() => normalizedImages.join('||'), [normalizedImages]);
  const hasMultipleImages = normalizedImages.length > 1;

  const scrollToIndex = useCallback(
    (nextIndex: number, behavior: ScrollBehavior = 'smooth') => {
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
      setActiveIndex((currentIndex) => (currentIndex === safeIndex ? currentIndex : safeIndex));
    },
    [normalizedImages.length],
  );

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (normalizedImages.length <= 1) {
        return;
      }

      const viewport = event.currentTarget;
      if (scrollFrameRef.current !== null) {
        return;
      }

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        const width = viewport.clientWidth || 1;
        const nextIndex = clampIndex(
          Math.round(viewport.scrollLeft / width),
          normalizedImages.length,
        );
        setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
      });
    },
    [normalizedImages.length],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    setActiveIndex((currentIndex) => {
      const safeIndex = clampIndex(currentIndex, normalizedImages.length);
      const targetLeft = safeIndex * viewport.clientWidth;
      viewport.scrollTo({
        left: targetLeft,
        behavior: 'auto',
      });
      return safeIndex === currentIndex ? currentIndex : safeIndex;
    });
  }, [imagesFingerprint, normalizedImages.length]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

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
            if (blockParentInteractions) {
              event.stopPropagation();
            }
            isInteractingRef.current = true;
          }}
          onPointerUp={(event) => {
            if (blockParentInteractions) {
              event.stopPropagation();
            }
            isInteractingRef.current = false;
          }}
          onPointerCancel={(event) => {
            if (blockParentInteractions) {
              event.stopPropagation();
            }
            isInteractingRef.current = false;
          }}
          onPointerLeave={() => {
            isInteractingRef.current = false;
          }}
          onClick={(event) => {
            if (blockParentInteractions && isInteractingRef.current) {
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
                  className={cn(
                    'h-full w-full object-cover',
                    imageClassName,
                    index === activeIndex ? activeImageClassName : null,
                  )}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
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
          <Button
            type="button"
            isIconOnly
            size="sm"
            radius="full"
            variant="light"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              scrollToIndex(activeIndex - 1);
            }}
            aria-label="Imagen anterior"
            className="absolute left-3 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-slate-950/55 text-white backdrop-blur-sm transition hover:bg-slate-950/75 md:inline-flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            isIconOnly
            size="sm"
            radius="full"
            variant="light"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              scrollToIndex(activeIndex + 1);
            }}
            aria-label="Imagen siguiente"
            className="absolute right-3 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-slate-950/55 text-white backdrop-blur-sm transition hover:bg-slate-950/75 md:inline-flex"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      ) : null}

      {hasMultipleImages ? (
        <div
          className={cn(
            'absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5',
            dotsClassName,
          )}
        >
          {normalizedImages.map((imageUrl, index) => (
            <Button
              key={`${imageUrl}-dot-${index}`}
              type="button"
              isIconOnly
              size="sm"
              radius="full"
              variant="light"
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

export const MediaShowcase = memo(MediaShowcaseComponent, (prevProps, nextProps) => {
  return (
    prevProps.alt === nextProps.alt &&
    prevProps.className === nextProps.className &&
    prevProps.imageClassName === nextProps.imageClassName &&
    prevProps.activeImageClassName === nextProps.activeImageClassName &&
    prevProps.blockParentInteractions === nextProps.blockParentInteractions &&
    prevProps.dotsClassName === nextProps.dotsClassName &&
    prevProps.fallback === nextProps.fallback &&
    arraysEqualByStringValue(prevProps.images, nextProps.images)
  );
});
