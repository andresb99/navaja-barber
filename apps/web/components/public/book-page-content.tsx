'use client';

import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { type CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import { DateRangePicker } from '@heroui/date-picker';
import { Chip } from '@heroui/chip';
import { Select, SelectItem } from '@heroui/select';
import {
  ArrowDownUp,
  ArrowUpDown,
  BadgeCheck,
  CalendarDays,
  Search,
  X,
} from 'lucide-react';
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

// ── Toggle pill (memoized — only re-renders when active/onClick changes) ────────
const TogglePill = memo(function TogglePill({
  active,
  onClick,
  children,
  accent = 'violet',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent?: 'violet' | 'emerald';
}) {
  const activeClass =
    accent === 'emerald'
      ? 'border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
      : 'border-focusLight/30 bg-focusLight/[0.07] text-violet-700 dark:border-focusLight/25 dark:bg-focusLight/10 dark:text-violet-300';
  const idleClass =
    'border-[rgba(148,163,184,0.3)] bg-[rgba(241,245,249,0.6)] text-slate/60 hover:border-[rgba(148,163,184,0.5)] hover:text-ink/75 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/45 dark:hover:border-white/25 dark:hover:text-white/70';
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all',
        active ? activeClass : idleClass,
      ].join(' ')}
    >
      {children}
    </button>
  );
});

