'use client';

import Link from 'next/link';
import { formatCurrency } from '@navaja/shared';
import { Card, CardFooter, CardHeader } from '@heroui/card';
import { ArrowUpRight, BadgeCheck, MessageSquareText, Star } from 'lucide-react';
import { useRef } from 'react';
import { MediaShowcase } from '@/components/public/media-showcase';
import { buildShopHref } from '@/lib/shop-links';
import type { MarketplaceShop } from '@/lib/shops';
import { buildTenantCanonicalHref } from '@/lib/tenant-public-urls';

interface BookShopCardProps {
  shop: MarketplaceShop;
}

function getLocationSummary(city: string | null, region: string | null) {
  return [city, region].filter(Boolean).join(' - ') || 'Uruguay';
}

function formatRating(value: number | null) {
  if (value === null) {
    return 'Nuevo';
  }

  return value.toFixed(1);
}

function getFallbackCoverStyle(name: string) {
  const palettes = [
    ['rgba(139, 92, 246, 0.92)', 'rgba(15, 23, 42, 0.96)'],
    ['rgba(124, 58, 237, 0.88)', 'rgba(30, 41, 59, 0.96)'],
    ['rgba(217, 70, 239, 0.86)', 'rgba(17, 24, 39, 0.96)'],
    ['rgba(168, 85, 247, 0.9)', 'rgba(22, 28, 45, 0.96)'],
  ] as const;
  const paletteIndex = name.length % palettes.length;
  const palette = palettes[paletteIndex] || palettes[0];

  return {
    backgroundImage: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
  };
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(target.closest('a,button,input,select,textarea,[role="button"]'))
    : false;
}

export function BookShopCard({ shop }: BookShopCardProps) {
  const marketplaceProfileHref = buildShopHref(shop.slug);
  const tenantProfileHref = buildTenantCanonicalHref(shop, 'profile');
  const bookingHref = buildShopHref(shop.slug, 'book');
  const pointerStartRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const pointerMovedRef = useRef(false);

  const navigateToProfile = () => {
    window.location.assign(marketplaceProfileHref);
  };

  const handleCardClickCapture = (event: { target: EventTarget | null }) => {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    if (pointerMovedRef.current) {
      pointerMovedRef.current = false;
      pointerStartRef.current = null;
      return;
    }

    pointerStartRef.current = null;
    navigateToProfile();
  };

  const handleCardKeyDown = (event: { key: string; target: EventTarget | null; preventDefault(): void }) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    if (isInteractiveTarget(event.target)) {
      return;
    }

    event.preventDefault();
    navigateToProfile();
  };

  const handlePointerDownCapture = (event: {
    target: EventTarget | null;
    pointerId: number;
    clientX: number;
    clientY: number;
  }) => {
    if (isInteractiveTarget(event.target)) {
      pointerStartRef.current = null;
      pointerMovedRef.current = false;
      return;
    }

    pointerStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    pointerMovedRef.current = false;
  };

  const handlePointerMoveCapture = (event: { pointerId: number; clientX: number; clientY: number }) => {
    const pointerStart = pointerStartRef.current;
    if (!pointerStart || pointerStart.pointerId !== event.pointerId || pointerMovedRef.current) {
      return;
    }

    const deltaX = Math.abs(event.clientX - pointerStart.x);
    const deltaY = Math.abs(event.clientY - pointerStart.y);
    if (deltaX > 8 || deltaY > 8) {
      pointerMovedRef.current = true;
    }
  };

  const handlePointerUpCapture = () => {
    pointerStartRef.current = null;
  };

  const handlePointerCancelCapture = () => {
    pointerStartRef.current = null;
    pointerMovedRef.current = false;
  };

  return (
    <article
      tabIndex={0}
      role="link"
      aria-label={`Ver barberia ${shop.name}`}
      onClickCapture={handleCardClickCapture}
      onKeyDown={handleCardKeyDown}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerUpCapture={handlePointerUpCapture}
      onPointerCancelCapture={handlePointerCancelCapture}
      className="group outline-none"
    >
      <Card
        as="div"
        isFooterBlurred
        className="data-card no-hover-motion h-[22rem] cursor-pointer overflow-hidden rounded-[1.9rem] border-0 p-0 shadow-none"
      >
        <CardHeader className="absolute inset-x-0 top-0 z-10 items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
              {getLocationSummary(shop.city, shop.region)}
            </p>
            <h2 className="mt-2 line-clamp-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-white">
              {shop.name}
            </h2>
          </div>

          <span className="shrink-0 rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-ink shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)] dark:bg-slate-950/90 dark:text-slate-100">
            <Star className="mr-1 inline h-3.5 w-3.5 fill-current text-amber-500" />
            {formatRating(shop.averageRating)}
          </span>
        </CardHeader>

        <MediaShowcase
          alt={`Vista de ${shop.name}`}
          images={shop.imageUrls}
          className="h-full w-full"
          activeImageClassName="transition-transform duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none group-hover:scale-[1.015] group-focus-visible:scale-[1.015]"
          blockParentInteractions={false}
          dotsClassName="bottom-[7.1rem]"
          fallback={
            <div
              className="h-full w-full transition-transform duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none group-hover:scale-[1.015] group-focus-visible:scale-[1.015]"
              style={getFallbackCoverStyle(shop.name)}
            />
          }
        />

        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-slate-950/88 via-slate-950/28 to-slate-950/10" />

        <CardFooter className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-black/40 px-4 py-4 backdrop-blur-md">
          <div className="flex w-full flex-col gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm text-white/82">
                {shop.description || 'Servicios, staff y horarios cargados dentro de su propio workspace.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-white/72">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                <MessageSquareText className="h-3.5 w-3.5" />
                {shop.reviewCount || 0} resenas
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                {shop.activeServiceCount} servicios
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                {shop.minServicePriceCents !== null ? `Desde ${formatCurrency(shop.minServicePriceCents)}` : 'Sin precio'}
              </span>
              {shop.isVerified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/14 px-2.5 py-1 text-emerald-100">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verificada
                </span>
              )}
              {shop.todayAvailability === 'available' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/18 px-2.5 py-1 text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Turnos disponibles
                </span>
              )}
              {shop.todayAvailability === 'few_slots' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/18 px-2.5 py-1 text-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Últimos turnos
                </span>
              )}
              {shop.todayAvailability === 'no_slots' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-white/50">
                  Sin turnos hoy
                </span>
              )}
              {shop.todayAvailability === 'closed' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-white/50">
                  Cerrado hoy
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={tenantProfileHref}
                className="action-secondary rounded-full px-4 py-2 text-sm font-semibold"
                onClick={(event) => event.stopPropagation()}
              >
                Ver perfil
              </Link>
              <Link
                href={bookingHref}
                className="action-primary inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold"
                onClick={(event) => event.stopPropagation()}
              >
                Agendar aqui
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </article>
  );
}
