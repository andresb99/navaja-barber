'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatCurrency } from '@navaja/shared';
import { Button } from '@heroui/button';
import { SelectItem } from '@heroui/select';
import { LoaderCircle, LocateFixed } from 'lucide-react';
import { SurfaceSelect } from '@/components/heroui/surface-select';
import { CourseMediaCard } from '@/components/public/course-media-card';
import { buildShopHref, buildTenantRootHref } from '@/lib/shop-links';
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
  const normalizedCategoryFilter = useMemo(
    () => normalizeFilterValue(categoryFilter),
    [categoryFilter],
  );
  const normalizedLocationFilter = useMemo(
    () => normalizeFilterValue(locationFilter),
    [locationFilter],
  );

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
        locationState && item.shop.latitude !== null && item.shop.longitude !== null
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
            primaryHref={`/courses/${encodeURIComponent(course.id)}`}
            primaryLabel="Ver curso"
            secondaryHref={buildTenantRootHref(shop.slug, 'courses')}
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
          <Button
            type="button"
            onClick={clearFilters}
            variant="light"
            className="meta-chip min-h-0 px-3 py-1 transition hover:bg-white/80 dark:hover:bg-white/[0.08]"
          >
            Limpiar filtros
          </Button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SurfaceSelect
            aria-label="Filtrar por categoria"
            label="Categoria"
            labelPlacement="inside"
            selectedKeys={[categoryFilter]}
            onChange={(event) => setCategoryFilter(event.target.value)}
            disallowEmptySelection
          >
            {['all', ...categoryOptions].map((category) => (
              <SelectItem key={category}>{category === 'all' ? 'Todas' : category}</SelectItem>
            ))}
          </SurfaceSelect>

          <SurfaceSelect
            aria-label="Filtrar por ubicacion"
            label="Ubicacion"
            labelPlacement="inside"
            selectedKeys={[locationFilter]}
            onChange={(event) => setLocationFilter(event.target.value)}
            disallowEmptySelection
          >
            {['all', ...locationOptions].map((location) => (
              <SelectItem key={location}>{location === 'all' ? 'Todas' : location}</SelectItem>
            ))}
          </SurfaceSelect>

          <SurfaceSelect
            aria-label="Filtrar por calificacion"
            label="Calificacion minima"
            labelPlacement="inside"
            selectedKeys={[ratingFilter]}
            onChange={(event) => setRatingFilter(event.target.value)}
            disallowEmptySelection
          >
            <SelectItem key="all">Todas</SelectItem>
            <SelectItem key="4.5">4.5 o mas</SelectItem>
            <SelectItem key="4.0">4.0 o mas</SelectItem>
            <SelectItem key="3.5">3.5 o mas</SelectItem>
          </SurfaceSelect>

          <SurfaceSelect
            aria-label="Filtrar por proximidad"
            label="Proximidad"
            labelPlacement="inside"
            selectedKeys={[distanceFilter]}
            onChange={(event) => setDistanceFilter(event.target.value)}
            disallowEmptySelection
            isDisabled={!locationState}
          >
            <SelectItem key="all">Sin limite</SelectItem>
            <SelectItem key="5">Hasta 5 km</SelectItem>
            <SelectItem key="12">Hasta 12 km</SelectItem>
            <SelectItem key="25">Hasta 25 km</SelectItem>
          </SurfaceSelect>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => void enableLocationFilter()}
            className="action-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold"
            isDisabled={isLocating}
          >
            {isLocating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            Usar mi ubicacion
          </Button>
          {locationStatus ? (
            <p className="text-xs font-medium text-slate/75 dark:text-slate-400">
              {locationStatus}
            </p>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{renderedCourseCards}</div>
    </>
  );
}
