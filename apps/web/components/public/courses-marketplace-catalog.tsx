'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatCurrency } from '@navaja/shared';
import { LoaderCircle, LocateFixed } from 'lucide-react';
import { CourseMediaCard } from '@/components/public/course-media-card';
import { buildShopHref } from '@/lib/shop-links';
import type { MarketplaceShop } from '@/lib/shops';

interface MarketplaceCourseCatalogItem {
  course: {
    id: string;
    title: string;
    description: string;
    price_cents: number;
    duration_hours: number;
    level: string;
    image_url: string | null;
  };
  shop: MarketplaceShop;
}

interface CoursesMarketplaceCatalogProps {
  items: MarketplaceCourseCatalogItem[];
}

function normalizeFilterValue(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getLocationLabel(city: string | null, region: string | null) {
  return [city, region].filter(Boolean).join(' - ') || 'Uruguay';
}

function formatRating(value: number | null) {
  if (value === null) {
    return 'Nueva';
  }

  return value.toFixed(1);
}

function getDistanceKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const latitudeA = toRadians(fromLatitude);
  const latitudeB = toRadians(toLatitude);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function CoursesMarketplaceCatalog({ items }: CoursesMarketplaceCatalogProps) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [distanceFilter, setDistanceFilter] = useState('all');
  const [locationState, setLocationState] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const normalizedCategoryFilter = useMemo(() => normalizeFilterValue(categoryFilter), [categoryFilter]);
  const normalizedLocationFilter = useMemo(() => normalizeFilterValue(locationFilter), [locationFilter]);

  const preparedItems = useMemo(() => {
    return items.map((item) => {
      const locationLabel = getLocationLabel(item.shop.city, item.shop.region);
      return {
        ...item,
        normalizedLevel: normalizeFilterValue(item.course.level),
        normalizedLocationLabel: normalizeFilterValue(locationLabel),
        locationLabel,
        rating: item.shop.averageRating || 0,
      };
    });
  }, [items]);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(preparedItems.map((item) => item.course.level))).sort((a, b) =>
      a.localeCompare(b, 'es'),
    );
  }, [preparedItems]);

  const locationOptions = useMemo(() => {
    return Array.from(new Set(preparedItems.map((item) => item.locationLabel))).sort((a, b) =>
      a.localeCompare(b, 'es'),
    );
  }, [preparedItems]);

  const itemsWithDistance = useMemo(() => {
    return preparedItems.map((item) => {
      const distanceKm =
        locationState &&
        item.shop.latitude !== null &&
        item.shop.longitude !== null
          ? getDistanceKm(
              locationState.latitude,
              locationState.longitude,
              Number(item.shop.latitude),
              Number(item.shop.longitude),
            )
          : null;

      return {
        ...item,
        distanceKm,
      };
    });
  }, [locationState, preparedItems]);

  const filteredItems = useMemo(() => {
    const minimumRating = ratingFilter === 'all' ? 0 : Number(ratingFilter);
    const maximumDistanceKm = distanceFilter === 'all' ? null : Number(distanceFilter);

    return itemsWithDistance.filter((item) => {
      if (categoryFilter !== 'all') {
        if (item.normalizedLevel !== normalizedCategoryFilter) {
          return false;
        }
      }

      if (locationFilter !== 'all') {
        if (item.normalizedLocationLabel !== normalizedLocationFilter) {
          return false;
        }
      }

      if (minimumRating > 0) {
        if (item.rating < minimumRating) {
          return false;
        }
      }

      if (maximumDistanceKm !== null) {
        if (item.distanceKm === null || item.distanceKm > maximumDistanceKm) {
          return false;
        }
      }

      return true;
    });
  }, [
    categoryFilter,
    distanceFilter,
    itemsWithDistance,
    locationFilter,
    normalizedCategoryFilter,
    normalizedLocationFilter,
    ratingFilter,
  ]);

  const renderedCourseCards = useMemo(
    () =>
      filteredItems.map(({ course, shop, distanceKm }) => {
        const ratingLabel =
          shop.averageRating !== null
            ? `${formatRating(shop.averageRating)} (${shop.reviewCount})`
            : 'Nueva';
        const priceLabel = formatCurrency(course.price_cents);
        const monthlyInstallment = Math.max(1, Math.round(Number(course.price_cents || 0) / 12));
        const metaRows = [
          { label: 'Nivel', value: course.level },
          { label: 'Duracion', value: `${course.duration_hours}h` },
          { label: 'Barberia', value: shop.name },
          {
            label: 'Ubicacion',
            value:
              distanceKm !== null
                ? `${distanceKm.toFixed(1)} km`
                : getLocationLabel(shop.city, shop.region),
          },
        ];

        return (
          <CourseMediaCard
            key={course.id}
            title={course.title}
            description={course.description}
            topLabel="Curso"
            imageUrls={[course.image_url, ...shop.imageUrls]}
            chips={[course.level, `${course.duration_hours}h`, priceLabel, `Rating ${ratingLabel}`]}
            avatarUrl={shop.logoUrl}
            avatarName={shop.name}
            metaRows={metaRows}
            priceLabel={priceLabel}
            subPriceLabel={`Hasta 12 cuotas sin interes de ${formatCurrency(monthlyInstallment)}`}
            primaryHref={`${buildShopHref(shop.slug, 'courses')}/${encodeURIComponent(course.id)}`}
            primaryLabel="Ver curso"
            secondaryHref={buildShopHref(shop.slug, 'courses')}
            secondaryLabel="Ver academia"
          />
        );
      }),
    [filteredItems],
  );

  const clearFilters = useCallback(() => {
    setCategoryFilter('all');
    setLocationFilter('all');
    setRatingFilter('all');
    setDistanceFilter('all');
  }, []);

  const enableLocationFilter = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationStatus('Tu navegador no soporta geolocalizacion.');
      return;
    }

    setIsLocating(true);
    setLocationStatus(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus('Ubicacion activada para filtrar por cercania.');
        setIsLocating(false);
      },
      () => {
        setLocationState(null);
        setDistanceFilter('all');
        setLocationStatus('No pudimos acceder a tu ubicacion.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  }, []);

  return (
    <>
      <div className="soft-panel rounded-[1.8rem] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="hero-eyebrow">Filtros</p>
          <button
            type="button"
            onClick={clearFilters}
            className="meta-chip transition hover:bg-white/80 dark:hover:bg-white/[0.08]"
          >
            Limpiar filtros
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Categoria
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-medium text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
            >
              <option value="all">Todas</option>
              {categoryOptions.map((category) => (
                <option key={`course-category-${category}`} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Ubicacion
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-medium text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
            >
              <option value="all">Todas</option>
              {locationOptions.map((location) => (
                <option key={`course-location-${location}`} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Calificacion minima
            <select
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value)}
              className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-medium text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
            >
              <option value="all">Todas</option>
              <option value="4.5">4.5 o mas</option>
              <option value="4.0">4.0 o mas</option>
              <option value="3.5">3.5 o mas</option>
            </select>
          </label>

          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Proximidad
            <select
              value={distanceFilter}
              onChange={(event) => setDistanceFilter(event.target.value)}
              className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-medium text-ink disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
              disabled={!locationState}
            >
              <option value="all">Sin limite</option>
              <option value="5">Hasta 5 km</option>
              <option value="12">Hasta 12 km</option>
              <option value="25">Hasta 25 km</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void enableLocationFilter()}
            className="action-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold"
            disabled={isLocating}
          >
            {isLocating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            Usar mi ubicacion
          </button>
          {locationStatus ? (
            <p className="text-xs font-medium text-slate/75 dark:text-slate-400">{locationStatus}</p>
          ) : null}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="soft-panel rounded-[1.8rem] p-6">
          <p className="text-sm text-slate/80 dark:text-slate-300">
            No encontramos cursos para esos filtros. Prueba con otra combinacion.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {renderedCourseCards}
      </div>
    </>
  );
}
