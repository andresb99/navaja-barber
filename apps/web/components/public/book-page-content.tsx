'use client';

import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { type CalendarDate, Time, today, getLocalTimeZone } from '@internationalized/date';
import { DateRangePicker } from '@heroui/date-picker';
import { TimeInput, type TimeInputValue } from '@heroui/date-input';
import { Slider } from '@heroui/slider';
import { Chip } from '@heroui/chip';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import {
  ArrowDownUp,
  ArrowUpDown,
  BadgeCheck,
  CalendarDays,
  Clock,
  Search,
  SlidersHorizontal,
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

function formatTime(t: TimeInputValue): string {
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

// ── Shared classNames ─────────────────────────────────────────────────────────
const inputWrapperCN = [
  'h-11 rounded-2xl shadow-none backdrop-blur-sm transition-colors',
  // light
  'border border-zinc-200 bg-white/80',
  'data-[hover=true]:border-zinc-300 data-[hover=true]:bg-white',
  'group-data-[focus=true]:border-violet-400 group-data-[focus=true]:bg-white',
  // dark
  'dark:border-white/8 dark:bg-zinc-900/70',
  'dark:data-[hover=true]:border-white/14 dark:data-[hover=true]:bg-zinc-900/80',
  'dark:group-data-[focus=true]:border-violet-500/40 dark:group-data-[focus=true]:bg-zinc-900/90',
].join(' ');

const panelInputWrapperCN = [
  'h-10 min-h-0 rounded-xl shadow-none transition-colors',
  // light
  'border border-zinc-200 bg-white',
  'data-[hover=true]:border-zinc-300',
  'group-data-[focus=true]:border-violet-400',
  // dark
  'dark:border-white/10 dark:bg-white/[0.04]',
  'dark:data-[hover=true]:border-white/16 dark:data-[hover=true]:bg-white/[0.06]',
  'dark:group-data-[focus=true]:border-violet-500/40',
].join(' ');

const calendarCN = {
  base: [
    'rounded-2xl border p-2',
    // light
    'border-zinc-200 bg-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)]',
    // dark
    'dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.6)]',
  ].join(' '),
  headerWrapper: 'pb-2',
  title: 'text-sm font-semibold text-zinc-800 dark:text-zinc-200',
  gridHeaderCell: 'text-[11px] font-medium text-zinc-400 dark:text-zinc-500',
  // The <td> carries the range band — rounded only at the two endpoints
  cell: [
    'data-[selected=true]:bg-violet-500/[0.10] dark:data-[selected=true]:bg-violet-500/[0.12]',
    'data-[selection-start=true]:rounded-l-full',
    'data-[selection-end=true]:rounded-r-full',
  ].join(' '),
  // The <button> only gets a filled circle for start / end
  cellButton: [
    'h-8 w-8 rounded-full text-sm transition-colors',
    // default text
    'text-zinc-600 dark:text-zinc-400',
    // in-range cells: no bg on the button (band lives on the <td>), just accent text
    'data-[selected=true]:text-violet-700 dark:data-[selected=true]:text-zinc-200',
    // start/end: solid violet circle — !important overrides the in-range rule above
    'data-[selection-start=true]:!bg-violet-600 data-[selection-start=true]:!text-white data-[selection-start=true]:!font-semibold',
    'data-[selection-end=true]:!bg-violet-600 data-[selection-end=true]:!text-white data-[selection-end=true]:!font-semibold',
    // today: subtle ring
    'data-[today=true]:font-semibold data-[today=true]:ring-1 data-[today=true]:ring-violet-500/50',
    // hover
    'data-[hover=true]:bg-zinc-100 data-[hover=true]:text-zinc-800 dark:data-[hover=true]:bg-white/10 dark:data-[hover=true]:text-zinc-200',
    // disabled
    'data-[disabled=true]:opacity-30 data-[disabled=true]:cursor-not-allowed',
  ].join(' '),
  prevButton:
    'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/8 rounded-lg',
  nextButton:
    'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/8 rounded-lg',
};

// ── Main component ────────────────────────────────────────────────────────────
export function BookPageContent({ shops }: BookPageContentProps) {
  const priceMax = useMemo(() => getPriceMax(shops), [shops]);

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, priceMax]);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [selectedTime, setSelectedTime] = useState<TimeInputValue | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withServices, setWithServices] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const deferredQuery = useDeferredValue(query);

  const clearAll = useCallback(() => {
    setQuery('');
    setSortKey('default');
    setPriceRange([0, priceMax]);
    setDateRange(null);
    setSelectedTime(null);
    setVerifiedOnly(false);
    setWithServices(false);
  }, [priceMax]);

  const isPriceFiltered = priceRange[0] > 0 || priceRange[1] < priceMax;
  const hasActiveFilters =
    deferredQuery.trim() ||
    sortKey !== 'default' ||
    isPriceFiltered ||
    dateRange !== null ||
    selectedTime !== null ||
    verifiedOnly ||
    withServices;

  const filterCount = [
    isPriceFiltered,
    dateRange !== null,
    selectedTime !== null,
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
      if (selectedTime !== null && shop.activeServiceCount === 0) return false;

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
  }, [shops, deferredQuery, sortKey, priceRange, isPriceFiltered, dateRange, selectedTime, verifiedOnly, withServices]);

  const todayDate = today(getLocalTimeZone());

  return (
    <div className="space-y-4">
      {/* ── Search + Sort row ─────────────────────────────── */}
      <div className="flex items-center gap-3">
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
              inputWrapper: inputWrapperCN,
              input: 'text-sm text-zinc-100 placeholder:text-zinc-500',
            }}
          />
        </div>

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
            <div className="soft-panel rounded-[1.6rem] p-5 md:p-6 space-y-6">

              {/* Row 1: Disponibilidad | Horario | Otros filtros */}
              <div className="grid gap-5 md:grid-cols-3">

                {/* Date range */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Disponibilidad
                  </p>
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
                      input: 'text-sm text-zinc-300',
                      segment:
                        'text-sm text-zinc-300 data-[placeholder=true]:text-zinc-600 focus:bg-violet-500/20 rounded',
                      selectorButton: 'text-zinc-500 hover:text-zinc-300',
                      selectorIcon: 'text-zinc-500',
                    }}
                    calendarProps={{ classNames: calendarCN }}
                  />
                  {dateRange && (
                    <button
                      type="button"
                      onClick={() => setDateRange(null)}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <X className="h-3 w-3" /> Quitar fechas
                    </button>
                  )}
                </div>

                {/* Time */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Horario
                  </p>
                  <TimeInput
                    value={selectedTime}
                    onChange={(v) => setSelectedTime(v)}
                    granularity="minute"
                    placeholderValue={new Time(9, 0)}
                    aria-label="Filtrar por horario disponible"
                    hourCycle={24}
                    classNames={{
                      base: 'w-full',
                      inputWrapper: panelInputWrapperCN,
                      input: 'text-sm text-zinc-300',
                      segment:
                        'text-sm text-zinc-300 data-[placeholder=true]:text-zinc-600 focus:bg-violet-500/20 rounded',
                    }}
                  />
                  {selectedTime && (
                    <button
                      type="button"
                      onClick={() => setSelectedTime(null)}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <X className="h-3 w-3" /> Quitar hora
                    </button>
                  )}
                </div>

                {/* Quick toggles */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Otros filtros
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
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

              {/* Row 2: Price range slider (full width) */}
              <div className="space-y-1">
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
                      'text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500',
                    value: 'text-[11px] font-semibold text-zinc-400',
                    track: 'bg-zinc-700/50 border-zinc-700/50',
                    filler: 'bg-gradient-to-r from-violet-600 to-violet-400',
                    thumb: [
                      'bg-white border-2 border-violet-500',
                      'shadow-[0_2px_12px_rgba(139,92,246,0.45)]',
                      'data-[dragging=true]:shadow-[0_4px_20px_rgba(139,92,246,0.6)]',
                      'data-[dragging=true]:scale-110',
                      'transition-[transform,box-shadow]',
                    ].join(' '),
                  }}
                />
                <div className="flex justify-between px-1 text-[10px] text-zinc-600">
                  <span>{formatCurrency(0)}</span>
                  <span>{formatCurrency(priceMax)}</span>
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

            {dateRange !== null && (
              <Chip
                size="sm"
                onClose={() => setDateRange(null)}
                startContent={<CalendarDays className="h-3 w-3" />}
                classNames={{
                  base: 'border border-sky-500/30 bg-sky-500/10 text-sky-300',
                  content: 'text-xs',
                  closeButton: 'text-sky-400/60 hover:text-sky-300',
                }}
              >
                {dateRange.start.day}/{dateRange.start.month}
                {dateRange.start.compare(dateRange.end) !== 0 &&
                  ` – ${dateRange.end.day}/${dateRange.end.month}`}
              </Chip>
            )}

            {selectedTime !== null && (
              <Chip
                size="sm"
                onClose={() => setSelectedTime(null)}
                startContent={<Clock className="h-3 w-3" />}
                classNames={{
                  base: 'border border-teal-500/30 bg-teal-500/10 text-teal-300',
                  content: 'text-xs',
                  closeButton: 'text-teal-400/60 hover:text-teal-300',
                }}
              >
                {formatTime(selectedTime)}
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
  );
}
