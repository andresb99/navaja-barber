'use client';

import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { type CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import { DatePicker } from '@heroui/date-picker';
import { Chip } from '@heroui/chip';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import {
  ArrowDownUp,
  ArrowUpDown,
  BadgeCheck,
  CalendarDays,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { formatCurrency } from '@navaja/shared';
import { BookShopCard } from '@/components/public/book-shop-card';
import type { MarketplaceShop } from '@/lib/shops';

interface BookPageContentProps {
  shops: MarketplaceShop[];
}

type SortKey = 'default' | 'rating_desc' | 'rating_asc' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Relevancia' },
  { key: 'rating_desc', label: 'Mejor calificación' },
  { key: 'rating_asc', label: 'Menor calificación' },
  { key: 'price_asc', label: 'Menor precio' },
  { key: 'price_desc', label: 'Mayor precio' },
];

type RatingFilter = 'all' | '3' | '4';

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getPriceMax(shops: MarketplaceShop[]): number {
  const prices = shops
    .map((s) => s.minServicePriceCents)
    .filter((p): p is number => p !== null && p > 0);
  if (!prices.length) return 500000;
  const max = Math.max(...prices);
  // Round up to nearest 10000 cents ($100 pesos)
  return Math.ceil(max / 10000) * 10000;
}

// ── Dual range slider ────────────────────────────────────────────────────────
interface DualRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

function DualRangeSlider({ min, max, value, onChange }: DualRangeSliderProps) {
  const [low, high] = value;
  const pctLow = ((low - min) / (max - min)) * 100;
  const pctHigh = ((high - min) / (max - min)) * 100;

  return (
    <div className="relative h-5 w-full">
      {/* Track bg */}
      <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-zinc-700/60" />
      {/* Active fill */}
      <div
        className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-violet-500"
        style={{ left: `${pctLow}%`, right: `${100 - pctHigh}%` }}
      />
      {/* Low thumb */}
      <input
        type="range"
        min={min}
        max={max}
        step={5000}
        value={low}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange([Math.min(v, high - 5000), high]);
        }}
        className="dual-range-thumb absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent"
      />
      {/* High thumb */}
      <input
        type="range"
        min={min}
        max={max}
        step={5000}
        value={high}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange([low, Math.max(v, low + 5000)]);
        }}
        className="dual-range-thumb absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function BookPageContent({ shops }: BookPageContentProps) {
  const priceMax = useMemo(() => getPriceMax(shops), [shops]);

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [rating, setRating] = useState<RatingFilter>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, priceMax]);
  const [selectedDate, setSelectedDate] = useState<CalendarDate | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withServices, setWithServices] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const deferredQuery = useDeferredValue(query);

  const clearAll = useCallback(() => {
    setQuery('');
    setSortKey('default');
    setRating('all');
    setPriceRange([0, priceMax]);
    setSelectedDate(null);
    setVerifiedOnly(false);
    setWithServices(false);
  }, [priceMax]);

  const isPriceFiltered = priceRange[0] > 0 || priceRange[1] < priceMax;
  const hasActiveFilters =
    deferredQuery.trim() ||
    sortKey !== 'default' ||
    rating !== 'all' ||
    isPriceFiltered ||
    selectedDate !== null ||
    verifiedOnly ||
    withServices;

  // Count of non-sort active filters (for badge)
  const filterCount = [
    rating !== 'all',
    isPriceFiltered,
    selectedDate !== null,
    verifiedOnly,
    withServices,
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    const q = normalize(deferredQuery.trim());

    let result = shops.filter((shop) => {
      if (q) {
        const inName = normalize(shop.name).includes(q);
        const inCity = normalize(shop.city || '').includes(q);
        const inRegion = normalize(shop.region || '').includes(q);
        const inLocation = normalize(shop.locationLabel || '').includes(q);
        if (!inName && !inCity && !inRegion && !inLocation) return false;
      }

      if (rating !== 'all') {
        const min = Number(rating);
        if (shop.averageRating === null || shop.averageRating < min) return false;
      }

      if (isPriceFiltered) {
        const price = shop.minServicePriceCents;
        if (price === null) return false;
        if (price < priceRange[0] || price > priceRange[1]) return false;
      }

      // Date filter: show shops with active services when a date is chosen
      if (selectedDate !== null && shop.activeServiceCount === 0) return false;

      if (verifiedOnly && !shop.isVerified) return false;
      if (withServices && shop.activeServiceCount === 0) return false;

      return true;
    });

    // Sort
    if (sortKey === 'rating_desc') {
      result = [...result].sort((a, b) => {
        if (a.averageRating === null && b.averageRating === null) return 0;
        if (a.averageRating === null) return 1;
        if (b.averageRating === null) return -1;
        return b.averageRating - a.averageRating;
      });
    } else if (sortKey === 'rating_asc') {
      result = [...result].sort((a, b) => {
        if (a.averageRating === null && b.averageRating === null) return 0;
        if (a.averageRating === null) return 1;
        if (b.averageRating === null) return -1;
        return a.averageRating - b.averageRating;
      });
    } else if (sortKey === 'price_asc') {
      result = [...result].sort((a, b) => {
        if (a.minServicePriceCents === null && b.minServicePriceCents === null) return 0;
        if (a.minServicePriceCents === null) return 1;
        if (b.minServicePriceCents === null) return -1;
        return a.minServicePriceCents - b.minServicePriceCents;
      });
    } else if (sortKey === 'price_desc') {
      result = [...result].sort((a, b) => {
        if (a.minServicePriceCents === null && b.minServicePriceCents === null) return 0;
        if (a.minServicePriceCents === null) return 1;
        if (b.minServicePriceCents === null) return -1;
        return b.minServicePriceCents - a.minServicePriceCents;
      });
    }

    return result;
  }, [shops, deferredQuery, rating, sortKey, priceRange, isPriceFiltered, selectedDate, verifiedOnly, withServices]);

  const todayDate = today(getLocalTimeZone());

  return (
    <>
      {/* Dual-range thumb styles */}
      <style>{`
        .dual-range-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2.5px solid #8b5cf6;
          box-shadow: 0 2px 8px rgba(139,92,246,0.35);
          cursor: grab;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .dual-range-thumb::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.15);
          box-shadow: 0 4px 14px rgba(139,92,246,0.5);
        }
        .dual-range-thumb::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2.5px solid #8b5cf6;
          box-shadow: 0 2px 8px rgba(139,92,246,0.35);
          cursor: grab;
        }
      `}</style>

      <div className="space-y-4">
        {/* ── Search + Sort row ─────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="flex-1">
            <Input
              value={query}
              onValueChange={setQuery}
              placeholder="Busca por nombre o zona (ej. Pocitos, Navaja)"
              startContent={<Search className="h-4 w-4 shrink-0 text-zinc-500" />}
              endContent={
                query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 transition-colors hover:text-zinc-300"
                    aria-label="Limpiar busqueda"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null
              }
              classNames={{
                inputWrapper:
                  'h-11 rounded-2xl border border-white/8 bg-zinc-900/70 shadow-none backdrop-blur-sm transition-colors data-[hover=true]:border-white/14 data-[hover=true]:bg-zinc-900/80 group-data-[focus=true]:border-violet-500/40 group-data-[focus=true]:bg-zinc-900/90 dark:border-white/8 dark:bg-zinc-900/70',
                input: 'text-sm text-zinc-100 placeholder:text-zinc-500',
              }}
            />
          </div>

          {/* Sort select */}
          <div className="w-[190px] shrink-0">
            <Select
              selectedKeys={[sortKey]}
              onSelectionChange={(keys) => {
                const k = Array.from(keys)[0] as SortKey;
                if (k) setSortKey(k);
              }}
              startContent={<ArrowDownUp className="h-3.5 w-3.5 shrink-0 text-zinc-500" />}
              aria-label="Ordenar resultados"
              classNames={{
                trigger:
                  'h-11 rounded-2xl border border-white/8 bg-zinc-900/70 shadow-none backdrop-blur-sm transition-colors data-[hover=true]:border-white/14 data-[hover=true]:bg-zinc-900/80 data-[open=true]:border-violet-500/40 dark:border-white/8 dark:bg-zinc-900/70',
                value: 'text-sm text-zinc-100',
                selectorIcon: 'text-zinc-500',
                popoverContent:
                  'rounded-2xl border border-white/10 bg-zinc-900/95 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.6)] backdrop-blur-xl p-1',
                listboxWrapper: 'p-0',
              }}
              listboxProps={{
                itemClasses: {
                  base: 'rounded-xl px-3 py-2 text-sm text-zinc-300 data-[hover=true]:bg-white/8 data-[hover=true]:text-zinc-100 data-[selected=true]:text-violet-300',
                },
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.key}>{opt.label}</SelectItem>
              ))}
            </Select>
          </div>

          {/* Filters toggle */}
          <Button
            type="button"
            onPress={() => setFiltersOpen((v) => !v)}
            variant="bordered"
            className={`h-11 shrink-0 rounded-2xl border px-4 text-sm font-medium transition-colors ${
              filtersOpen || filterCount > 0
                ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                : 'border-white/8 bg-zinc-900/70 text-zinc-400 hover:border-white/14 hover:text-zinc-200'
            }`}
            startContent={<SlidersHorizontal className="h-4 w-4" />}
          >
            Filtros
            {filterCount > 0 && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                {filterCount}
              </span>
            )}
          </Button>
        </div>

        {/* ── Expandable filter panel ───────────────────────── */}
        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              key="filter-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0, 0.67, 0] }}
              className="overflow-hidden"
            >
              <div className="soft-panel rounded-[1.6rem] p-5 md:p-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

                  {/* Date availability */}
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Disponibilidad
                    </p>
                    <DatePicker
                      value={selectedDate}
                      onChange={(v) => setSelectedDate(v)}
                      minValue={todayDate}
                      granularity="day"
                      aria-label="Filtrar por fecha de disponibilidad"
                      showMonthAndYearPickers
                      classNames={{
                        base: 'w-full',
                        inputWrapper:
                          'h-10 min-h-0 rounded-xl border border-white/10 bg-white/[0.04] shadow-none transition-colors data-[hover=true]:border-white/16 data-[hover=true]:bg-white/[0.06] group-data-[focus=true]:border-violet-500/40 dark:border-white/10 dark:bg-white/[0.04]',
                        input: 'text-sm text-zinc-300',
                        segment: 'text-sm text-zinc-300 data-[placeholder=true]:text-zinc-600 focus:bg-violet-500/20 rounded',
                        selectorButton: 'text-zinc-500 hover:text-zinc-300',
                        selectorIcon: 'text-zinc-500',
                        calendarContent: 'bg-zinc-900 border-white/10',
                      }}
                      calendarProps={{
                        classNames: {
                          base: 'rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.6)] p-3',
                          headerWrapper: 'pb-2',
                          title: 'text-sm font-semibold text-zinc-200',
                          gridHeaderCell: 'text-[11px] font-medium text-zinc-500',
                          cell: 'text-sm',
                          cellButton: [
                            'h-8 w-8 rounded-xl text-zinc-300 text-sm',
                            'data-[today=true]:bg-white/8 data-[today=true]:font-semibold',
                            'data-[selected=true]:bg-violet-600 data-[selected=true]:text-white data-[selected=true]:font-semibold',
                            'data-[hover=true]:bg-white/10',
                            'data-[disabled=true]:opacity-30 data-[disabled=true]:cursor-not-allowed',
                          ].join(' '),
                          prevButton: 'text-zinc-400 hover:text-zinc-200 hover:bg-white/8 rounded-lg',
                          nextButton: 'text-zinc-400 hover:text-zinc-200 hover:bg-white/8 rounded-lg',
                        },
                      }}
                    />
                    {selectedDate && (
                      <button
                        type="button"
                        onClick={() => setSelectedDate(null)}
                        className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300"
                      >
                        <X className="h-3 w-3" /> Quitar fecha
                      </button>
                    )}
                  </div>

                  {/* Price range */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Precio desde
                      </p>
                      <p className="text-[11px] font-semibold text-zinc-400">
                        {formatCurrency(priceRange[0])} – {formatCurrency(priceRange[1])}
                      </p>
                    </div>
                    <div className="px-1 pt-2">
                      <DualRangeSlider
                        min={0}
                        max={priceMax}
                        value={priceRange}
                        onChange={setPriceRange}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-600">
                      <span>{formatCurrency(0)}</span>
                      <span>{formatCurrency(priceMax)}</span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Calificación mínima
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(['4', '3'] as const).map((val) => (
                        <Chip
                          key={val}
                          variant={rating === val ? 'solid' : 'bordered'}
                          color={rating === val ? 'secondary' : 'default'}
                          onClick={() => setRating(rating === val ? 'all' : val)}
                          startContent={
                            <Star
                              className={`h-3 w-3 ${rating === val ? 'fill-current' : ''}`}
                            />
                          }
                          classNames={{
                            base: `cursor-pointer transition-all ${
                              rating === val
                                ? 'border-amber-400/50 bg-amber-400/15 text-amber-300'
                                : 'border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                            }`,
                            content: 'text-xs font-semibold',
                          }}
                        >
                          {val}+ estrellas
                        </Chip>
                      ))}
                    </div>
                  </div>

                  {/* Quick toggles */}
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Otros filtros
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Chip
                        variant={verifiedOnly ? 'solid' : 'bordered'}
                        onClick={() => setVerifiedOnly((v) => !v)}
                        startContent={<BadgeCheck className="h-3.5 w-3.5" />}
                        classNames={{
                          base: `cursor-pointer transition-all ${
                            verifiedOnly
                              ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
                              : 'border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                          }`,
                          content: 'text-xs font-semibold',
                        }}
                      >
                        Verificadas
                      </Chip>
                      <Chip
                        variant={withServices ? 'solid' : 'bordered'}
                        onClick={() => setWithServices((v) => !v)}
                        classNames={{
                          base: `cursor-pointer transition-all ${
                            withServices
                              ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
                              : 'border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                          }`,
                          content: 'text-xs font-semibold',
                        }}
                      >
                        Con agenda activa
                      </Chip>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active filters strip ──────────────────────────── */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                Activos:
              </span>

              {deferredQuery.trim() && (
                <Chip
                  size="sm"
                  onClose={() => setQuery('')}
                  classNames={{
                    base: 'border border-white/10 bg-white/[0.06] text-zinc-300',
                    content: 'text-xs',
                    closeButton: 'text-zinc-500 hover:text-zinc-200',
                  }}
                >
                  "{deferredQuery.trim()}"
                </Chip>
              )}

              {sortKey !== 'default' && (
                <Chip
                  size="sm"
                  onClose={() => setSortKey('default')}
                  startContent={<ArrowUpDown className="h-3 w-3" />}
                  classNames={{
                    base: 'border border-white/10 bg-white/[0.06] text-zinc-300',
                    content: 'text-xs',
                    closeButton: 'text-zinc-500 hover:text-zinc-200',
                  }}
                >
                  {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
                </Chip>
              )}

              {rating !== 'all' && (
                <Chip
                  size="sm"
                  onClose={() => setRating('all')}
                  startContent={<Star className="h-3 w-3 fill-current text-amber-400" />}
                  classNames={{
                    base: 'border border-amber-400/30 bg-amber-400/10 text-amber-300',
                    content: 'text-xs',
                    closeButton: 'text-amber-400/60 hover:text-amber-300',
                  }}
                >
                  {rating}+ estrellas
                </Chip>
              )}

              {isPriceFiltered && (
                <Chip
                  size="sm"
                  onClose={() => setPriceRange([0, priceMax])}
                  classNames={{
                    base: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                    content: 'text-xs',
                    closeButton: 'text-emerald-400/60 hover:text-emerald-300',
                  }}
                >
                  {formatCurrency(priceRange[0])} – {formatCurrency(priceRange[1])}
                </Chip>
              )}

              {selectedDate && (
                <Chip
                  size="sm"
                  onClose={() => setSelectedDate(null)}
                  startContent={<CalendarDays className="h-3 w-3" />}
                  classNames={{
                    base: 'border border-sky-500/30 bg-sky-500/10 text-sky-300',
                    content: 'text-xs',
                    closeButton: 'text-sky-400/60 hover:text-sky-300',
                  }}
                >
                  {selectedDate.day}/{selectedDate.month}/{selectedDate.year}
                </Chip>
              )}

              {verifiedOnly && (
                <Chip
                  size="sm"
                  onClose={() => setVerifiedOnly(false)}
                  startContent={<BadgeCheck className="h-3 w-3" />}
                  classNames={{
                    base: 'border border-violet-500/30 bg-violet-500/10 text-violet-300',
                    content: 'text-xs',
                    closeButton: 'text-violet-400/60 hover:text-violet-300',
                  }}
                >
                  Verificadas
                </Chip>
              )}

              {withServices && (
                <Chip
                  size="sm"
                  onClose={() => setWithServices(false)}
                  classNames={{
                    base: 'border border-violet-500/30 bg-violet-500/10 text-violet-300',
                    content: 'text-xs',
                    closeButton: 'text-violet-400/60 hover:text-violet-300',
                  }}
                >
                  Con agenda activa
                </Chip>
              )}

              <button
                type="button"
                onClick={clearAll}
                className="ml-auto text-[11px] text-zinc-600 transition-colors hover:text-zinc-400"
              >
                Limpiar todo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Result count ──────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {hasActiveFilters && (
            <motion.p
              key={filtered.length}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-zinc-500"
            >
              {filtered.length === 0
                ? 'Ninguna barberia coincide'
                : `${filtered.length} barberia${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`}
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Grid ─────────────────────────────────────────── */}
        {filtered.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((shop, i) => (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: i < 6 ? i * 0.04 : 0 }}
              >
                <BookShopCard shop={shop} />
              </motion.div>
            ))}
          </div>
        ) : hasActiveFilters ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="soft-panel rounded-[1.8rem] p-12 text-center"
          >
            <p className="text-base font-semibold text-ink dark:text-slate-200">Sin resultados</p>
            <p className="mt-1 text-sm text-zinc-500">
              Proba con otro termino o ajusta los filtros
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-4 rounded-full border border-white/10 px-5 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
            >
              Limpiar filtros
            </button>
          </motion.div>
        ) : null}
      </div>
    </>
  );
}
