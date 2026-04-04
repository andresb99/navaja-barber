'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { Button } from '@heroui/react';
import { Star, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buildShopHref } from '@/lib/shop-links';
import type { MarketplaceShop } from '@/lib/shops';
import { buildTenantCanonicalHref } from '@/lib/tenant-public-urls';

interface BookShopCardProps {
  shop: MarketplaceShop;
  isFeatured?: boolean;
}

const PLACEHOLDER_IMAGES = [
  'https://galanobarbershop.com.uy/wp-content/uploads/2025/01/Galano-Barberia-Barberia-Montevideo.jpg',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=2070&auto=format&fit=crop'
];

function formatRating(value: number | null) {
  if (value === null) return '4.0';
  return value.toFixed(1);
}

export function BookShopCard({ shop, isFeatured = false }: BookShopCardProps) {
  const tenantProfileHref = buildTenantCanonicalHref(shop, 'profile');
  const bookingHref = buildShopHref(shop.slug, 'book');
  
  const images = shop.imageUrls && shop.imageUrls.length > 0 
    ? shop.imageUrls 
    : PLACEHOLDER_IMAGES;

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── DRAG TO SCROLL LOGIC ──
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    
    // Disable smooth scroll during drag
    scrollRef.current.style.scrollBehavior = 'auto';
    scrollRef.current.style.scrollSnapType = 'none';
  };

  const handleMouseLeave = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.scrollBehavior = 'smooth';
      scrollRef.current.style.scrollSnapType = 'x mandatory';
      // Snap to nearest image on release
      const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
      scrollTo(index);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.scrollBehavior = 'smooth';
      scrollRef.current.style.scrollSnapType = 'x mandatory';
      // Snap to nearest image on release
      const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
      scrollTo(index);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // multiplier for speed
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeftVal = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    if (width > 0) {
      const index = Math.round(scrollLeftVal / width);
      if (index !== activeIndex) setActiveIndex(index);
    }
  };

  const scrollTo = (index: number) => {
    if (scrollRef.current) {
      const safeIndex = Math.max(0, Math.min(index, images.length - 1));
      scrollRef.current.scrollTo({
        left: safeIndex * scrollRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div
      className="group h-full bg-[#0e0e0f] rounded-[3rem] overflow-hidden flex flex-col transition-all duration-300 border-0 outline-none shadow-none"
    >
      {/* ── IMAGE CAROUSEL SECTION ── */}
      <div className="relative aspect-[1.1/1] w-full overflow-hidden bg-black flex-shrink-0">
        
        {/* Scroll Container */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="flex h-full w-full overflow-x-auto flex-nowrap snap-x snap-mandatory no-scrollbar bg-black cursor-grab active:cursor-grabbing"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            scrollPadding: '0' 
          }}
        >
          {images.map((img: string, idx: number) => (
            <div key={idx} className="h-full w-full min-w-full flex-shrink-0 snap-start relative">
              <img 
                src={img} 
                alt={`${shop.name} view ${idx + 1}`}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            </div>
          ))}
        </div>

        {/* Carousel Indicators (Dots) */}
        {images.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 pointer-events-none">
            {images.map((_: string, idx: number) => (
              <div 
                key={idx} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  idx === activeIndex ? "bg-[#c49cff] w-4" : "bg-white/20"
                )} 
              />
            ))}
          </div>
        )}

        {/* Navigation Arrows (Visible only on hover) */}
        {images.length > 1 && (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollTo(activeIndex - 1); }}
              className="p-3 bg-black/40 backdrop-blur-xl rounded-full text-white pointer-events-auto hover:bg-[#c49cff] hover:text-black transition-all active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollTo(activeIndex + 1); }}
              className="p-3 bg-black/40 backdrop-blur-xl rounded-full text-white pointer-events-auto hover:bg-[#c49cff] hover:text-black transition-all active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Overlays on Image */}
        <div className="absolute top-6 left-6 flex flex-col gap-2 z-20 pointer-events-none">
           <div className="bg-[#121214]/90 backdrop-blur-md px-3 py-2 rounded-xl flex items-center gap-2 border border-white/5 shadow-lg">
             <Star className="w-4 h-4 text-[#c49cff] fill-[#c49cff]" />
             <span className="text-[14px] font-bold text-white leading-none">{formatRating(shop.averageRating)}</span>
           </div>
           
           <div className="bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/5 self-start">
             <span className="text-[9px] font-black text-white/70 uppercase tracking-widest leading-none">
               {shop.reviewCount || 0} REVIEWS
             </span>
           </div>
        </div>

        {isFeatured && (
          <div className="absolute top-6 right-6 bg-[#c49cff] px-4 py-1.5 rounded-full shadow-xl z-20 pointer-events-none">
            <span className="text-[10px] font-black text-[#2d0a6e] uppercase tracking-widest">FEATURED</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-10" />
      </div>

      {/* ── CONTENT SECTION ── */}
      <div className="p-10 pb-12 flex flex-col gap-10 flex-1">
        <div className="flex flex-col gap-3">
          <h2 className="text-3xl font-[1000] text-white uppercase tracking-tighter leading-none">
            {shop.name}
          </h2>
          <div className="flex items-center gap-2 text-white/40">
            <MapPin className="w-5 h-5 text-[#c49cff] fill-[#c49cff]/20" />
            <span className="text-[11px] font-black uppercase tracking-widest leading-none">
              {shop.locationLabel || `${shop.city}, ${shop.region}`}
            </span>
          </div>
        </div>

        {/* ── BUTTONS ── */}
        <div className="flex items-center gap-4 mt-auto">
          <Button
            as={Link}
            href={bookingHref}
            className="flex-1 h-16 bg-[#c49cff] text-[#2d0a6e] font-[1000] text-[11px] uppercase tracking-[0.2em] rounded-[2rem] transition-all duration-300 hover:brightness-110 hover:scale-[1.02] hover:-translate-y-0.5"
          >
            BOOK NOW
          </Button>
          <Button
            as={Link}
            href={tenantProfileHref}
            variant="bordered"
            className="flex-1 h-16 border-white/10 text-white font-[1000] text-[11px] uppercase tracking-[0.2em] rounded-[2rem] transition-all duration-300 hover:bg-white/5 hover:scale-[1.02] hover:-translate-y-0.5"
          >
            VISIT WEBSITE
          </Button>
        </div>
      </div>
    </div>
  );
}
