'use client';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ShopImageCarouselProps {
  images: string[];
  shopName: string;
  ratio?: string;
}

export function ShopImageCarousel({ images, shopName, ratio = '16/9' }: ShopImageCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = images.length;

  const goTo = useCallback(
    (index: number) => {
      setVisible(current);
      setCurrent((index + count) % count);
    },
    [current, count],
  );

  const prev = useCallback(() => goTo(current - 1), [current, goTo]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);

  useEffect(() => {
    const id = setTimeout(() => setVisible(current), 500);
    return () => clearTimeout(id);
  }, [current]);

  useEffect(() => {
    if (count <= 1 || isHovered) return;
    timerRef.current = setTimeout(() => next(), 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [count, isHovered, next, current]);

  if (count === 0) {
    return (
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: ratio }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f18] via-[#111827] to-[#1a1208]">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 80%, rgba(234,176,72,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(234,176,72,0.15) 0%, transparent 40%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.02) 39px, rgba(255,255,255,0.02) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.02) 39px, rgba(255,255,255,0.02) 40px)',
            }}
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <span className="text-7xl opacity-20" style={{ filter: 'grayscale(1)' }}>✂</span>
          <p
            className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-white/30"
          >
            {shopName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: ratio }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: i === current ? 1 : 0,
            zIndex: i === current ? 1 : i === visible ? 0 : 0,
          }}
        >
          <Image
            src={src}
            alt={`${shopName} — imagen ${i + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 100vw"
            priority={i === 0}
          />
        </div>
      ))}

      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black/60 via-black/10 to-black/20" />

      {count > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Imagen anterior"
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md border border-white/10 transition hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Siguiente imagen"
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md border border-white/10 transition hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {count > 1 && (
        <div className="absolute bottom-4 right-5 z-20 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Ir a imagen ${i + 1}`}
              className={[
                'h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none',
                i === current ? 'w-6 bg-brass' : 'w-1.5 bg-white/40',
              ].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
