'use client';

import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { BadgeCheck, Search, Star, X } from 'lucide-react';
import { BookShopCard } from '@/components/public/book-shop-card';
import type { MarketplaceShop } from '@/lib/shops';

interface BookPageContentProps {
  shops: MarketplaceShop[];
}

type RatingFilter = 'all' | '3' | '4';
type PriceFilter = 'all' | 'low' | 'mid';

const RATING_OPTIONS: { value: RatingFilter; label: string }[] = [
  { value: '4', label: '4+ estrellas' },
  { value: '3', label: '3+ estrellas' },
];

const PRICE_OPTIONS: { value: PriceFilter; label: string }[] = [
  { value: 'low', label: 'Hasta $500' },
  { value: 'mid', label: 'Hasta $1.500' },
];

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function BookPageContent({ shops }: BookPageContentProps) {
  const [query, setQuery] = useState('');
  const [rating, setRating] = useState<RatingFilter>('all');
  const [price, setPrice] = useState<PriceFilter>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withServices, setWithServices] = useState(false);

  const deferredQuery = useDeferredValue(query);

  const clearAll = useCallback(() => {
    setQuery('');
    setRating('all');
    setPrice('all');
    setVerifiedOnly(false);
    setWithServices(false);
  }, []);

  const hasActiveFilters =
    deferredQuery.trim() || rating !== 'all' || price !== 'all' || verifiedOnly || withServices;

  const filtered = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    return shops.filter((shop) => {
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

      if (price === 'low') {
        if (shop.minServicePriceCents === null || shop.minServicePriceCents > 50000) return false;
      } else if (price === 'mid') {
        if (shop.minServicePriceCents === null || shop.minServicePriceCents > 150000) return false;
      }

      if (verifiedOnly && !shop.isVerified) return false;
      if (withServices && shop.activeServiceCount === 0) return false;

      return true;
    });
  }, [shops, deferredQuery, rating, price, verifiedOnly, withServices]);

  return (
    <div className="space-y-5">
      {/* ── Search + filters ───────────────────── */}
      <div className="space-y-3">
        {/* Search input — reuses places-search CSS classes */}
        <div className="places-search-shell">
          <div className="places-search-input-shell">
            <Search className="places-search-icon h-4 w-4" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca por nombre o zona (ej. Pocitos, The Barber)"
              className="min-w-0 text-[16px] font-medium outline-none placeholder:text-slate/55 md:text-sm dark:placeholder:text-slate-400"
              style={{ paddingRight: query ? '2.75rem' : undefined }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate/40 transition-colors hover:bg-black/5 hover:text-slate/70 dark:hover:bg-white/8 dark:hover:text-zinc-300"
                aria-label="Limpiar busqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Rating */}
          {RATING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRating(rating === opt.value ? 'all' : opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                rating === opt.value
                  ? 'border-amber-400/50 bg-amber-400/15 text-amber-300 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300'
                  : 'border-black/8 bg-black/4 text-slate/60 hover:border-black/14 hover:text-slate/80 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-200'
              }`}
            >
              <Star className={`h-3 w-3 ${rating === opt.value ? 'fill-current' : ''}`} />
              {opt.label}
            </button>
          ))}

          {/* Price */}
          {PRICE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPrice(price === opt.value ? 'all' : opt.value)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                price === opt.value
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'border-black/8 bg-black/4 text-slate/60 hover:border-black/14 hover:text-slate/80 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          ))}

          {/* Verified */}
          <button
            type="button"
            onClick={() => setVerifiedOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              verifiedOnly
                ? 'border-violet-500/50 bg-violet-500/15 text-violet-600 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300'
                : 'border-black/8 bg-black/4 text-slate/60 hover:border-black/14 hover:text-slate/80 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-200'
            }`}
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            Verificadas
          </button>

          {/* With services */}
          <button
            type="button"
            onClick={() => setWithServices((v) => !v)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              withServices
                ? 'border-violet-500/50 bg-violet-500/15 text-violet-600 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300'
                : 'border-black/8 bg-black/4 text-slate/60 hover:border-black/14 hover:text-slate/80 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-200'
            }`}
          >
            Con agenda activa
          </button>

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto inline-flex items-center gap-1 text-xs text-slate/50 transition-colors hover:text-slate/70 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              <X className="h-3 w-3" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Results count ──────────────────────── */}
      {hasActiveFilters && (
        <p className="text-xs text-slate/50 dark:text-zinc-500">
          {filtered.length === 0
            ? 'Ninguna barberia coincide'
            : `${filtered.length} barberia${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* ── Grid ───────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((shop) => (
            <BookShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : hasActiveFilters ? (
        <div className="soft-panel rounded-[1.8rem] p-12 text-center">
          <p className="text-base font-semibold text-ink dark:text-slate-200">Sin resultados</p>
          <p className="mt-1 text-sm text-slate/60 dark:text-zinc-500">
            Proba con otro termino o ajusta los filtros
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-4 rounded-full border border-black/10 px-5 py-2 text-xs font-semibold text-slate/60 transition-colors hover:border-black/18 hover:text-slate/80 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-200"
          >
            Limpiar filtros
          </button>
        </div>
      ) : null}
    </div>
  );
}
