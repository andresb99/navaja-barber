'use client';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ShopImageCarouselProps {
  images: string[];
  shopName: string;
  ratio?: string;
}

export function ShopImageCarousel({ images, shopName, ratio }: ShopImageCarouselProps) {
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
  }, [current, visible]);

  useEffect(() => {
    if (count <= 1 || isHovered) return;
    timerRef.current = setTimeout(() => next(), 5000); // 5s for premium rhythm
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [count, isHovered, next, current]);

  // Use defined ratio or default to 16/9 only if not in a h-full parent context
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: ratio ? 'auto' : '100%',
    aspectRatio: ratio,
    overflow: 'hidden',
  };

  if (count === 0) {
    return (
      <div style={containerStyle} className="bg-[#0c0c0e]">
        {/* Midnight Atelier Premium Fallback */}
        <div className="absolute inset-0 z-0">
           <div 
             className="absolute inset-0 opacity-[0.2]" 
             style={{ 
               backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(160,120,255,0.15), transparent 40%), radial-gradient(circle at 0% 100%, rgba(139,92,246,0.1), transparent 30%)',
               backgroundSize: 'cover'
             }} 
           />
           <div className="absolute inset-0 z-10 metal-grid opacity-[0.05]" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20">
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#a078ff]/40 to-transparent" />
          <p className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-[0.3em] text-white/10 uppercase italic">
            Atelier Collective
          </p>
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#a078ff]/40 to-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{
            opacity: i === current ? 1 : 0,
            zIndex: i === current ? 1 : i === visible ? 0 : 0,
          }}
        >
          <Image
            src={src}
            alt={`${shopName} — imagen ${i + 1}`}
            fill
            className="object-cover scale-105" // Slight scale for premium feel
            sizes="100vw"
            priority={i === 0}
          />
        </div>
      ))}

      {/* Editorial Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-black/40" />

      {count > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 sm:left-8 top-1/2 z-20 -translate-y-1/2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/5 text-white/50 backdrop-blur-xl ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 sm:right-8 top-1/2 z-20 -translate-y-1/2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/5 text-white/50 backdrop-blur-xl ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95"
          >
            <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
          </button>

          <div className="absolute bottom-4 right-4 sm:bottom-12 sm:right-12 z-20 flex items-center gap-4">
             <span className="text-[10px] font-bold tracking-[.3em] text-white/40 uppercase">
               0{current + 1} / 0{count}
             </span>
             <div className="flex gap-1.5">
               {images.map((_, i) => (
                 <button
                   key={i}
                   onClick={() => goTo(i)}
                   className={[
                     'h-1 rounded-full transition-all duration-500',
                     i === current ? 'w-8 bg-[#a078ff]' : 'w-2 bg-white/20',
                   ].join(' ')}
                 />
               ))}
             </div>
          </div>
        </>
      )}
    </div>
  );
}