// ── Main component ─────────────────────────────────────────────────────────────
export function BookPageContent({ shops }: BookPageContentProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withServices, setWithServices] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const clearAll = useCallback(() => {
    setQuery('');
    setSortKey('default');
    setDateRange(null);
    setOpenNow(false);
    setVerifiedOnly(false);
    setWithServices(false);
  }, []);

  // Stable callbacks — prevent TogglePill from re-rendering unnecessarily
  const toggleOpenNow = useCallback(() => setOpenNow((v) => !v), []);
  const toggleVerifiedOnly = useCallback(() => setVerifiedOnly((v) => !v), []);
  const toggleWithServices = useCallback(() => setWithServices((v) => !v), []);
  const handleDateChange = useCallback((v: DateRange) => {
    setDateRange(v);
  }, []);
  const handleSortChange = useCallback((keys: Iterable<React.Key>) => {
    const k = Array.from(keys)[0] as SortKey;
    if (k) setSortKey(k);
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(deferredQuery.trim()) ||
      sortKey !== 'default' ||
      dateRange !== null ||
      openNow ||
      verifiedOnly ||
      withServices,
    [deferredQuery, sortKey, dateRange, openNow, verifiedOnly, withServices],
  );

  // Pre-parse workingHours time strings once per shops load, not on every filter run
  const parsedWorkingHours = useMemo(
    () =>
      new Map(
        shops.map((shop) => [
          shop.id,
          shop.workingHours.map((wh) => {
            const [sh = 0, sm = 0] = wh.startTime.split(':').map(Number);
            const [eh = 0, em = 0] = wh.endTime.split(':').map(Number);
            return { dayOfWeek: wh.dayOfWeek, startMinutes: sh * 60 + sm, endMinutes: eh * 60 + em };
          }),
        ]),
      ),
    [shops],
  );

  const filtered = useMemo(() => {
    const q = normalize(deferredQuery.trim());

    let currentMinutes = 0;
    let isoDayOfWeek = 0;
    if (openNow) {
      const now = new Date();
      currentMinutes = now.getHours() * 60 + now.getMinutes();
      const jsDay = now.getDay();
      isoDayOfWeek = jsDay === 0 ? 7 : jsDay;
    }

    let result = shops.filter((shop) => {
      if (q) {
        const inName = normalize(shop.name).includes(q);
        const inCity = normalize(shop.city || '').includes(q);
        const inRegion = normalize(shop.region || '').includes(q);
        const inLocation = normalize(shop.locationLabel || '').includes(q);
        if (!inName && !inCity && !inRegion && !inLocation) return false;
      }

      if (dateRange !== null && shop.activeServiceCount === 0) return false;

      if (openNow) {
        const hours = parsedWorkingHours.get(shop.id) ?? [];
        const isOpenNow = hours.some(
          (wh) =>
            wh.dayOfWeek === isoDayOfWeek &&
            currentMinutes >= wh.startMinutes &&
            currentMinutes < wh.endMinutes,
        );
        if (!isOpenNow) return false;
      }

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
  }, [shops, deferredQuery, sortKey, dateRange, openNow, verifiedOnly, withServices, parsedWorkingHours]);

  const todayDate = useMemo(() => today(getLocalTimeZone()), []);
  return (
    <div className="space-y-3 px-4 md:px-6">

      {/* ── Search + DateRangePicker row ──────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className={[
          'relative group min-w-0 flex-1 rounded-2xl border transition-all duration-150',
          'border-[rgba(148,163,184,0.3)] bg-[rgba(241,245,249,0.6)]',
          'hover:border-[rgba(148,163,184,0.5)]',
          'focus-within:border-focusLight/40 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgb(var(--focus-light)/0.08)]',
          'dark:border-white/10 dark:bg-white/[0.04]',
          'dark:hover:border-white/25',
          'dark:focus-within:border-focusLight/30 dark:focus-within:bg-transparent dark:focus-within:shadow-[0_0_0_3px_rgb(var(--focus-light)/0.10)]',
        ].join(' ')}>
          <Search className={[
            'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] transition-colors',
            'text-slate/30 group-focus-within:text-focusLight/70',
            'dark:text-zinc-500 dark:group-focus-within:text-focusLight/60',
          ].join(' ')} />
          <input
            data-slot="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar barberia..."
            className={[
              'h-12 w-full rounded-2xl bg-transparent pl-11 pr-10 text-[15px] outline-none',
              'text-ink placeholder:text-slate/35',
              'dark:text-zinc-100 dark:placeholder:text-zinc-500',
            ].join(' ')}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className={[
                'absolute right-3.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full transition-colors',
                'text-slate/35 hover:bg-ink/[0.06] hover:text-slate/70',
                'dark:text-zinc-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-300',
              ].join(' ')}
              aria-label="Limpiar busqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="heroui-native sm:flex-none sm:w-72">
          <DateRangePicker
            label="Disponibilidad"
            value={dateRange}
            onChange={(v) => handleDateChange(v as DateRange)}
            minValue={todayDate}
            className="w-full"
            radius="lg"
            size="sm"
            classNames={{
              inputWrapper: [
                'border transition-all duration-150',
                'border-[rgba(148,163,184,0.3)] bg-[rgba(241,245,249,0.6)]',
                'hover:border-[rgba(148,163,184,0.5)]',
                'group-data-[focus=true]:border-focusLight/40 group-data-[focus=true]:bg-white',
                'dark:border-white/10 dark:bg-white/[0.04]',
                'dark:hover:border-white/25',
                'dark:group-data-[focus=true]:border-focusLight/30',
              ].join(' '),
            }}
          />
        </div>
      </div>

      {/* ── Controls row: sort + quick filters ────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sort Select */}
        <div className="w-[165px] shrink-0">
          <Select
            selectedKeys={[sortKey]}
            onSelectionChange={handleSortChange}
            startContent={
              <ArrowDownUp className="h-3.5 w-3.5 shrink-0 opacity-50" />
            }
            aria-label="Ordenar resultados"
            classNames={{
              base: 'w-full',
              trigger: [
                'h-9 min-h-0 rounded-full border px-3.5 gap-2 shadow-none transition-all duration-150',
                'border-[rgba(148,163,184,0.3)] bg-[rgba(241,245,249,0.6)]',
                'data-[hover=true]:border-[rgba(148,163,184,0.5)]',
                'data-[open=true]:border-focusLight/40 data-[open=true]:bg-focusLight/[0.06]',
                'dark:border-white/10 dark:bg-white/[0.04]',
                'dark:data-[hover=true]:border-white/25',
                'dark:data-[open=true]:border-focusLight/30 dark:data-[open=true]:bg-focusLight/[0.08]',
                'focus-visible:ring-0 focus-visible:outline-none',
              ].join(' '),
              value: 'text-[13px] font-medium text-ink/60 dark:text-white/55',
              selectorIcon: 'text-slate/30 dark:text-white/25 w-3.5 h-3.5',
              popoverContent: [
                'rounded-xl border p-1 mt-1.5',
                'border-ink/[0.07] bg-white shadow-[0_8px_32px_-8px_rgb(var(--ink)/0.14),0_2px_8px_-4px_rgb(var(--ink)/0.07)]',
                'dark:border-white/[0.09] dark:bg-zinc-900 dark:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)]',
              ].join(' '),
              listboxWrapper: 'p-0',
            }}
            listboxProps={{
              itemClasses: {
                base: [
                  'rounded-lg px-3 py-2 text-sm transition-colors',
                  'text-ink/70 data-[hover=true]:bg-ink/[0.04] data-[hover=true]:text-ink/90',
                  'data-[selected=true]:font-semibold data-[selected=true]:text-violet-700 data-[selected=true]:bg-focusLight/[0.08]',
                  'dark:text-white/55 dark:data-[hover=true]:bg-white/[0.05] dark:data-[hover=true]:text-white/90',
                  'dark:data-[selected=true]:text-violet-300 dark:data-[selected=true]:bg-focusLight/10',
                ].join(' '),
              },
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.key}>{opt.label}</SelectItem>
            ))}
          </Select>
        </div>

        {/* Quick toggle pills */}
        <TogglePill active={openNow} onClick={toggleOpenNow} accent="emerald">
          <span className={`h-2 w-2 rounded-full transition-colors ${openNow ? 'bg-emerald-500' : 'bg-slate/25 dark:bg-white/20'}`} />
          Abierto ahora
        </TogglePill>
        <TogglePill active={verifiedOnly} onClick={toggleVerifiedOnly}>
          <BadgeCheck className="h-3.5 w-3.5" />
          Verificadas
        </TogglePill>
        <TogglePill active={withServices} onClick={toggleWithServices}>
          Con agenda activa
        </TogglePill>
      </div>

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
                  base: 'border border-ink/[0.09] bg-ink/[0.04] text-ink/70 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-slate/40 hover:text-slate/80 dark:text-zinc-500 dark:hover:text-zinc-200',
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
                  base: 'border border-ink/[0.09] bg-ink/[0.04] text-ink/70 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-slate/40 hover:text-slate/80 dark:text-zinc-500 dark:hover:text-zinc-200',
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
                  base: 'border border-focusLight/25 bg-focusLight/[0.07] text-violet-700 dark:border-focusLight/20 dark:bg-focusLight/10 dark:text-violet-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-focusLight/50 hover:text-focusLight/80 dark:text-violet-400/60 dark:hover:text-violet-300',
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
                  base: 'border border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-emerald-400/60 hover:text-emerald-600 dark:text-emerald-400/50 dark:hover:text-emerald-300',
                }}
              >
                Abierto ahora
              </Chip>
            )}

            {verifiedOnly && (
              <Chip
                size="sm"
                onClose={() => setVerifiedOnly(false)}
                startContent={<BadgeCheck className="h-3 w-3 ml-1" />}
                classNames={{
                  base: 'border border-focusLight/25 bg-focusLight/[0.07] text-violet-700 dark:border-focusLight/20 dark:bg-focusLight/10 dark:text-violet-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-focusLight/50 hover:text-focusLight/80 dark:text-violet-400/60 dark:hover:text-violet-300',
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
                  base: 'border border-focusLight/25 bg-focusLight/[0.07] text-violet-700 dark:border-focusLight/20 dark:bg-focusLight/10 dark:text-violet-300',
                  content: 'text-xs font-medium px-1',
                  closeButton: 'text-focusLight/50 hover:text-focusLight/80 dark:text-violet-400/60 dark:hover:text-violet-300',
                }}
              >
                Con agenda activa
              </Chip>
            )}

            <button
              type="button"
              onClick={clearAll}
              className="ml-auto text-[11px] font-medium text-slate/45 transition-colors hover:text-slate/80 dark:text-zinc-500 dark:hover:text-zinc-300"
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
              <p className="text-xs font-medium text-slate/50 dark:text-zinc-500">
                {`${filtered.length} barberia${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`}
              </p>
            ) : (
              <p className="text-xs font-medium text-slate/50 dark:text-zinc-500">
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
          <p className="text-base font-semibold text-ink/80 dark:text-zinc-200">
            Sin resultados
          </p>
          <p className="mt-1 text-sm text-slate/55 dark:text-zinc-500">
            Proba con otro termino o ajusta los filtros
          </p>
          <button
            type="button"
            onClick={clearAll}
            className={[
              'mt-5 rounded-full border px-5 py-2 text-xs font-semibold transition-colors',
              'border-ink/[0.09] text-ink/55 hover:border-ink/[0.15] hover:text-ink/80',
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
