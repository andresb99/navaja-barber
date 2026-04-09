'use client';

import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Search, 
  MapPin, 
  SlidersHorizontal, 
  X, 
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button, Switch } from '@heroui/react';
import { BookShopCard } from '@/components/public/book-shop-card';
import type { MarketplaceShop } from '@/lib/shops';
import { cn } from '@/lib/cn';
import {
  ctaButtonClass,
  filterPillClass,
  SectionTitle,
  FilterSectionLabel,
  drawerOverlayClass,
  drawerPanelClass,
  DrawerStyles,
} from '@/components/ui/primitives';

interface BookPageContentProps {
  shops: MarketplaceShop[];
}

type SortKey = 'default' | 'rating_desc' | 'rating_asc' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Relevancia' },
  { key: 'rating_desc', label: 'Mejor calificación' },
  { key: 'price_asc', label: 'Menor precio' },
];

function normalize(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function BookPageContent({ shops }: BookPageContentProps) {
  const [query, setQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [location, setLocation] = useState('LONDON');
  const closingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deferredQuery = useDeferredValue(query);

  const closeFilter = useCallback(() => {
    if (isFilterClosing) return;
    setIsFilterClosing(true);
    closingTimer.current = setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 200);
  }, [isFilterClosing]);

  const filtered = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    let result = shops.filter((shop) => {
      if (q) {
        const inName = normalize(shop.name).includes(q);
        const inCity = normalize(shop.city || '').includes(q);
        if (!inName && !inCity) return false;
      }
      if (verifiedOnly && !shop.isVerified) return false;
      return true;
    });

    if (sortBy === 'rating_desc') {
      result = [...result].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else if (sortBy === 'price_asc') {
      result = [...result].sort((a, b) => (a.minServicePriceCents || 0) - (b.minServicePriceCents || 0));
    }

    return result;
  }, [shops, deferredQuery, sortBy, verifiedOnly]);

  return (
    <div className="bg-transparent min-h-screen selection:bg-[#c49cff]/30 pb-40 transition-colors duration-500">
      
      {/* ── HERO SECTION ── */}
      <section className="relative pt-16 pb-20 px-4 md:px-10 max-w-7xl mx-auto overflow-hidden bg-transparent">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-10 text-center sm:text-left"
        >
          {/* ── SEARCH BAR SUB-COMPONENT ── */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 w-full bg-white/[0.03] border border-white/[0.06] p-2 rounded-[2rem] relative z-10 transition-all focus-within:ring-2 focus-within:ring-[#c49cff]/20">
            <div className="relative flex-1 w-full flex items-center">
              <Search className="absolute left-6 w-4 h-4 text-white/20" />
              <input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search curated shops..."
                className="w-full bg-transparent pl-14 pr-4 py-4 text-white text-[11px] font-black uppercase tracking-widest outline-none placeholder:text-white/10"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto px-2 pb-2 sm:pb-0">
               {/* Location Button */}
               <button className="h-12 px-6 flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all active:scale-95 group shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-[#c49cff]" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{location}</span>
               </button>

               {/* Filter Button */}
               <button 
                 onClick={() => setIsFilterOpen(true)}
                 className="h-12 px-6 flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all active:scale-95 shrink-0"
               >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">FILTER</span>
               </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── LIST SECTION ── */}
      <section className="px-4 md:px-10 max-w-7xl mx-auto pt-10">
        {filtered.length === 0 ? (
          <div className="py-40 text-center">
             <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">NO ELITE SHOPS FOUND</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filtered.map((shop, idx) => (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <BookShopCard 
                  shop={shop} 
                  isFeatured={idx === 0 && !deferredQuery} 
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer info text */}
        <div className="mt-40 text-center flex flex-col items-center gap-6">
           <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">SHOW MORE ELITE RESULTS</p>
           <ChevronDown className="w-6 h-6 text-white/10 animate-bounce" />
        </div>
      </section>

      {/* ── FILTER DRAWER (Portal to match courses exactly) ── */}
      {isFilterOpen && createPortal(
        <>
          <div
            className={drawerOverlayClass(isFilterClosing)}
            onClick={closeFilter}
          />
          <aside className={drawerPanelClass(isFilterClosing)}>
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-baseline gap-2">
                <SectionTitle>FILTROS</SectionTitle>
                <span className="text-[10px] font-black text-[#c49cff]">{filtered.length} SHOPS</span>
              </div>
              <button onClick={closeFilter} className="p-3 bg-slate-50 dark:bg-white/5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-12 pb-10">
              {/* Order Pills */}
              <section>
                <FilterSectionLabel>ORDENAR POR</FilterSectionLabel>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((opt) => {
                    const isActive = sortBy === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setSortBy(opt.key)}
                        className={filterPillClass(isActive)}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Verified Toggle */}
              <section>
                <FilterSectionLabel>ESTADO</FilterSectionLabel>
                <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Solo tiendas verificadas</span>
                  <Switch isSelected={verifiedOnly} onValueChange={setVerifiedOnly} size="sm" classNames={{ wrapper: "bg-slate-200 dark:bg-white/10 group-data-[selected=true]:bg-[#c49cff]" }} />
                </div>
              </section>
            </div>

            <div className="pt-8 mt-auto border-t border-slate-100 dark:border-white/5 space-y-4">
              <Button 
                onPress={closeFilter} 
                className={ctaButtonClass({ size: 'lg', className: 'hover:shadow-[0_6px_15px_rgba(196,156,255,0.25)]' })}
              >
                VER RESULTADOS
                <ChevronDown className="w-4 h-4 ml-1 -rotate-90" />
              </Button>
              <button
                onClick={() => {
                  setSortBy('default');
                  setVerifiedOnly(false);
                  setQuery('');
                }}
                className="w-full text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-white/20 hover:text-slate-900 dark:hover:text-white/40 transition-colors uppercase"
              >
                RESETEAR
              </button>
            </div>
          </aside>
        </>,
        document.body
      )}

      <DrawerStyles />
    </div>
  );
}
