'use client';

import Link from 'next/link';
import {
  memo,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Button, Card, CardBody, CardFooter, CardHeader, ScrollShadow, Skeleton } from '@heroui/react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpRight,
  BadgeCheck,
  LoaderCircle,
  MapPinned,
  MessageSquareText,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { formatCurrency } from '@navaja/shared';
import type { MarketplaceSearchMode, MarketplaceShop } from '@/lib/shops';
import { cn } from '@/lib/cn';
import { buildShopHref, buildTenantRootHref } from '@/lib/shop-links';
import { MediaShowcase } from '@/components/public/media-showcase';
import {
  type GoogleAutocompleteService,
  type GoogleGeocoder,
  type GoogleGeocoderResult,
  type GoogleMap,
  type GoogleMapsApi,
  type GoogleMapsLibrary,
  type GoogleMarker,
  URUGUAY_BOUNDS,
  URUGUAY_ZOOM,
  getGoogleMapThemeOptions,
  loadGoogleMapsPlacesApi,
} from '@/lib/google-maps';

interface ShopsMapMarketplaceProps {
  initialShops?: MarketplaceShop[];
}

const markerBadgeIconCache = new Map<string, string>();

function formatRating(value: number | null) {
  if (value === null) {
    return 'Nuevo';
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

function getLocationSummary(shop: MarketplaceShop) {
  return (
    [shop.locationLabel, shop.city, shop.region].filter(Boolean).join(' - ') ||
    'Ubicacion por confirmar'
  );
}

function getInitialSelectedShop(shops: MarketplaceShop[]) {
  return (
    shops.find((shop) => shop.latitude !== null && shop.longitude !== null)?.id ||
    shops[0]?.id ||
    null
  );
}

type MarkerBadgeVariant = 'nuevo' | 'top' | 'good' | 'default';

const MARKER_MAX_NAME_LENGTH = 14;

function getMarkerVariant(shop: MarketplaceShop): MarkerBadgeVariant {
  if (shop.averageRating === null) {
    return 'nuevo';
  }
  if (shop.averageRating >= 4.5) {
    return 'top';
  }
  if (shop.averageRating >= 3.5) {
    return 'good';
  }
  return 'default';
}

function getMarkerLabel(shop: MarketplaceShop) {
  const name = shop.name || 'Sin nombre';
  return name.length > MARKER_MAX_NAME_LENGTH
    ? `${name.slice(0, MARKER_MAX_NAME_LENGTH - 1).trimEnd()}…`
    : name;
}

function getMarkerDotColor(variant: MarkerBadgeVariant, isActive: boolean, isDarkTheme: boolean) {
  if (isActive) {
    return variant === 'nuevo' ? '#7c3aed' : variant === 'top' ? '#d97706' : '#6366f1';
  }
  if (variant === 'nuevo') {
    return isDarkTheme ? '#a78bfa' : '#8b5cf6';
  }
  if (variant === 'top') {
    return isDarkTheme ? '#fbbf24' : '#d97706';
  }
  if (variant === 'good') {
    return isDarkTheme ? '#34d399' : '#059669';
  }
  return isDarkTheme ? '#64748b' : '#94a3b8';
}

function createMarkerBadgeSvg(
  label: string,
  variant: MarkerBadgeVariant,
  isActive: boolean,
  isDarkTheme: boolean,
) {
  const cacheKey = [label, variant, isActive, isDarkTheme].join('|');
  const cachedIcon = markerBadgeIconCache.get(cacheKey);
  if (cachedIcon) {
    return cachedIcon;
  }

  const dotSize = 6;
  const dotGap = 6;
  const charWidth = 6.8;
  const paddingH = 12;
  const textWidth = Math.ceil(label.length * charWidth);
  const contentWidth = dotSize + dotGap + textWidth;
  const width = Math.max(54, Math.ceil(contentWidth + paddingH * 2));
  const badgeHeight = 28;
  const pointerHeight = 7;
  const shadowPad = 4;
  const totalHeight = badgeHeight + pointerHeight + shadowPad;
  const centerX = width / 2;
  const contentStartX = Math.round((width - contentWidth) / 2);

  let fillColor: string;
  let borderColor: string;
  let textColor: string;
  let shadowOpacity: number;
  const dotColor = getMarkerDotColor(variant, isActive, isDarkTheme);

  if (isActive) {
    fillColor = '#ffffff';
    borderColor = 'rgba(139,92,246,0.45)';
    textColor = '#1e1b4b';
    shadowOpacity = 0.3;
  } else if (isDarkTheme) {
    fillColor = 'rgba(10,4,22,0.92)';
    borderColor = 'rgba(139,92,246,0.2)';
    textColor = '#e2e8f0';
    shadowOpacity = 0.5;
  } else {
    fillColor = 'rgba(255,255,255,0.96)';
    borderColor = 'rgba(15,23,42,0.12)';
    textColor = '#1e293b';
    shadowOpacity = 0.15;
  }

  const dotY = badgeHeight / 2;
  const textY = badgeHeight / 2 + 4;
  const sp = shadowPad / 2;

  const iconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="s" x="0" y="0" width="${width}" height="${totalHeight}" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="${shadowOpacity}"/>
        </filter>
      </defs>
      <g filter="url(#s)">
        <rect x="${sp}" y="${sp}" width="${width - shadowPad}" height="${badgeHeight}" rx="14" fill="${fillColor}" stroke="${borderColor}" stroke-width="1"/>
        <path d="M${centerX - 4} ${badgeHeight + sp - 1}L${centerX} ${badgeHeight + pointerHeight + sp - 2}L${centerX + 4} ${badgeHeight + sp - 1}" fill="${fillColor}" stroke="${borderColor}" stroke-width="1" stroke-linejoin="round"/>
        <rect x="${centerX - 4}" y="${badgeHeight + sp - 3}" width="8" height="4" fill="${fillColor}"/>
      </g>
      <circle cx="${contentStartX + sp + dotSize / 2}" cy="${dotY + sp}" r="${dotSize / 2}" fill="${dotColor}"/>
      <text x="${contentStartX + dotSize + dotGap + sp}" y="${textY + sp}" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="11.5" font-weight="600" fill="${textColor}">${label}</text>
    </svg>`,
  )}`;

  markerBadgeIconCache.set(cacheKey, iconUrl);
  return iconUrl;
}

function getShopMarkerIcon(
  google: GoogleMapsLibrary,
  shop: MarketplaceShop,
  isActive: boolean,
  isDarkTheme: boolean,
) {
  const label = getMarkerLabel(shop);
  const variant = getMarkerVariant(shop);
  const charWidth = 6.8;
  const textWidth = Math.ceil(label.length * charWidth);
  const contentWidth = 6 + 6 + textWidth;
  const width = Math.max(54, Math.ceil(contentWidth + 24));
  const height = 39;

  return {
    url: createMarkerBadgeSvg(label, variant, isActive, isDarkTheme),
    scaledSize: new google.Size(width, height),
    anchor: new google.Point(Math.round(width / 2), 37),
  };
}

function getUserMarkerIcon(google: GoogleMapsLibrary) {
  return {
    path: google.SymbolPath.CIRCLE,
    scale: 7,
    fillColor: '#c4b5fd',
    fillOpacity: 1,
    strokeColor: '#e0f2fe',
    strokeOpacity: 1,
    strokeWeight: 2,
  };
}

function getShopHighlight(shop: MarketplaceShop, distanceKm: number | null) {
  if (distanceKm !== null && distanceKm <= 2.5) {
    return 'Muy cerca de ti';
  }

  if ((shop.averageRating || 0) >= 4.7 && shop.reviewCount >= 12) {
    return 'Favorita entre clientes';
  }

  if ((shop.averageRating || 0) >= 4.5 && shop.reviewCount >= 6) {
    return 'Muy recomendada';
  }

  if (shop.isVerified) {
    return 'Verificada para reservar';
  }

  return 'Nueva en el marketplace';
}

function getShopReviewSummary(shop: MarketplaceShop) {
  if (shop.reviewCount === 0) {
    return 'Perfil nuevo dentro del marketplace. Ideal para descubrir una propuesta reciente antes que el resto.';
  }

  if ((shop.averageRating || 0) >= 4.8) {
    return `Clientes destacan constancia y experiencia. ${shop.reviewCount} resenas verificadas disponibles.`;
  }

  if ((shop.averageRating || 0) >= 4.5) {
    return `Muy bien valorada por clientes frecuentes. ${shop.reviewCount} resenas verificadas para comparar con confianza.`;
  }

  return `${shop.reviewCount} resenas verificadas publicadas en su perfil.`;
}

function getFallbackCoverStyle(shop: MarketplaceShop) {
  const palettes = [
    ['rgba(139, 92, 246, 0.92)', 'rgba(15, 23, 42, 0.96)'],
    ['rgba(124, 58, 237, 0.88)', 'rgba(30, 41, 59, 0.96)'],
    ['rgba(217, 70, 239, 0.86)', 'rgba(17, 24, 39, 0.96)'],
    ['rgba(168, 85, 247, 0.9)', 'rgba(22, 28, 45, 0.96)'],
  ] as const;
  const paletteIndex = shop.name.length % palettes.length;
  const palette = palettes[paletteIndex] || palettes[0];

  return {
    backgroundImage: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
  };
}

interface SearchResponsePayload {
  items: MarketplaceShop[];
  mode: MarketplaceSearchMode;
}

interface ViewportResponsePayload {
  items: MarketplaceShop[];
}

interface GoogleMapsEventListenerLike {
  remove(): void;
}

type SearchSuggestion =
  | {
      key: string;
      type: 'shop';
      label: string;
      description: string;
      shop: MarketplaceShop;
    }
  | {
      key: string;
      type: 'area';
      label: string;
      description: string;
      placeId: string;
    };

function normalizeSearchTerm(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getViewportFetchLimit(zoom: number) {
  if (zoom >= 15) {
    return 48;
  }

  if (zoom >= 13) {
    return 36;
  }

  if (zoom >= 11) {
    return 24;
  }

  return 16;
}

function isLikelyShopQuery(query: string, suggestion: SearchSuggestion | null) {
  if (!suggestion || suggestion.type !== 'shop') {
    return false;
  }

  const normalizedQuery = normalizeSearchTerm(query);
  const normalizedName = normalizeSearchTerm(suggestion.shop.name);
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  if (!normalizedQuery) {
    return false;
  }

  if (queryWords.length <= 1) {
    return normalizedQuery === normalizedName;
  }

  return normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName);
}

const PRECISE_GEOCODER_TYPES = new Set([
  'street_address',
  'premise',
  'subpremise',
  'intersection',
  'establishment',
  'point_of_interest',
]);

const AREA_GEOCODER_TYPES = new Set([
  'locality',
  'neighborhood',
  'sublocality',
  'sublocality_level_1',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'postal_code',
  'country',
]);

function getGeocoderResultZoom(query: string, result: GoogleGeocoderResult) {
  const defaultAreaZoom = 13;
  const preciseAddressZoom = 16;
  const rawResult = result as GoogleGeocoderResult & { types?: string[] };
  const resultTypes = Array.isArray(rawResult.types)
    ? rawResult.types.map((type) => String(type || '').toLowerCase())
    : [];
  const componentTypes = (result.address_components || [])
    .flatMap((item) => item.types || [])
    .map((type) => String(type || '').toLowerCase());

  const hasStreetNumber = componentTypes.includes('street_number');
  const hasRoute = componentTypes.includes('route');
  const looksLikeSpecificAddress = /\d/.test(query) || /[&/]/.test(query);
  const hasPreciseType = resultTypes.some((type) => PRECISE_GEOCODER_TYPES.has(type));
  const hasAreaType = resultTypes.some((type) => AREA_GEOCODER_TYPES.has(type));

  if (hasStreetNumber || hasPreciseType || (hasRoute && looksLikeSpecificAddress)) {
    return preciseAddressZoom;
  }

  if (hasAreaType) {
    return defaultAreaZoom;
  }

  return looksLikeSpecificAddress ? preciseAddressZoom : defaultAreaZoom;
}

const MARKETPLACE_CARD_SKELETON_COUNT = 6;
const DEFAULT_MARKETPLACE_CENTER = {
  lat: -34.9011,
  lng: -56.1645,
} as const;
const DEFAULT_MARKETPLACE_ZOOM = 11;
const MOBILE_MARKETPLACE_FALLBACK_TOP_OFFSET_PX = 76;
type MobileSheetStage = 'collapsed' | 'mid' | 'expanded';
const MOBILE_SHEET_COLLAPSED_PEEK_PX = 68;
const MOBILE_SHEET_STAGE_TRANSLATE: Record<MobileSheetStage, number> = {
  mid: 42,
  expanded: 0,
  collapsed: 88,
};

function getMobileSheetStageTranslate(stage: MobileSheetStage, sheetHeight?: number | null) {
  if (stage !== 'collapsed') {
    return MOBILE_SHEET_STAGE_TRANSLATE[stage];
  }

  if (!sheetHeight || sheetHeight <= 0) {
    return MOBILE_SHEET_STAGE_TRANSLATE.collapsed;
  }

  const collapsedTranslate = 100 - (MOBILE_SHEET_COLLAPSED_PEEK_PX / sheetHeight) * 100;
  return Math.min(Math.max(collapsedTranslate, 0), 100);
}

function areShopCollectionsEqualById(left: MarketplaceShop[], right: MarketplaceShop[]) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index]?.id !== right[index]?.id) {
      return false;
    }
  }

  return true;
}

