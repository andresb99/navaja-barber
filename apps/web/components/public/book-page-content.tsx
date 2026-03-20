'use client';

import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { type CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import { DateRangePicker } from '@heroui/date-picker';
import { Slider } from '@heroui/slider';
import { Chip } from '@heroui/chip';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import {
  ArrowDownUp,
  ArrowUpDown,
  BadgeCheck,
  CalendarDays,
  Search,
  SlidersHorizontal,
  Sparkles,
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

type DateRange = { start: CalendarDate; end: CalendarDate };

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
  return Math.ceil(max / 10000) * 10000;
}

// ── Calendar classNames (theme-aware) ─────────────────────────────────────────
const calendarCN = {
  base: [
    'rounded-2xl border p-2',
    'border-zinc-200 bg-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)]',
    'dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.6)]',
  ].join(' '),
  headerWrapper: 'pb-2',
  title: 'text-sm font-semibold text-zinc-800 dark:text-zinc-200',
  gridHeaderCell: 'text-[11px] font-medium text-zinc-400 dark:text-zinc-500',
  cell: [
    'data-[selected=true]:bg-violet-500/[0.10] dark:data-[selected=true]:bg-violet-500/[0.12]',
    'data-[selection-start=true]:rounded-l-full',
    'data-[selection-end=true]:rounded-r-full',
  ].join(' '),
  cellButton: [
    'h-8 w-8 rounded-full text-sm transition-colors',
    'text-zinc-600 dark:text-zinc-400',
    'data-[selected=true]:text-violet-700 dark:data-[selected=true]:text-zinc-200',
    'data-[selection-start=true]:!bg-violet-600 data-[selection-start=true]:!text-white data-[selection-start=true]:!font-semibold',
    'data-[selection-end=true]:!bg-violet-600 data-[selection-end=true]:!text-white data-[selection-end=true]:!font-semibold',
    'data-[today=true]:font-semibold data-[today=true]:ring-1 data-[today=true]:ring-violet-500/50',
    'data-[hover=true]:bg-zinc-100 data-[hover=true]:text-zinc-800 dark:data-[hover=true]:bg-white/10 dark:data-[hover=true]:text-zinc-200',
    'data-[disabled=true]:opacity-30 data-[disabled=true]:cursor-not-allowed',
  ].join(' '),
  prevButton:
    'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/8 rounded-lg',
  nextButton:
    'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/8 rounded-lg',
};

// ── Panel filter input wrapper (theme-aware) ───────────────────────────────────
const panelInputWrapperCN = [
  'h-10 min-h-0 rounded-xl shadow-none transition-colors',
  'border border-zinc-200 bg-zinc-50',
  'data-[hover=true]:border-zinc-300 data-[hover=true]:bg-white',
  'group-data-[focus=true]:border-violet-400 group-data-[focus=true]:bg-white',
  'dark:border-white/10 dark:bg-white/[0.04]',
  'dark:data-[hover=true]:border-white/16 dark:data-[hover=true]:bg-white/[0.06]',
  'dark:group-data-[focus=true]:border-violet-500/40',
].join(' ');

// ── Main component ─────────────────────────────────────────────────────────────
export function BookPageContent({ shops }: BookPageContentProps) {
  const priceMax = useMemo(() => getPriceMax(shops), [shops]);

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, priceMax]);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withServices, setWithServices] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const deferredQuery = useDeferredValue(query);

  const clearAll = useCallback(() => {
    setQuery('');
    setSortKey('default');
    setPriceRange([0, priceMax]);
    setDateRange(null);
    setOpenNow(false);
    setVerifiedOnly(false);
    setWithServices(false);
  }, [priceMax]);

  const isPriceFiltered = priceRange[0] > 0 || priceRange[1] < priceMax;
  const hasActiveFilters =
    deferredQuery.trim() ||
    sortKey !== 'default' ||
    isPriceFiltered ||
    dateRange !== null ||
    openNow ||
    verifiedOnly ||
    withServices;

  const filterCount = [
    isPriceFiltered,
    dateRange !== null,
    openNow,
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

      if (isPriceFiltered) {
        const price = shop.minServicePriceCents;
        if (price === null) return false;
        if (price < priceRange[0] || price > priceRange[1]) return false;
      }

      if (dateRange !== null && shop.activeServiceCount === 0) return false;

      if (openNow && shop.todayAvailability === 'closed') return false;

      if (verifiedOnly && !shop.isVerified) return false;
      if (withServices && shop.activeServiceCount === 0) return false;

      return true;
    });

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
  }, [shops, deferredQuery, sortKey, priceRange, isPriceFiltered, dateRange, openNow, verifiedOnly, withServices]);

  const todayDate = today(getLocalTimeZone());

  return (
    <div className="space-y-3">

      {/* ── Toolbar: Search + Sort + Filters ──────────────────────────────── */}
      <div className="flex items-center gap-2">

        {/* Search input */}
        <div className="flex-1 min-w-0">
          <Input
            value={query}
            onValueChange={setQuery}
            placeholder="Busca por nombre o zona (ej. Pocitos, Navaja)"
            startContent={
              <Search className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
            }
            endContent={
              query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  aria-label="Limpiar busqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null
            }
            classNames={{
              inputWrapper: [
                'h-11 rounded-2xl shadow-none transition-all duration-200',
                // light
                'border border-zinc-200 bg-white',
                'data-[hover=true]:border-zinc-300',
                'group-data-[focus=true]:border-violet-400 group-data-[focus=true]:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]',
                // dark
                'dark:border-white/10 dark:bg-zinc-900/80 dark:backdrop-blur-sm',
                'dark:data-[hover=true]:border-white/16',
                'dark:group-data-[focus=true]:border-violet-500/50 dark:group-data-[focus=true]:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]',
              ].join(' '),
              input:
                'text-sm text-zinc-800 placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500',
            }}
          />
        </div>

        {/* Sort select */}
        <div className="w-[175px] shrink-0">
          <Select
            selectedKeys={[sortKey]}
            onSelectionChange={(keys) => {
              const k = Array.from(keys)[0] as SortKey;
              if (k) setSortKey(k);
            }}
            startContent={
              <ArrowDownUp className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
            }
            aria-label="Ordenar resultados"
            classNames={{
              trigger: [
                'h-11 rounded-2xl shadow-none transition-all duration-200',
                // light
                'border border-zinc-200 bg-white',
                'data-[hover=true]:border-zinc-300',
                'data-[open=true]:border-violet-400 data-[open=true]:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]',
                // dark
                'dark:border-white/10 dark:bg-zinc-900/80 dark:backdrop-blur-sm',
                'dark:data-[hover=true]:border-white/16',
                'dark:data-[open=true]:border-violet-500/50',
              ].join(' '),
              value: 'text-sm font-medium text-zinc-700 dark:text-zinc-300',
              selectorIcon: 'text-zinc-400 dark:text-zinc-500',
              popoverContent: [
                'rounded-2xl border p-1 shadow-xl',
                'border-zinc-200 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)]',
                'dark:border-white/10 dark:bg-zinc-900 dark:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.6)] dark:backdrop-blur-xl',
              ].join(' '),
              listboxWrapper: 'p-0',
            }}
            listboxProps={{
              itemClasses: {
                base: [
                  'rounded-xl px-3 py-2 text-sm transition-colors',
                  'text-zinc-700 data-[hover=true]:bg-zinc-100 data-[selected=true]:text-violet-600 data-[selected=true]:bg-violet-50',
                  'dark:text-zinc-300 dark:data-[hover=true]:bg-white/8 dark:data-[selected=true]:text-violet-300 dark:data-[selected=true]:bg-violet-500/10',
                ].join(' '),
              },
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.key}>{opt.label}</SelectItem>
            ))}
          </Select>
        </div>

        {/* Filters button */}
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={[
            'flex h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition-all duration-200',
            filtersOpen || filterCount > 0
              ? 'border-violet-300 bg-violet-50 text-violet-700 shadow-[0_0_0_3px_rgba(139,92,246,0.08)] dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300 dark:shadow-none'
              : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-800 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-400 dark:hover:border-white/16 dark:hover:text-zinc-200',
          ].join(' ')}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filtros</span>
          {filterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Expandable filter panel ─────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            key="filter-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.32, 0, 0.67, 0] }}
            className="overflow-hidden"
          >
            <div className="soft-panel rounded-[1.4rem] p-5 md:p-6 space-y-5">

              {/* Row 1: two filter sections */}
              <div className="grid gap-4 md:grid-cols-2">

                {/* Disponibilidad */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Disponibilidad
                    </span>
                  </div>
                  <DateRangePicker<CalendarDate>
                    value={dateRange ?? undefined}
                    onChange={(v) => setDateRange(v)}
                    minValue={todayDate}
                    granularity="day"
                    aria-label="Filtrar por rango de fechas"
                    showMonthAndYearPickers
                    classNames={{
                      base: 'w-full',
                      inputWrapper: panelInputWrapperCN,
                      input: 'text-sm text-zinc-700 dark:text-zinc-300',
                      segment:
                        'text-sm text-zinc-700 data-[placeholder=true]:text-zinc-400 focus:bg-violet-500/15 rounded dark:text-zinc-300 dark:data-[placeholder=true]:text-zinc-600',
                      selectorButton:
                        'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300',
                      selectorIcon:
                        'text-zinc-400 dark:text-zinc-500',
                    }}
                    calendarProps={{ classNames: calendarCN }}
                  />
                  {dateRange && (
                    <button
                      type="button"
                      onClick={() => setDateRange(null)}
                      className="flex items-center gap-1 text-[11px] text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      <X className="h-3 w-3" />
                      Quitar fechas
                    </button>
                  )}
                </div>

                {/* Otros filtros */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Otros filtros
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {/* Verificadas toggle pill */}
                    <button
                      type="button"
                      onClick={() => setVerifiedOnly((v) => !v)}
                      className={[
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                        verifiedOnly
                          ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-800 dark:border-white/10 dark:bg-transparent dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-200',
                      ].join(' ')}
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verificadas
                    </button>

                    {/* Con agenda activa toggle pill */}
                    <button
                      type="button"
                      onClick={() => setWithServices((v) => !v)}
                      className={[
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                        withServices
                          ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-800 dark:border-white/10 dark:bg-transparent dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-200',
                      ].join(' ')}
                    >
                      Con agenda activa
                    </button>

                    {/* Abierto ahora toggle pill */}
                    <button
                      type="button"
                      onClick={() => setOpenNow((v) => !v)}
                      className={[
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                        openNow
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-800 dark:border-white/10 dark:bg-transparent dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-200',
                      ].join(' ')}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${openNow ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                      Abierto ahora
                    </button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-zinc-100 dark:bg-white/[0.06]" />

              {/* Row 2: Price range slider */}
              <Slider
                label="Precio desde"
                minValue={0}
                maxValue={priceMax}
                step={5000}
                value={priceRange}
                onChange={(v) => {
                  if (Array.isArray(v)) {
                    setPriceRange([v[0]!, v[1]!] as [number, number]);
                  }
                }}
                getValue={(v) => {
                  const arr = Array.isArray(v) ? v : [0, v];
                  return `${formatCurrency(arr[0] ?? 0)} – ${formatCurrency(arr[1] ?? priceMax)}`;
                }}
                classNames={{
                  base: 'w-full',
                  label:
                    'text-xs font-semibold text-zinc-500 dark:text-zinc-400',
                  value: 'text-xs font-semibold text-zinc-500 dark:text-zinc-400',
                  track:
                    'bg-zinc-200 border-zinc-200 dark:bg-zinc-700/50 dark:border-zinc-700/50',
                  filler: 'bg-gradient-to-r from-violet-500 to-violet-400',
                  thumb: [
                    'bg-white border-2 border-violet-500',
                    'shadow-[0_2px_8px_rgba(139,92,246,0.35)]',
                    'data-[dragging=true]:shadow-[0_4px_16px_rgba(139,92,246,0.55)]',
                    'data-[dragging=true]:scale-110',
                    'transition-[transform,box-shadow]',
                  ].join(' '),
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active filters strip ────────────────────────────────────────────── */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex flex-wrap items-center gap-1.5"
          >
            {deferredQuery.trim() && (
              <Chip
                size="sm"
                onClose={() => setQuery('')}
                classNames={{
                  base: 'border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200',
                }}
              >
                &quot;{deferredQuery.trim()}&quot;
              </Chip>
            )}

            {sortKey !== 'default' && (
              <Chip
                size="sm"
                onClose={() => setSortKey('default')}
                startContent={<ArrowUpDown className="h-3 w-3 ml-1" />}
                classNames={{
                  base: 'border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200',
                }}
              >
                {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
              </Chip>
            )}

            {dateRange !== null && (
              <Chip
                size="sm"
                onClose={() => setDateRange(null)}
                startContent={<CalendarDays className="h-3 w-3 ml-1" />}
                classNames={{
                  base: 'border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-violet-400 hover:text-violet-700 dark:text-violet-400/60 dark:hover:text-violet-300',
                }}
              >
                {dateRange.start.day}/{dateRange.start.month}
                {dateRange.start.compare(dateRange.end) !== 0 &&
                  ` – ${dateRange.end.day}/${dateRange.end.month}`}
              </Chip>
            )}

            {openNow && (
              <Chip
                size="sm"
                onClose={() => setOpenNow(false)}
                classNames={{
                  base: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-emerald-400 hover:text-emerald-700 dark:text-emerald-400/60 dark:hover:text-emerald-300',
                }}
              >
                Abierto ahora
              </Chip>
            )}

            {isPriceFiltered && (
              <Chip
                size="sm"
                onClose={() => setPriceRange([0, priceMax])}
                classNames={{
                  base: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-emerald-400 hover:text-emerald-700 dark:text-emerald-400/60 dark:hover:text-emerald-300',
                }}
              >
                {formatCurrency(priceRange[0])} – {formatCurrency(priceRange[1])}
              </Chip>
            )}

            {verifiedOnly && (
              <Chip
                size="sm"
                onClose={() => setVerifiedOnly(false)}
                startContent={<BadgeCheck className="h-3 w-3 ml-1" />}
                classNames={{
                  base: 'border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-violet-400 hover:text-violet-700 dark:text-violet-400/60 dark:hover:text-violet-300',
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
                  base: 'border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-violet-400 hover:text-violet-700 dark:text-violet-400/60 dark:hover:text-violet-300',
                }}
              >
                Con agenda activa
              </Chip>
            )}

            <button
              type="button"
              onClick={clearAll}
              className="ml-auto text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              Limpiar todo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result count ────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {hasActiveFilters && (
          <motion.div
            key={filtered.length}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {filtered.length > 0 ? (
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {`${filtered.length} barberia${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`}
              </p>
            ) : (
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Ninguna barberia coincide
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
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
          className="soft-panel rounded-[1.4rem] p-12 text-center"
        >
          <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            Sin resultados
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
            Proba con otro termino o ajusta los filtros
          </p>
          <button
            type="button"
            onClick={clearAll}
            className={[
              'mt-5 rounded-full border px-5 py-2 text-xs font-semibold transition-colors',
              'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-800',
              'dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-200',
            ].join(' ')}
          >
            Limpiar filtros
          </button>
        </motion.div>
      ) : null}
    </div>
  );
}