interface MarketplaceShopCardProps {
  shop: MarketplaceShop;
  distanceKm: number | null;
  isActive: boolean;
  onFocus: (shop: MarketplaceShop) => void;
}

interface MarketplaceShopDistanceEntry {
  shop: MarketplaceShop;
  distanceKm: number | null;
}

const MarketplaceShopCard = memo(
  function MarketplaceShopCard({ shop, distanceKm, isActive, onFocus }: MarketplaceShopCardProps) {
    return (
      <Card
        as="article"
        isFooterBlurred
        className={cn(
          'data-card no-hover-motion h-[22rem] cursor-pointer overflow-hidden rounded-[1.9rem] border-0 p-0 shadow-none',
          isActive ? 'ring-2 ring-violet-400/35 dark:ring-violet-300/25' : 'ring-1 ring-transparent',
        )}
        data-active={String(isActive)}
        onClick={() => onFocus(shop)}
      >
        <CardHeader className="absolute inset-x-0 top-0 z-10 items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
              {getShopHighlight(shop, distanceKm)}
            </p>
            <h3 className="mt-2 line-clamp-2 font-[family-name:var(--font-heading)] text-xl font-semibold text-white">
              {shop.name}
            </h3>
          </div>
          <div className="shrink-0 rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-ink shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)] dark:bg-slate-950/90 dark:text-slate-100">
            <Star className="mr-1 inline h-3.5 w-3.5 fill-current text-amber-500" />
            {formatRating(shop.averageRating)}
          </div>
        </CardHeader>

        <MediaShowcase
          alt={`Vista de ${shop.name}`}
          images={shop.imageUrls}
          className="h-full w-full"
          dotsClassName="bottom-[7.1rem]"
          fallback={<div className="h-full w-full" style={getFallbackCoverStyle(shop)} />}
        />

        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-slate-950/60 via-transparent to-transparent" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-slate-950/88 via-slate-950/28 to-transparent" />

        <CardFooter className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-black/40 px-4 py-4 backdrop-blur-md">
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-semibold text-white">
                  {shop.locationLabel || shop.city || 'Ubicacion por confirmar'}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-white/68">
                  {shop.description || 'Agenda online, perfil publico y reservas en pocos pasos.'}
                </p>
              </div>

              {distanceKm !== null ? (
                <span className="shrink-0 rounded-full bg-white/14 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {distanceKm.toFixed(1)} km
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-white/72">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                <MessageSquareText className="h-3.5 w-3.5" />
                {shop.reviewCount || 0} resenas
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                {shop.activeServiceCount} servicios
              </span>
              {shop.minServicePriceCents !== null ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                  Desde {formatCurrency(shop.minServicePriceCents)}
                </span>
              ) : null}
              {shop.isVerified ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/14 px-2.5 py-1 text-emerald-100">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verificada
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={buildTenantRootHref(shop.slug)}
                className="action-secondary rounded-full px-4 py-2 text-sm font-semibold"
                onClick={(event) => event.stopPropagation()}
              >
                Ver perfil
              </a>
              <Link
                href={buildShopHref(shop.slug, 'book')}
                className="action-primary inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold"
                onClick={(event) => event.stopPropagation()}
              >
                Reservar
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.shop === nextProps.shop &&
      prevProps.distanceKm === nextProps.distanceKm &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.onFocus === nextProps.onFocus
    );
  },
);

interface MarketplaceCardsSectionProps {
  showCardSkeletons: boolean;
  filteredShops: MarketplaceShopDistanceEntry[];
  selectedShopId: string | null;
  activeSearchMode: MarketplaceSearchMode;
  onFocus: (shop: MarketplaceShop) => void;
}

const MarketplaceCardsSection = memo(
  function MarketplaceCardsSection({
    showCardSkeletons,
    filteredShops,
    selectedShopId,
    activeSearchMode,
    onFocus,
  }: MarketplaceCardsSectionProps) {
    if (showCardSkeletons) {
      return (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: MARKETPLACE_CARD_SKELETON_COUNT }).map((_, index) => (
            <Skeleton key={`shop-skeleton-${index}`} className="h-[22rem] w-full rounded-[1.9rem]" />
          ))}
        </div>
      );
    }

    if (filteredShops.length > 0) {
      return (
        <AnimatePresence mode="wait">
          <motion.div
            key="shop-cards"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
          >
            {filteredShops.map(({ shop, distanceKm }) => {
              const isActive = shop.id === selectedShopId;

              return (
                <MarketplaceShopCard
                  key={shop.id}
                  shop={shop}
                  distanceKm={distanceKm}
                  isActive={isActive}
                  onFocus={onFocus}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>
      );
    }

    return (
      <Card className="soft-panel rounded-[1.8rem] border-0 shadow-none">
        <CardBody className="p-5">
          <p className="text-sm text-slate/80 dark:text-slate-300">
            {activeSearchMode === 'all'
              ? 'Aun no hay barberias visibles en esta vista.'
              : 'No encontramos barberias para esa busqueda. Prueba con otra zona o limpia la busqueda.'}
          </p>
        </CardBody>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.showCardSkeletons === nextProps.showCardSkeletons &&
      prevProps.filteredShops === nextProps.filteredShops &&
      prevProps.selectedShopId === nextProps.selectedShopId &&
      prevProps.activeSearchMode === nextProps.activeSearchMode &&
      prevProps.onFocus === nextProps.onFocus
    );
  },
);

export function ShopsMapMarketplace({ initialShops = [] }: ShopsMapMarketplaceProps) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mobileSheetRef = useRef<HTMLDivElement | null>(null);
  const mobileStageRef = useRef<HTMLDivElement | null>(null);
  const googleMapsRef = useRef<GoogleMapsApi | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const autocompleteServiceRef = useRef<GoogleAutocompleteService | null>(null);
  const geocoderRef = useRef<GoogleGeocoder | null>(null);
  const markersRef = useRef<Map<string, GoogleMarker>>(new Map());
  const markerStateRef = useRef<
    Map<
      string,
      {
        latitude: number;
        longitude: number;
        title: string;
        label: string;
        isActive: boolean;
        isDarkTheme: boolean;
      }
    >
  >(new Map());
  const markerListenersRef = useRef<Map<string, GoogleMapsEventListenerLike>>(new Map());
  const userMarkerRef = useRef<GoogleMarker | null>(null);
  const initialMapFrameDoneRef = useRef(false);
  const suggestionsRequestIdRef = useRef(0);
  const areaFocusRequestIdRef = useRef(0);
  const viewportLoadRequestIdRef = useRef(0);
  const viewportIdleTimeoutRef = useRef<number | null>(null);
  const viewportCacheRef = useRef<Map<string, MarketplaceShop[]>>(new Map());
  const viewportInFlightRef = useRef<Map<string, Promise<ViewportResponsePayload>>>(new Map());
  const skipNextAreaViewportSyncRef = useRef(false);
  const activeSearchModeRef = useRef<MarketplaceSearchMode>('all');
  const isMobileViewportRef = useRef(false);
  const mappableShopsByIdRef = useRef<Map<string, MarketplaceShop>>(new Map());

  const [selectedShopId, setSelectedShopId] = useState<string | null>(() =>
    getInitialSelectedShop(initialShops),
  );
  const [mapPreviewShopId, setMapPreviewShopId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewportShops, setViewportShops] = useState<MarketplaceShop[]>(initialShops);
  const [searchResults, setSearchResults] = useState<MarketplaceShop[] | null>(null);
  const [activeSearchMode, setActiveSearchMode] = useState<MarketplaceSearchMode>('all');
  const [activeSearchLabel, setActiveSearchLabel] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isApplyingSearch, setIsApplyingSearch] = useState(false);
  const [userLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapError, setMapError] = useState<string | null>(
    googleMapsApiKey ? null : 'Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para mostrar el mapa.',
  );
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasMapSettled, setHasMapSettled] = useState(false);
  const [isViewportLoading, setIsViewportLoading] = useState(initialShops.length === 0);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean | null>(null);
  const [mobileViewportHeight, setMobileViewportHeight] = useState<number | null>(null);
  const [mobileSheetStage, setMobileSheetStage] = useState<MobileSheetStage>('collapsed');
  const [mobileSheetTransitionReady, setMobileSheetTransitionReady] = useState(false);
  const mobileSheetDragOffsetRef = useRef(0);
  const isMobileSheetDraggingRef = useRef(false);
  const activeDragCleanupRef = useRef<(() => void) | null>(null);
  const [mobileSheetDragSnapshot, setMobileSheetDragSnapshot] = useState<{ dragging: boolean; offset: number }>({ dragging: false, offset: 0 });
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const displayedShops = activeSearchMode === 'name' ? (searchResults ?? []) : viewportShops;

  const filteredShops = useMemo<MarketplaceShopDistanceEntry[]>(() => {
    const withDistance = displayedShops.map((shop) => {
      const distanceKm =
        userLocation && shop.latitude !== null && shop.longitude !== null
          ? getDistanceKm(
              userLocation.latitude,
              userLocation.longitude,
              shop.latitude,
              shop.longitude,
            )
          : null;

      return {
        shop,
        distanceKm,
      };
    });

    return withDistance.sort((left, right) => {
      if (left.distanceKm !== null && right.distanceKm !== null) {
        return left.distanceKm - right.distanceKm;
      }

      if (left.distanceKm !== null) {
        return -1;
      }

      if (right.distanceKm !== null) {
        return 1;
      }

      const leftScore = (left.shop.averageRating || 0) * 100 + left.shop.reviewCount;
      const rightScore = (right.shop.averageRating || 0) * 100 + right.shop.reviewCount;
      return rightScore - leftScore;
    });
  }, [displayedShops, userLocation]);

  const selectedShopEntry = useMemo(
    () =>
      filteredShops.find((entry) => entry.shop.id === selectedShopId) || filteredShops[0] || null,
    [filteredShops, selectedShopId],
  );
  const selectedShop = selectedShopEntry?.shop || null;
  const mapPreviewEntry = useMemo(
    () => filteredShops.find((entry) => entry.shop.id === mapPreviewShopId) || null,
    [filteredShops, mapPreviewShopId],
  );
  const mapPreviewShop = mapPreviewEntry?.shop || null;
  const mapPreviewDistanceKm = mapPreviewEntry?.distanceKm ?? null;
  const mappableShops = useMemo(
    () =>
      filteredShops
        .map((entry) => entry.shop)
        .filter((shop) => shop.latitude !== null && shop.longitude !== null),
    [filteredShops],
  );
  const mappableShopsById = useMemo(() => {
    const byId = new Map<string, MarketplaceShop>();
    for (const shop of mappableShops) {
      byId.set(shop.id, shop);
    }

    return byId;
  }, [mappableShops]);
  const activePins = mappableShops.length;
  const selectedShopCardId = selectedShop?.id || null;
  const trimmedSearchQuery = searchQuery.trim();
  const trimmedDeferredSearchQuery = deferredSearchQuery.trim();
  const isWaitingForSuggestions =
    trimmedSearchQuery.length > 0 &&
    normalizeSearchTerm(trimmedSearchQuery) !== normalizeSearchTerm(trimmedDeferredSearchQuery);
  const showSuggestions = isSearchFocused && trimmedSearchQuery.length > 0;
  const showCardSkeletons = (isApplyingSearch || isViewportLoading) && filteredShops.length === 0;

  useEffect(() => {
    const root = document.documentElement;

    const syncTheme = () => {
      const nextIsDark = root.classList.contains('dark');
      setIsDarkTheme((currentIsDark) =>
        currentIsDark === nextIsDark ? currentIsDark : nextIsDark,
      );
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 1279px)');
    const syncViewport = () => {
      const nextIsMobile = mediaQuery.matches;
      setIsMobileViewport((currentIsMobile) =>
        currentIsMobile === nextIsMobile ? currentIsMobile : nextIsMobile,
      );
    };

    syncViewport();

    mediaQuery.addEventListener('change', syncViewport);
    return () => {
      mediaQuery.removeEventListener('change', syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setMobileSheetTransitionReady(false);
      return;
    }
    const raf = requestAnimationFrame(() => setMobileSheetTransitionReady(true));
    return () => cancelAnimationFrame(raf);
  }, [isMobileViewport]);

  useEffect(() => {
    if (isMobileViewport === true || isMobileViewport === null) {
      return;
    }

    setMobileViewportHeight(null);
    mobileSheetDragOffsetRef.current = 0;
    isMobileSheetDraggingRef.current = false;
    setMobileSheetDragSnapshot({ dragging: false, offset: 0 });
    setMobileSheetStage('collapsed');
  }, [isMobileViewport]);

  useEffect(() => {
    if (!isMobileViewport || typeof window === 'undefined') {
      return;
    }

    let rafId = 0;

    const measureAndUpdate = () => {
      // Skip updates during active drag — the sheet position is controlled imperatively
      if (isMobileSheetDraggingRef.current) {
        return;
      }

      const nextViewportHeight = Math.round(
        window.visualViewport?.height ||
          window.innerHeight ||
          document.documentElement.clientHeight ||
          0,
      );
      const stageTop = Math.round(
        mobileStageRef.current?.getBoundingClientRect().top ??
          MOBILE_MARKETPLACE_FALLBACK_TOP_OFFSET_PX,
      );
      const nextContentHeight = Math.max(nextViewportHeight - Math.max(stageTop, 0), 0);

      setMobileViewportHeight(nextContentHeight > 0 ? nextContentHeight : null);
    };

    // Debounce via RAF so rapid consecutive events (e.g. theme change triggering
    // visualViewport events before layout settles) only fire once per frame.
    const syncViewportHeight = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        measureAndUpdate();
      });
    };

    measureAndUpdate();

    const visualViewport = window.visualViewport;
    window.addEventListener('resize', syncViewportHeight, { passive: true });
    visualViewport?.addEventListener('resize', syncViewportHeight);
    visualViewport?.addEventListener('scroll', syncViewportHeight);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', syncViewportHeight);
      visualViewport?.removeEventListener('resize', syncViewportHeight);
      visualViewport?.removeEventListener('scroll', syncViewportHeight);
    };
  }, [isMobileViewport]);

  useEffect(() => {
    if (!isMobileViewport || typeof document === 'undefined') {
      return;
    }

    const { documentElement, body } = document;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverscrollY = documentElement.style.overscrollBehaviorY;
    const previousBodyOverscrollY = body.style.overscrollBehaviorY;

    documentElement.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    documentElement.style.overscrollBehaviorY = 'none';
    body.style.overscrollBehaviorY = 'none';

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overscrollBehaviorY = previousHtmlOverscrollY;
      body.style.overscrollBehaviorY = previousBodyOverscrollY;
    };
  }, [isMobileViewport]);

  useEffect(() => {
    if (!isMobileViewport || !mobileViewportHeight || typeof window === 'undefined') {
      return;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    const center = map.getCenter();
    const zoom = map.getZoom();
    const frame = window.requestAnimationFrame(() => {
      const googleMapsEvent = (
        window as Window & {
          google?: {
            maps?: {
              event?: {
                trigger(instance: unknown, eventName: string): void;
              };
            };
          };
        }
      ).google?.maps?.event;

      googleMapsEvent?.trigger(map as unknown, 'resize');

      if (center) {
        map.setCenter({
          lat: center.lat(),
          lng: center.lng(),
        });
      }

      if (typeof zoom === 'number') {
        map.setZoom(zoom);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isMobileViewport, mobileViewportHeight]);

  useEffect(() => {
    activeSearchModeRef.current = activeSearchMode;
  }, [activeSearchMode]);

  useEffect(() => {
    isMobileViewportRef.current = isMobileViewport === true;
  }, [isMobileViewport]);

  useEffect(() => {
    mappableShopsByIdRef.current = mappableShopsById;
  }, [mappableShopsById]);

  useEffect(() => {
    if (mapError) {
      setIsViewportLoading(false);
    }
  }, [mapError]);

  useEffect(() => {
    if (!filteredShops.length) {
      setSelectedShopId(null);
      setMapPreviewShopId(null);
      return;
    }

    const stillExists = filteredShops.some((entry) => entry.shop.id === selectedShopId);
    if (!stillExists) {
      setSelectedShopId(filteredShops[0]?.shop.id || null);
    }
  }, [filteredShops, selectedShopId]);

  useEffect(() => {
    if (!mapPreviewShopId) {
      return;
    }

    const stillExists = filteredShops.some((entry) => entry.shop.id === mapPreviewShopId);
    if (!stillExists) {
      setMapPreviewShopId(null);
    }
  }, [filteredShops, mapPreviewShopId]);

  useEffect(() => {
    const trimmedQuery = deferredSearchQuery.trim();
    const abortController = new AbortController();

    if (!trimmedQuery) {
      suggestionsRequestIdRef.current += 1;
      setSuggestions([]);
      setIsSearching(false);
      return () => {
        abortController.abort();
      };
    }

    const requestId = suggestionsRequestIdRef.current + 1;
    suggestionsRequestIdRef.current = requestId;
    setIsSearching(true);

    void (async () => {
      const [shopSuggestions, areaSuggestions] = await Promise.all([
        fetchShopSuggestions(trimmedQuery, abortController.signal),
        fetchAreaSuggestions(trimmedQuery),
      ]);

      if (suggestionsRequestIdRef.current !== requestId) {
        return;
      }

      setSuggestions([...shopSuggestions, ...areaSuggestions].slice(0, 8));
      setIsSearching(false);
    })().catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      if (suggestionsRequestIdRef.current !== requestId) {
        return;
      }

      setSuggestions([]);
      setIsSearching(false);
    });

    return () => {
      abortController.abort();
    };
  }, [deferredSearchQuery]);

  useEffect(() => {
    if (
      isMobileViewport === null ||
      !googleMapsApiKey ||
      !mapElementRef.current ||
      mapRef.current
    ) {
      return;
    }

    let isCancelled = false;

    loadGoogleMapsPlacesApi(googleMapsApiKey)
      .then((google) => {
        if (isCancelled || !mapElementRef.current || !google?.maps || mapRef.current) {
          return;
        }

        googleMapsRef.current = google;
        autocompleteServiceRef.current = google.maps.places
          ? new google.maps.places.AutocompleteService()
          : null;
        geocoderRef.current = new google.maps.Geocoder();
        mapRef.current = new google.maps.Map(mapElementRef.current, {
          center: DEFAULT_MARKETPLACE_CENTER,
          zoom: DEFAULT_MARKETPLACE_ZOOM,
          ...getGoogleMapThemeOptions(isDarkTheme),
          disableDefaultUI: true,
          zoomControl: !isMobileViewport,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          gestureHandling: 'greedy',
          clickableIcons: false,
          restriction: {
            latLngBounds: URUGUAY_BOUNDS,
            strictBounds: false,
          },
        });

        mapRef.current.addListener('idle', () => {
          setHasMapSettled((currentHasSettled) => (currentHasSettled ? currentHasSettled : true));

          if (activeSearchModeRef.current === 'name') {
            return;
          }

          if (skipNextAreaViewportSyncRef.current) {
            skipNextAreaViewportSyncRef.current = false;
            return;
          }

          if (viewportIdleTimeoutRef.current) {
            window.clearTimeout(viewportIdleTimeoutRef.current);
          }

          const viewportSyncDelayMs = isMobileViewportRef.current ? 180 : 260;
          viewportIdleTimeoutRef.current = window.setTimeout(() => {
            void loadViewportShops({
              preserveExistingOnEmpty: false,
              clearErrorOnSuccess: true,
            });
          }, viewportSyncDelayMs);
        });

        setMapError(null);
        setIsMapReady(true);
        setHasMapSettled(false);
      })
      .catch((loadError) => {
        if (isCancelled) {
          return;
        }

        setMapError(
          loadError instanceof Error ? loadError.message : 'No se pudo cargar Google Maps.',
        );
        setIsMapReady(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [googleMapsApiKey, isDarkTheme, isMobileViewport]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.setOptions(getGoogleMapThemeOptions(isDarkTheme));
  }, [isDarkTheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (isMobileViewport === null) {
      return;
    }

    map.setOptions({
      zoomControl: !isMobileViewport,
    });
  }, [isMobileViewport]);

  useEffect(() => {
    const google = googleMapsRef.current;
    const map = mapRef.current;
    if (!google?.maps || !map) {
      return;
    }

    const visibleIds = new Set<string>();

    for (const shop of mappableShops) {
      const shopId = shop.id;
      const latitude = Number(shop.latitude);
      const longitude = Number(shop.longitude);
      const isActive = shopId === selectedShopId;
      const label = getMarkerLabel(shop);
      const existingMarker = markersRef.current.get(shopId);
      const previousMarkerState = markerStateRef.current.get(shopId);
      visibleIds.add(shopId);

      if (!existingMarker) {
        const marker = new google.maps.Marker({
          map,
          position: {
            lat: latitude,
            lng: longitude,
          },
          title: shop.name,
          icon: getShopMarkerIcon(google.maps, shop, isActive, isDarkTheme),
          optimized: true,
          zIndex: isActive ? 20 : 10,
        });

        const listener = marker.addListener('click', () => {
          const currentShop = mappableShopsByIdRef.current.get(shopId);
          if (!currentShop) {
            return;
          }

          setSelectedShopId(shopId);
          setMapPreviewShopId((currentPreviewShopId) =>
            currentPreviewShopId === shopId ? null : shopId,
          );

          if (isMobileViewportRef.current) {
            setMobileSheetSnap('collapsed');
          }

          if (currentShop.latitude !== null && currentShop.longitude !== null) {
            centerMapOnCoordinates(Number(currentShop.latitude), Number(currentShop.longitude), 15);
          }
        });

        markersRef.current.set(shopId, marker);
        markerListenersRef.current.set(shopId, listener as GoogleMapsEventListenerLike);
        markerStateRef.current.set(shopId, {
          latitude,
          longitude,
          title: shop.name,
          label,
          isActive,
          isDarkTheme,
        });
        continue;
      }

      existingMarker.setMap(map);

      if (
        !previousMarkerState ||
        previousMarkerState.latitude !== latitude ||
        previousMarkerState.longitude !== longitude
      ) {
        existingMarker.setPosition({
          lat: latitude,
          lng: longitude,
        });
      }

      if (!previousMarkerState || previousMarkerState.title !== shop.name) {
        existingMarker.setTitle(shop.name);
      }

      if (
        !previousMarkerState ||
        previousMarkerState.label !== label ||
        previousMarkerState.isActive !== isActive ||
        previousMarkerState.isDarkTheme !== isDarkTheme
      ) {
        existingMarker.setIcon(getShopMarkerIcon(google.maps, shop, isActive, isDarkTheme));
      }

      if (!previousMarkerState || previousMarkerState.isActive !== isActive) {
        existingMarker.setZIndex(isActive ? 20 : 10);
      }

      markerStateRef.current.set(shopId, {
        latitude,
        longitude,
        title: shop.name,
        label,
        isActive,
        isDarkTheme,
      });
    }

    for (const [shopId, marker] of markersRef.current.entries()) {
      if (visibleIds.has(shopId)) {
        continue;
      }

      marker.setMap(null);
      markersRef.current.delete(shopId);
      markerStateRef.current.delete(shopId);
      const listener = markerListenersRef.current.get(shopId);
      listener?.remove();
      markerListenersRef.current.delete(shopId);
    }
  }, [isDarkTheme, mappableShops, selectedShopId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (initialMapFrameDoneRef.current) {
      return;
    }

    map.setCenter(DEFAULT_MARKETPLACE_CENTER);
    map.setZoom(DEFAULT_MARKETPLACE_ZOOM);
    initialMapFrameDoneRef.current = true;
  }, [isMapReady]);

  useEffect(() => {
    const google = googleMapsRef.current;
    const map = mapRef.current;
    if (!google?.maps || !map) {
      return;
    }

    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }
      return;
    }

    if (!userMarkerRef.current) {
      userMarkerRef.current = new google.maps.Marker({
        map,
        position: {
          lat: userLocation.latitude,
          lng: userLocation.longitude,
        },
        icon: getUserMarkerIcon(google.maps),
        optimized: true,
        zIndex: 50,
        title: 'Tu ubicacion',
      });
      return;
    }

    userMarkerRef.current.setMap(map);
    userMarkerRef.current.setPosition({
      lat: userLocation.latitude,
      lng: userLocation.longitude,
    });
  }, [userLocation]);

  useEffect(() => {
    return () => {
      if (viewportIdleTimeoutRef.current) {
        window.clearTimeout(viewportIdleTimeoutRef.current);
      }

      for (const listener of markerListenersRef.current.values()) {
        listener.remove();
      }

      for (const marker of markersRef.current.values()) {
        marker.setMap(null);
      }

      markerListenersRef.current.clear();
      markerStateRef.current.clear();
      markersRef.current.clear();
      viewportInFlightRef.current.clear();
      userMarkerRef.current?.setMap(null);
    };
  }, []);

  const centerMapOnCoordinates = useCallback(
    (latitude: number, longitude: number, zoom: number) => {
      if (!mapRef.current) {
        return;
      }

      mapRef.current.setCenter({
        lat: latitude,
        lng: longitude,
      });
      mapRef.current.setZoom(zoom);
    },
    [],
  );

  const setMobileSheetSnap = useCallback((nextStage: MobileSheetStage) => {
    setMobileSheetStage(nextStage);
    mobileSheetDragOffsetRef.current = 0;
    isMobileSheetDraggingRef.current = false;
    setMobileSheetDragSnapshot({ dragging: false, offset: 0 });
  }, []);

  function resolveVelocitySnap(
    translatePercent: number,
    velocityPxPerMs: number,
    sheetHeight: number,
  ): MobileSheetStage {
    const VELOCITY_THRESHOLD = 0.35;
    const stages: MobileSheetStage[] = ['expanded', 'mid', 'collapsed'];
    const translates = stages.map((s) => getMobileSheetStageTranslate(s, sheetHeight));

    if (Math.abs(velocityPxPerMs) > VELOCITY_THRESHOLD) {
      const direction = velocityPxPerMs > 0 ? 1 : -1;
      let best: MobileSheetStage = stages[0]!;
      for (const stage of stages) {
        const t = getMobileSheetStageTranslate(stage, sheetHeight);
        if (direction > 0 && t > translatePercent) {
          return stage;
        }
        if (direction < 0 && t < translatePercent) {
          best = stage;
        }
      }
      if (direction < 0) {
        return best;
      }
    }

    let closestStage = stages[0]!;
    let closestDist = Math.abs(translates[0]! - translatePercent);
    for (let i = 1; i < stages.length; i++) {
      const dist = Math.abs(translates[i]! - translatePercent);
      if (dist < closestDist) {
        closestDist = dist;
        closestStage = stages[i]!;
      }
    }
    return closestStage;
  }

  function handleMobileSheetDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isMobileViewport) {
      return;
    }

    const sheet = mobileSheetRef.current;
    if (!sheet) {
      return;
    }

    // Clean up any in-progress drag before starting a new one
    if (activeDragCleanupRef.current) {
      activeDragCleanupRef.current();
    }

    event.preventDefault();

    const startY = event.clientY;
    const startTime = performance.now();
    const sheetHeight = sheet.getBoundingClientRect().height;
    const stageTranslate = getMobileSheetStageTranslate(mobileSheetStage, sheetHeight);
    const collapsedTranslate = getMobileSheetStageTranslate('collapsed', sheetHeight);
    const minOffset = (-stageTranslate / 100) * sheetHeight;
    const maxOffset = ((collapsedTranslate - stageTranslate) / 100) * sheetHeight;

    let lastY = startY;
    let lastTime = startTime;
    let velocityPxPerMs = 0;
    let rafId = 0;

    isMobileSheetDraggingRef.current = true;
    mobileSheetDragOffsetRef.current = 0;
    sheet.style.transition = 'none';
    sheet.style.willChange = 'transform';

    const applyTransform = (offset: number) => {
      const basePercent = getMobileSheetStageTranslate(mobileSheetStage, sheetHeight);
      sheet.style.transform = `translateY(calc(${basePercent}% + ${offset}px))`;
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const rawOffset = moveEvent.clientY - startY;
      const clampedOffset = Math.min(Math.max(rawOffset, minOffset), maxOffset);
      mobileSheetDragOffsetRef.current = clampedOffset;

      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 4) {
        velocityPxPerMs = (moveEvent.clientY - lastY) / dt;
        lastY = moveEvent.clientY;
        lastTime = now;
      }

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          applyTransform(mobileSheetDragOffsetRef.current);
          rafId = 0;
        });
      }
    };

    const teardown = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      sheet.style.willChange = '';
      sheet.style.transition = '';

      mobileSheetDragOffsetRef.current = 0;
      isMobileSheetDraggingRef.current = false;

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      activeDragCleanupRef.current = null;
    };

    const settleToStage = (nextStage: MobileSheetStage) => {
      teardown();
      // Set the transform directly on the DOM so it's correct even if React
      // skips re-rendering (e.g. when nextStage equals the current stage).
      const nextTranslate = getMobileSheetStageTranslate(nextStage, sheetHeight);
      sheet.style.transform = `translateY(${nextTranslate}%)`;
      setMobileSheetDragSnapshot({ dragging: false, offset: 0 });
      setMobileSheetStage(nextStage);
    };

    const handlePointerEnd = (endEvent?: PointerEvent) => {
      const finalOffset = endEvent ? endEvent.clientY - startY : 0;
      const clampedOffset = Math.min(Math.max(finalOffset, minOffset), maxOffset);
      const translatePercent = stageTranslate + (clampedOffset / sheetHeight) * 100;
      const nextStage = resolveVelocitySnap(translatePercent, velocityPxPerMs, sheetHeight);
      settleToStage(nextStage);
    };

    // Stored so a new drag can abort this one, resolving the stage from current offset
    activeDragCleanupRef.current = () => {
      const currentOffset = mobileSheetDragOffsetRef.current;
      const translatePercent = stageTranslate + (currentOffset / sheetHeight) * 100;
      const nextStage = resolveVelocitySnap(translatePercent, 0, sheetHeight);
      settleToStage(nextStage);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
  }

  async function focusMapOnCoordinates(
    latitude: number,
    longitude: number,
    zoom: number,
    requestId: number,
  ) {
    const map = mapRef.current;

    if (!map) {
      return false;
    }

    const waitForIdle = new Promise<void>((resolve) => {
      let listener: { remove(): void } | null = null;
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        listener?.remove();
        resolve();
      }, 450);

      listener = map.addListener('idle', () => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timeoutId);
        listener?.remove();
        resolve();
      });
    });

    skipNextAreaViewportSyncRef.current = true;
    centerMapOnCoordinates(latitude, longitude, zoom);
    await waitForIdle;

    return requestId === areaFocusRequestIdRef.current;
  }

  const focusShop = useCallback(
    (
      shop: MarketplaceShop,
      options?: {
        openPreview?: boolean;
      },
    ) => {
      setSelectedShopId(shop.id);
      setMapPreviewShopId((currentPreviewShopId) => {
        if (!options?.openPreview) {
          return null;
        }

        return currentPreviewShopId === shop.id ? null : shop.id;
      });

      if (options?.openPreview && isMobileViewport) {
        setMobileSheetSnap('collapsed');
      }

      if (shop.latitude === null || shop.longitude === null || !mapRef.current) {
        return;
      }

      centerMapOnCoordinates(Number(shop.latitude), Number(shop.longitude), 15);
    },
    [centerMapOnCoordinates, isMobileViewport, setMobileSheetSnap],
  );

  async function fetchSearchResults(params: Record<string, string>, signal?: AbortSignal) {
    const requestInit: RequestInit = {
      method: 'GET',
      cache: 'no-store',
      ...(signal
        ? {
            signal,
          }
        : {}),
    };
    const response = await fetch(`/api/shops/search?${new URLSearchParams(params).toString()}`, {
      ...requestInit,
    });

    if (!response.ok) {
      throw new Error('No se pudo completar la busqueda.');
    }

    return (await response.json()) as SearchResponsePayload;
  }

  async function fetchViewportShops(params: Record<string, string>) {
    const response = await fetch(`/api/shops/viewport?${new URLSearchParams(params).toString()}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('No se pudo actualizar el mapa.');
    }

    return (await response.json()) as ViewportResponsePayload;
  }

  function getViewportCacheKey(
    bounds: { north: number; south: number; east: number; west: number },
    zoom: number,
  ) {
    const precision = zoom >= 15 ? 4 : zoom >= 13 ? 3 : 2;
    const limit = getViewportFetchLimit(zoom);

    return [
      bounds.north.toFixed(precision),
      bounds.south.toFixed(precision),
      bounds.east.toFixed(precision),
      bounds.west.toFixed(precision),
      String(limit),
    ].join(':');
  }

  async function fetchShopSuggestions(query: string, signal?: AbortSignal) {
    const response = await fetchSearchResults(
      {
        q: query,
        intent: 'name',
        limit: '4',
      },
      signal,
    );

    return response.items.map<SearchSuggestion>((shop) => ({
      key: `shop:${shop.id}`,
      type: 'shop',
      label: shop.name,
      description: getLocationSummary(shop),
      shop,
    }));
  }

  async function fetchAreaSuggestions(query: string) {
    if (!autocompleteServiceRef.current) {
      return [];
    }

    const predictions = await new Promise<Array<{ description: string; placeId: string }>>(
      (resolve) => {
        autocompleteServiceRef.current?.getPlacePredictions(
          {
            input: query,
            componentRestrictions: { country: 'uy' },
          },
          (results, status) => {
            if (status !== 'OK' || !results?.length) {
              resolve([]);
              return;
            }

            resolve(
              results
                .map((item) => ({
                  description: String(item.description || ''),
                  placeId: String(item.place_id || ''),
                }))
                .filter((item) => item.description && item.placeId)
                .slice(0, 4),
            );
          },
        );
      },
    );

    return predictions.map<SearchSuggestion>((item) => ({
      key: `area:${item.placeId}`,
      type: 'area',
      label: item.description,
      description: 'Buscar barberias en esta zona',
      placeId: item.placeId,
    }));
  }

  async function loadViewportShops(options?: {
    preserveExistingOnEmpty?: boolean;
    clearErrorOnSuccess?: boolean;
  }) {
    const map = mapRef.current;
    const bounds = map?.getBounds();

    if (!map || !bounds) {
      return false;
    }

    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();
    const north = northEast.lat();
    const east = northEast.lng();
    const south = southWest.lat();
    const west = southWest.lng();
    const latitudeSpan = Math.max(0, north - south);
    const longitudeSpan = east >= west ? east - west : 360 - (west - east);
    const latitudePadding = Math.min(Math.max(latitudeSpan * 0.08, 0.003), 0.03);
    const longitudePadding = Math.min(Math.max(longitudeSpan * 0.08, 0.003), 0.03);
    const viewportNorth = Math.min(north + latitudePadding, URUGUAY_BOUNDS.north);
    const viewportSouth = Math.max(south - latitudePadding, URUGUAY_BOUNDS.south);
    const viewportWest = Math.max(west - longitudePadding, URUGUAY_BOUNDS.west);
    const viewportEast = Math.min(east + longitudePadding, URUGUAY_BOUNDS.east);
    const zoom = map.getZoom() ?? URUGUAY_ZOOM;
    const cacheKey = getViewportCacheKey(
      {
        north: viewportNorth,
        south: viewportSouth,
        east: viewportEast,
        west: viewportWest,
      },
      zoom,
    );
    const requestParams = {
      north: String(viewportNorth),
      south: String(viewportSouth),
      east: String(viewportEast),
      west: String(viewportWest),
      limit: String(getViewportFetchLimit(zoom)),
    };
    const cachedItems = viewportCacheRef.current.get(cacheKey) || null;

    if (cachedItems) {
      if (cachedItems.length > 0 || !options?.preserveExistingOnEmpty) {
        startTransition(() => {
          setViewportShops((currentViewportShops) =>
            areShopCollectionsEqualById(currentViewportShops, cachedItems)
              ? currentViewportShops
              : cachedItems,
          );
          setSelectedShopId((currentSelectedShopId) => {
            if (
              currentSelectedShopId &&
              cachedItems.some((shop) => shop.id === currentSelectedShopId)
            ) {
              return currentSelectedShopId;
            }

            return cachedItems[0]?.id || null;
          });
        });
      }

      if (cachedItems.length > 0 && options?.clearErrorOnSuccess) {
        setSearchError(null);
      }

      setIsViewportLoading(false);
      return cachedItems.length > 0;
    }

    const requestId = viewportLoadRequestIdRef.current + 1;
    viewportLoadRequestIdRef.current = requestId;
    setIsViewportLoading(true);

    try {
      let viewportRequest = viewportInFlightRef.current.get(cacheKey) || null;
      if (!viewportRequest) {
        viewportRequest = fetchViewportShops(requestParams);
        viewportInFlightRef.current.set(cacheKey, viewportRequest);
      }

      const response = await viewportRequest;

      if (requestId !== viewportLoadRequestIdRef.current) {
        return false;
      }

      viewportCacheRef.current.set(cacheKey, response.items);

      if (response.items.length > 0 || !options?.preserveExistingOnEmpty) {
        startTransition(() => {
          setViewportShops((currentViewportShops) =>
            areShopCollectionsEqualById(currentViewportShops, response.items)
              ? currentViewportShops
              : response.items,
          );
          setSelectedShopId((currentSelectedShopId) => {
            if (
              currentSelectedShopId &&
              response.items.some((shop) => shop.id === currentSelectedShopId)
            ) {
              return currentSelectedShopId;
            }

            return response.items[0]?.id || null;
          });
        });
      }

      if (response.items.length > 0 && options?.clearErrorOnSuccess) {
        setSearchError(null);
      }

      return response.items.length > 0;
    } catch {
      if (!options?.preserveExistingOnEmpty) {
        startTransition(() => {
          setViewportShops([]);
        });
      }

      return false;
    } finally {
      viewportInFlightRef.current.delete(cacheKey);
      if (requestId === viewportLoadRequestIdRef.current) {
        setIsViewportLoading(false);
      }
    }
  }

  async function focusMapOnArea(
    query: string,
    options?: {
      placeId?: string;
      zoom?: number;
      requestId?: number;
    },
  ): Promise<{ latitude: number; longitude: number; zoom: number } | null> {
    const trimmedQuery = query.trim();
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    const requestId = options?.requestId ?? areaFocusRequestIdRef.current;

    if ((!trimmedQuery && !options?.placeId) || !map || !geocoder) {
      return null;
    }

    try {
      const resolved = await new Promise<{
        latitude: number;
        longitude: number;
        result: GoogleGeocoderResult;
      }>((resolve, reject) => {
        geocoder.geocode(
          options?.placeId
            ? { placeId: options.placeId }
            : {
                address: trimmedQuery,
                componentRestrictions: { country: 'uy' },
              },
          (results, status) => {
            if (status !== 'OK' || !results?.length) {
              reject(new Error('No se pudo ubicar esa zona.'));
              return;
            }

            const location = results[0]?.geometry?.location;

            if (!location) {
              reject(new Error('No se pudo ubicar esa zona.'));
              return;
            }

            resolve({
              latitude: location.lat(),
              longitude: location.lng(),
              result: results[0] as GoogleGeocoderResult,
            });
          },
        );
      });

      if (requestId !== areaFocusRequestIdRef.current) {
        return null;
      }

      const nextViewport = {
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        zoom: options?.zoom ?? getGeocoderResultZoom(trimmedQuery, resolved.result),
      };

      const focused = await focusMapOnCoordinates(
        nextViewport.latitude,
        nextViewport.longitude,
        nextViewport.zoom,
        requestId,
      );

      if (!focused) {
        return null;
      }

      return nextViewport;
    } catch {
      return null;
    }
  }

  function clearSearchResults() {
    areaFocusRequestIdRef.current += 1;
    viewportLoadRequestIdRef.current += 1;
    suggestionsRequestIdRef.current += 1;
    setSearchQuery('');
    setSearchResults(null);
    setActiveSearchMode('all');
    setActiveSearchLabel(null);
    setSearchError(null);
    setSuggestions([]);
    setIsSearching(false);
    setMapPreviewShopId(null);

    if (isMobileViewport) {
      setMobileSheetSnap('collapsed');
    }

    void loadViewportShops({
      preserveExistingOnEmpty: false,
      clearErrorOnSuccess: true,
    });
  }

  async function applyNamedSearch(query: string, label?: string) {
    areaFocusRequestIdRef.current += 1;
    viewportLoadRequestIdRef.current += 1;
    suggestionsRequestIdRef.current += 1;
    setIsApplyingSearch(true);
    setIsViewportLoading(false);
    setSearchError(null);
    setMapPreviewShopId(null);
    setSuggestions([]);
    setIsSearching(false);

    if (isMobileViewport) {
      setMobileSheetSnap('expanded');
    }

    try {
      const response = await fetchSearchResults({
        q: query,
        intent: 'name',
      });

      setSearchResults((currentSearchResults) => {
        if (!currentSearchResults) {
          return response.items;
        }

        return areShopCollectionsEqualById(currentSearchResults, response.items)
          ? currentSearchResults
          : response.items;
      });
      setActiveSearchMode(response.mode);
      setActiveSearchLabel(label || query.trim());
      setSelectedShopId(response.items[0]?.id || null);
      if (response.items.length === 0) {
        setSearchError('No encontramos barberias con ese nombre.');
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'No se pudo completar la busqueda.');
    } finally {
      setIsApplyingSearch(false);
    }
  }

  async function applyAreaSearch(
    query: string,
    label?: string,
    placeId?: string,
  ): Promise<boolean> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      clearSearchResults();
      return false;
    }

    const areaFocusRequestId = areaFocusRequestIdRef.current + 1;
    areaFocusRequestIdRef.current = areaFocusRequestId;
    viewportLoadRequestIdRef.current += 1;
    suggestionsRequestIdRef.current += 1;
    setIsApplyingSearch(true);
    setSearchError(null);
    setMapPreviewShopId(null);
    setSuggestions([]);
    setIsSearching(false);
    setActiveSearchMode('area');
    setActiveSearchLabel(label || trimmedQuery);

    if (isMobileViewport) {
      setMobileSheetSnap('collapsed');
    }

    try {
      const nextViewport = await focusMapOnArea(
        label || trimmedQuery,
        placeId
          ? {
              placeId,
              requestId: areaFocusRequestId,
            }
          : {
              requestId: areaFocusRequestId,
            },
      );

      if (!nextViewport) {
        if (areaFocusRequestId === areaFocusRequestIdRef.current) {
          setSearchError('No se pudo ubicar esa zona.');
        }
        return false;
      }

      const hasResults = await loadViewportShops({
        preserveExistingOnEmpty: false,
        clearErrorOnSuccess: true,
      });

      if (!hasResults) {
        setSearchError(
          'No encontramos barberias visibles en esta zona todavia. Mueve el mapa para seguir explorando.',
        );
      }
      return true;
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'No se pudo buscar esa zona.');
      return false;
    } finally {
      setIsApplyingSearch(false);
    }
  }

  async function handleSuggestionSelect(suggestion: SearchSuggestion) {
    suggestionsRequestIdRef.current += 1;
    setIsSearchFocused(false);
    setSuggestions([]);
    setIsSearching(false);
    setSearchQuery(suggestion.label);

    if (suggestion.type === 'shop') {
      await applyNamedSearch(suggestion.shop.name, suggestion.shop.name);
      return;
    }

    await applyAreaSearch(
      searchQuery.trim() || suggestion.label,
      suggestion.label,
      suggestion.placeId,
    );
  }

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      clearSearchResults();
      return;
    }

    setIsSearchFocused(false);

    const topShopSuggestion = suggestions.find((item) => item.type === 'shop') || null;
    const topAreaSuggestion = suggestions.find((item) => item.type === 'area') || null;

    if (isLikelyShopQuery(trimmedQuery, topShopSuggestion)) {
      await applyNamedSearch(trimmedQuery, trimmedQuery);
      return;
    }

    if (topAreaSuggestion && topAreaSuggestion.type === 'area') {
      await applyAreaSearch(trimmedQuery, topAreaSuggestion.label, topAreaSuggestion.placeId);
      setSearchQuery(topAreaSuggestion.label);
      return;
    }

    const areaSearchApplied = await applyAreaSearch(trimmedQuery, trimmedQuery);

    if (areaSearchApplied) {
      return;
    }

    await applyNamedSearch(trimmedQuery, trimmedQuery);
  }

  const handleSearchInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const hasValue = nextValue.trim().length > 0;

    suggestionsRequestIdRef.current += 1;
    setIsSearchFocused(true);
    setSearchQuery(nextValue);
    setSuggestions([]);
    setIsSearching(hasValue);
  }, []);

  const handleSearchInputFocus = useCallback(() => {
    setIsSearchFocused(true);
  }, []);

  const handleSearchInputBlur = useCallback(() => {
    window.setTimeout(() => setIsSearchFocused(false), 120);
  }, []);

  const resultHeadline =
    activeSearchMode === 'nearby'
      ? `${filteredShops.length} barberias cerca de ti`
      : activeSearchMode === 'name' && activeSearchLabel
        ? `${filteredShops.length} barberias para ${activeSearchLabel}`
        : activeSearchLabel
          ? `${filteredShops.length} barberias en ${activeSearchLabel}`
          : filteredShops.length > 0
            ? `${filteredShops.length} barberias dentro del area del mapa`
            : 'Explora barberias dentro del area del mapa';
  const resultDescription =
    activeSearchMode === 'name'
      ? 'Resultados directos por nombre de barberia.'
      : 'Compara reputacion, perfil y disponibilidad antes de reservar.';
  const showResetSearch = (activeSearchMode !== 'all' || activeSearchLabel) && !isApplyingSearch;
  const mobileCollapsedCountLabel = `${filteredShops.length} ${
    filteredShops.length === 1 ? 'barberia' : 'barberias'
  } en esta zona`;
  const isMobileViewportActive = isMobileViewport === true;
  const mobileViewportContentHeight =
    isMobileViewportActive && mobileViewportHeight ? mobileViewportHeight : null;
  const mobileSheetHeight = mobileViewportContentHeight
    ? Math.max(mobileViewportContentHeight - 16, 0)
    : null;
  const shouldHideMobileSheetForMapPreview = isMobileViewportActive && Boolean(mapPreviewShop);
  const mobileSheetStyle = isMobileViewportActive
    ? {
        transform: shouldHideMobileSheetForMapPreview
          ? 'translateY(calc(100% + 1.5rem))'
          : `translateY(${getMobileSheetStageTranslate(mobileSheetStage, mobileSheetHeight)}%)`,
        height: mobileSheetHeight ? `${mobileSheetHeight}px` : undefined,
        maxHeight: mobileSheetHeight ? `${mobileSheetHeight}px` : undefined,
      }
    : undefined;
  const mobileStageStyle =
    mobileViewportContentHeight !== null
      ? {
          height: `${mobileViewportContentHeight}px`,
        }
      : undefined;
  const mobileMapShellClassName = cn(
    'marketplace-map-shell relative overflow-hidden',
    isMobileViewport
      ? 'h-full min-h-full max-h-full rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-0'
      : 'h-[20rem] rounded-[2rem] border border-white/70 bg-white/88 p-2 shadow-[0_24px_44px_-30px_rgba(15,23,42,0.22)] md:h-[26rem] dark:border-white/10 dark:bg-slate-950/78 xl:h-full xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none',
  );
  const showInitialMapOverlay = !mapError && (!isMapReady || !hasMapSettled);
  const loadingPillClassName = isDarkTheme
    ? 'border-white/12 bg-slate-950/94 text-slate-100'
    : 'border-slate-200 bg-white text-slate-900';
  const mobileSheetClassName = cn(
    'pointer-events-auto relative z-10',
    isMobileViewportActive
      ? 'mobile-marketplace-sheet flex w-full h-[calc(100svh-9.5rem)] max-h-[calc(100svh-9.5rem)] flex-col rounded-t-[2.25rem] rounded-b-none border border-slate-200/60 bg-surface-sheet shadow-[0_-28px_48px_-32px_rgba(15,23,42,0.32)] dark:border-white/8'
      : 'relative z-10 rounded-[2.25rem] border border-white/70 bg-white/95 p-4 shadow-[0_-28px_48px_-32px_rgba(15,23,42,0.32)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/94 xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none xl:backdrop-blur-0 xl:flex xl:flex-col xl:flex-1 xl:min-h-0 xl:overflow-hidden',
    !isMobileViewportActive && '-mt-14 xl:mt-0',
    shouldHideMobileSheetForMapPreview && 'pointer-events-none opacity-0',
    !isMobileSheetDraggingRef.current &&
      isMobileViewportActive &&
      mobileSheetTransitionReady &&
      'transition-transform duration-300 ease-out',
  );

  if (isMobileViewport === null) {
    return (
      <div className="relative -mx-4 -mb-16 -mt-5 flex h-[calc(100dvh-4.75rem)] flex-col overflow-hidden sm:-mx-6 md:-mb-[4.5rem] md:-mt-7 xl:mx-0 xl:mb-0 xl:mt-0">
        <div className="marketplace-map-shell relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-none border-0 bg-slate-100/60 p-0 shadow-none dark:bg-page-bg xl:rounded-[1.4rem]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-violet-400 dark:border-t-violet-300" />
              <MapPinned className="h-5 w-5 text-violet-400 dark:text-violet-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-ink dark:text-white">
                Cargando barberias
              </p>
              <p className="mt-1 text-xs text-slate/60 dark:text-slate-400">
                Preparando el mapa...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mobileStageRef}
      className="shops-marketplace-stage relative -mx-4 -mb-16 -mt-5 flex h-[calc(100dvh-4.75rem)] flex-col gap-4 overflow-hidden sm:-mx-6 md:-mb-[4.5rem] md:-mt-7 xl:mx-0 xl:-mb-[4.5rem] xl:mt-0 xl:grid xl:h-[calc(100dvh-6.5rem)] xl:overflow-hidden xl:grid-cols-[minmax(0,1.02fr)_minmax(28rem,0.98fr)] xl:gap-6 xl:items-stretch"
      style={mobileStageStyle}
    >
      <div className="pointer-events-none absolute inset-0 z-20 flex items-end overflow-hidden xl:pointer-events-auto xl:relative xl:inset-auto xl:flex xl:flex-col xl:items-stretch xl:order-1 xl:pr-4">
        <div className="hidden space-y-5 xl:block xl:shrink-0">
          <div className="px-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="hero-eyebrow">
                <Sparkles className="h-3.5 w-3.5" />
                Marketplace Uruguay
              </div>
              <div className="meta-chip" data-tone="success">
                <MapPinned className="h-3.5 w-3.5" />
                {filteredShops.length} barberias
              </div>
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold text-ink dark:text-slate-100">
              {resultHeadline}
            </h1>
            <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{resultDescription}</p>
          </div>

          <form
            className="soft-panel relative z-30 rounded-[1.8rem] p-4"
            onSubmit={handleSearchSubmit}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="hero-eyebrow">
                <Sparkles className="h-3.5 w-3.5" />
                Busca como en un mapa
              </div>
              {showResetSearch ? (
                <Button
                  type="button"
                  onClick={clearSearchResults}
                  variant="light"
                  className="meta-chip transition hover:bg-white/80 dark:hover:bg-white/[0.08]"
                >
                  Limpiar busqueda
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="places-search-shell relative z-40">
                <div
                  className="places-search-input-shell"
                  data-open={showSuggestions ? 'true' : 'false'}
                >
                  <Search className="places-search-icon h-4 w-4" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onFocus={handleSearchInputFocus}
                    onBlur={handleSearchInputBlur}
                    placeholder="Busca una zona o el nombre de una barberia"
                    className="min-w-0 text-[16px] font-medium outline-none placeholder:text-slate/55 md:text-sm dark:placeholder:text-slate-400"
                  />
                </div>

                {showSuggestions ? (
                  <div className="places-search-dropdown">
                    {isSearching || isWaitingForSuggestions ? (
                      <p className="places-search-empty">Buscando sugerencias...</p>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((suggestion) => (
                        <Button
                          key={suggestion.key}
                          type="button"
                          variant="light"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => void handleSuggestionSelect(suggestion)}
                          className="places-search-option"
                        >
                          <span className="places-search-option-copy">
                            <span>{suggestion.label}</span>
                            <small>{suggestion.description}</small>
                          </span>
                          <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate/60 dark:text-slate-400">
                            {suggestion.type === 'shop' ? 'Barberia' : 'Zona'}
                          </span>
                        </Button>
                      ))
                    ) : (
                      <p className="places-search-empty">
                        No encontramos sugerencias. Presiona Buscar para intentar igual.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              <Button
                type="submit"
                isDisabled={isApplyingSearch}
                className="action-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold"
              >
                {isApplyingSearch ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Buscar
              </Button>
            </div>

            {searchError ? <p className="status-banner warning mt-3">{searchError}</p> : null}
          </form>
        </div>

        <div ref={mobileSheetRef} className={mobileSheetClassName} style={mobileSheetStyle}>
          <div
            className="mobile-sheet-surface absolute inset-x-0 top-0 z-10 flex h-8 cursor-grab touch-none items-center justify-center select-none active:cursor-grabbing xl:hidden"
            onPointerDown={handleMobileSheetDragStart}
          >
            <div className="h-[5px] w-10 rounded-full bg-slate-300/80 dark:bg-white/25" />
          </div>

          <div
            className={cn(
              'mobile-sheet-surface relative z-10 xl:hidden cursor-grab touch-none select-none active:cursor-grabbing',
              mobileSheetStage === 'collapsed'
                ? 'h-10 px-4 py-0 flex justify-center'
                : 'px-4 pb-3 pt-7',
            )}
            onPointerDown={handleMobileSheetDragStart}
          >
            {mobileSheetStage === 'collapsed' ? (
              <p className="max-w-full truncate px-4 text-center text-sm font-semibold leading-none text-ink dark:text-slate-100 sm:text-base">
                {mobileCollapsedCountLabel}
              </p>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate/65 dark:text-slate-400">
                      Barberias en el area del mapa
                    </p>
                    <h1 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold text-ink dark:text-slate-100">
                      {resultHeadline}
                    </h1>
                  </div>
                  <div className="meta-chip shrink-0" data-tone="success">
                    <MapPinned className="h-3.5 w-3.5" />
                    {activePins}
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  {resultDescription}
                </p>
              </div>
            )}
            {mobileSheetStage !== 'collapsed' && showResetSearch ? (
              <Button
                type="button"
                onClick={clearSearchResults}
                onPointerDown={(event) => event.stopPropagation()}
                variant="light"
                className="meta-chip mt-3 transition hover:bg-white/80 dark:hover:bg-white/[0.08]"
              >
                Limpiar busqueda
              </Button>
            ) : null}
            {mobileSheetStage !== 'collapsed' && searchError ? (
              <p className="status-banner warning mt-3">{searchError}</p>
            ) : null}
          </div>

          <div
            className={cn(
              isMobileViewport
                ? 'mobile-sheet-surface mt-0 min-h-0 flex-1 px-4 pb-4 pt-5'
                : 'mt-5 xl:flex-1 xl:min-h-0',
              isMobileViewport &&
                mobileSheetStage === 'collapsed' &&
                'pointer-events-none opacity-0',
            )}
          >
            <ScrollShadow
              hideScrollBar
              size={20}
              className={cn(
                isMobileViewport
                  ? 'h-full overflow-y-auto overscroll-contain'
                  : 'h-full overflow-y-auto pb-8 pr-0.5',
              )}
            >
              <MarketplaceCardsSection
                showCardSkeletons={showCardSkeletons}
                filteredShops={filteredShops}
                selectedShopId={selectedShopCardId}
                activeSearchMode={activeSearchMode}
                onFocus={focusShop}
              />
            </ScrollShadow>
          </div>
        </div>
      </div>

      <div className="order-1 h-full min-h-0 xl:order-2 xl:h-full xl:w-full xl:pb-[1.75rem]">
        <div className={mobileMapShellClassName}>
          <div className="pointer-events-none absolute inset-x-3 top-3 z-20 xl:hidden">
            <form
              className="pointer-events-auto rounded-[1.7rem] border border-white/75 bg-white/94 p-3 shadow-[0_20px_42px_-28px_rgba(15,23,42,0.32)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/92"
              onSubmit={handleSearchSubmit}
            >
              <div className="flex items-center gap-2">
                <div className="places-search-shell relative z-40 min-w-0 flex-1">
                  <div
                    className="places-search-input-shell"
                    data-open={showSuggestions ? 'true' : 'false'}
                  >
                    <Search className="places-search-icon h-4 w-4" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      onFocus={handleSearchInputFocus}
                      onBlur={handleSearchInputBlur}
                      placeholder="Buscar zona o barberia"
                      className="min-w-0 text-[16px] font-medium outline-none placeholder:text-slate/55 md:text-sm dark:placeholder:text-slate-400"
                    />
                  </div>

                  {showSuggestions ? (
                    <div className="places-search-dropdown">
                      {isSearching || isWaitingForSuggestions ? (
                        <p className="places-search-empty">Buscando sugerencias...</p>
                      ) : suggestions.length > 0 ? (
                        suggestions.map((suggestion) => (
                          <Button
                            key={suggestion.key}
                            type="button"
                            variant="light"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => void handleSuggestionSelect(suggestion)}
                            className="places-search-option"
                          >
                            <span className="places-search-option-copy">
                              <span>{suggestion.label}</span>
                              <small>{suggestion.description}</small>
                            </span>
                            <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate/60 dark:text-slate-400">
                              {suggestion.type === 'shop' ? 'Barberia' : 'Zona'}
                            </span>
                          </Button>
                        ))
                      ) : (
                        <p className="places-search-empty">
                          No encontramos sugerencias. Presiona Buscar para intentar igual.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  isIconOnly
                  isDisabled={isApplyingSearch}
                  className="action-primary inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                  aria-label="Buscar"
                >
                  {isApplyingSearch ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>

          {mapError ? (
            <div className="flex h-full items-center justify-center rounded-none border border-white/10 bg-slate-950/20 p-6 text-center text-sm text-slate/80 dark:text-slate-300 xl:rounded-[1.4rem]">
              {mapError}
            </div>
          ) : (
            <div ref={mapElementRef} className="h-full w-full rounded-none xl:rounded-[1.4rem]" />
          )}

          {showInitialMapOverlay ? (
            <div className="pointer-events-none absolute inset-0 z-20">
              <div className="h-full w-full rounded-none bg-white/42 backdrop-blur-[1.5px] dark:bg-slate-950/44 xl:rounded-[1.4rem]" />
              <div
                className={cn(
                  'absolute inset-x-3 bottom-3 rounded-[1.2rem] border px-4 py-3 text-sm shadow-[0_20px_40px_-28px_rgba(15,23,42,0.38)] xl:inset-x-auto xl:left-4 xl:w-[21rem]',
                  loadingPillClassName,
                )}
              >
                <div className="flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span className="font-semibold">Cargando mapa...</span>
                </div>
              </div>
            </div>
          ) : null}

          {(isViewportLoading || isApplyingSearch) && !showInitialMapOverlay ? (
            <div className="pointer-events-none absolute inset-x-0 top-[6.75rem] z-20 flex justify-center xl:top-3">
              <div className="flex items-center gap-[5px] rounded-full border border-slate-200/80 bg-white px-3.5 py-2 shadow-[0_4px_16px_-6px_rgba(15,23,42,0.15)] dark:border-white/10 dark:bg-page-bg/85">
                <span className="map-loading-dot h-[7px] w-[7px] rounded-full bg-ink dark:bg-violet-400" />
                <span className="map-loading-dot h-[7px] w-[7px] rounded-full bg-ink dark:bg-violet-400" />
                <span className="map-loading-dot h-[7px] w-[7px] rounded-full bg-ink dark:bg-violet-400" />
              </div>
            </div>
          ) : null}

          <div className="hidden xl:block">
            <div className="map-overlay-chip">
              <span>Marketplace Uruguay</span>
              <span>{activePins} pins</span>
            </div>
          </div>

          {mapPreviewShop ? (
            <div className="pointer-events-none absolute inset-x-3 bottom-4 z-30 xl:inset-x-auto xl:bottom-4 xl:left-4 xl:right-auto xl:w-[23.5rem]">
              <Card
                as="article"
                isFooterBlurred
                className="data-card no-hover-motion pointer-events-auto h-[22rem] overflow-hidden rounded-[1.9rem] border-0 p-0 shadow-[0_26px_50px_-30px_rgba(15,23,42,0.62)]"
              >
                <CardHeader className="absolute inset-x-0 top-0 z-10 items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
                      {getShopHighlight(mapPreviewShop, mapPreviewDistanceKm)}
                    </p>
                    <h3 className="mt-2 line-clamp-2 font-[family-name:var(--font-heading)] text-xl font-semibold text-white">
                      {mapPreviewShop.name}
                    </h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-ink shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)] dark:bg-slate-950/90 dark:text-slate-100">
                      <Star className="mr-1 inline h-3.5 w-3.5 fill-current text-amber-500" />
                      {formatRating(mapPreviewShop.averageRating)}
                    </div>
                    <Button
                      type="button"
                      isIconOnly
                      radius="full"
                      variant="light"
                      onClick={() => {
                        setMapPreviewShopId(null);
                        if (isMobileViewport) {
                          setMobileSheetSnap('collapsed');
                        }
                      }}
                      aria-label="Cerrar vista previa"
                      className="inline-flex h-8 w-8 min-w-8 items-center justify-center rounded-full bg-white/92 text-slate-900 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)] transition hover:bg-white dark:bg-slate-950/90 dark:text-slate-100 dark:hover:bg-slate-900"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                <MediaShowcase
                  alt={`Vista de ${mapPreviewShop.name}`}
                  images={mapPreviewShop.imageUrls}
                  className="h-full w-full"
                  dotsClassName="bottom-[7.1rem]"
                  fallback={
                    <div
                      className="h-full w-full"
                      style={{
                        ...getFallbackCoverStyle(mapPreviewShop),
                        opacity: 1,
                      }}
                    />
                  }
                />

                <div className="absolute inset-0 z-[1] bg-gradient-to-b from-slate-950/60 via-transparent to-transparent" />
                <div className="absolute inset-0 z-[1] bg-gradient-to-t from-slate-950/88 via-slate-950/28 to-transparent" />

                <CardFooter className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md">
                  <div className="flex w-full flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold text-white">
                          {getLocationSummary(mapPreviewShop)}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-white/68">
                          {mapPreviewShop.description || getShopReviewSummary(mapPreviewShop)}
                        </p>
                      </div>
                      {mapPreviewDistanceKm !== null ? (
                        <span className="shrink-0 rounded-full bg-white/14 px-2.5 py-1 text-[11px] font-semibold text-white">
                          {mapPreviewDistanceKm.toFixed(1)} km
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-white/72">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                        <MessageSquareText className="h-3.5 w-3.5" />
                        {mapPreviewShop.reviewCount || 0} resenas
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                        {mapPreviewShop.activeServiceCount} servicios
                      </span>
                      {mapPreviewShop.minServicePriceCents !== null ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                          Desde {formatCurrency(mapPreviewShop.minServicePriceCents)}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={buildTenantRootHref(mapPreviewShop.slug)}
                        className="action-secondary rounded-full px-4 py-2 text-sm font-semibold"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Ver perfil
                      </a>
                      <Link
                        href={buildShopHref(mapPreviewShop.slug, 'book')}
                        className="action-primary inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Reservar
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
