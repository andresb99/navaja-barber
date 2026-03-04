'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Card, CardBody, CardFooter, CardHeader, Skeleton } from '@heroui/react';
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
import { buildShopHref } from '@/lib/shop-links';
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
  return [shop.locationLabel, shop.city, shop.region].filter(Boolean).join(' - ') || 'Ubicacion por confirmar';
}

function getInitialSelectedShop(shops: MarketplaceShop[]) {
  return shops.find((shop) => shop.latitude !== null && shop.longitude !== null)?.id || shops[0]?.id || null;
}

function getMarkerLabel(shop: MarketplaceShop) {
  return shop.averageRating !== null ? `${formatRating(shop.averageRating)}/5` : 'Nuevo';
}

function createMarkerBadgeSvg(
  label: string,
  fillColor: string,
  borderColor: string,
  textColor: string,
) {
  const cacheKey = [label, fillColor, borderColor, textColor].join('|');
  const cachedIcon = markerBadgeIconCache.get(cacheKey);
  if (cachedIcon) {
    return cachedIcon;
  }

  const width = Math.max(72, label.length * 9 + 30);
  const badgeHeight = 34;
  const pointerHeight = 10;
  const totalHeight = badgeHeight + pointerHeight + 2;
  const centerX = width / 2;

  const iconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="${width - 2}" height="${badgeHeight}" rx="17" fill="${fillColor}" stroke="${borderColor}" stroke-width="1.5"/>
      <path d="M${centerX - 6} ${badgeHeight - 1}L${centerX} ${badgeHeight + pointerHeight}L${centerX + 6} ${badgeHeight - 1}" fill="${fillColor}" stroke="${borderColor}" stroke-width="1.5" stroke-linejoin="round"/>
      <text x="${centerX}" y="21" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12.5" font-weight="700" fill="${textColor}">
        ${label}
      </text>
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
  const width = Math.max(72, label.length * 9 + 30);
  const height = 46;
  const fillColor = isActive ? '#ffffff' : isDarkTheme ? '#0f172a' : '#111827';
  const borderColor = isActive ? '#cbd5e1' : isDarkTheme ? '#334155' : '#374151';
  const textColor = isActive ? '#0f172a' : '#f8fafc';

  return {
    url: createMarkerBadgeSvg(label, fillColor, borderColor, textColor),
    scaledSize: new google.Size(width, height),
    anchor: new google.Point(Math.round(width / 2), 44),
  };
}

function getUserMarkerIcon(google: GoogleMapsLibrary) {
  return {
    path: google.SymbolPath.CIRCLE,
    scale: 7,
    fillColor: '#38bdf8',
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
    ['rgba(14, 165, 233, 0.92)', 'rgba(15, 23, 42, 0.96)'],
    ['rgba(244, 63, 94, 0.88)', 'rgba(30, 41, 59, 0.96)'],
    ['rgba(236, 72, 153, 0.86)', 'rgba(17, 24, 39, 0.96)'],
    ['rgba(234, 176, 72, 0.9)', 'rgba(22, 28, 45, 0.96)'],
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
const MOBILE_SHEET_COLLAPSED_PEEK_PX = 84;
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
  const userMarkerRef = useRef<GoogleMarker | null>(null);
  const initialMapFrameDoneRef = useRef(false);
  const suggestionsRequestIdRef = useRef(0);
  const areaFocusRequestIdRef = useRef(0);
  const viewportLoadRequestIdRef = useRef(0);
  const viewportIdleTimeoutRef = useRef<number | null>(null);
  const viewportCacheRef = useRef<Map<string, MarketplaceShop[]>>(new Map());
  const skipNextAreaViewportSyncRef = useRef(false);
  const activeSearchModeRef = useRef<MarketplaceSearchMode>('all');

  const [selectedShopId, setSelectedShopId] = useState<string | null>(() => getInitialSelectedShop(initialShops));
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
  const [isViewportLoading, setIsViewportLoading] = useState(initialShops.length === 0);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileViewportHeight, setMobileViewportHeight] = useState<number | null>(null);
  const [mobileSheetStage, setMobileSheetStage] = useState<MobileSheetStage>('collapsed');
  const [mobileSheetDragOffset, setMobileSheetDragOffset] = useState(0);
  const [isMobileSheetDragging, setIsMobileSheetDragging] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const displayedShops = activeSearchMode === 'name' ? searchResults ?? [] : viewportShops;

  const filteredShops = useMemo(() => {
    const withDistance = displayedShops.map((shop) => {
      const distanceKm =
        userLocation && shop.latitude !== null && shop.longitude !== null
          ? getDistanceKm(userLocation.latitude, userLocation.longitude, shop.latitude, shop.longitude)
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

  const selectedShopEntry =
    filteredShops.find((entry) => entry.shop.id === selectedShopId) || filteredShops[0] || null;
  const selectedShop = selectedShopEntry?.shop || null;
  const mapPreviewEntry = filteredShops.find((entry) => entry.shop.id === mapPreviewShopId) || null;
  const mapPreviewShop = mapPreviewEntry?.shop || null;
  const mapPreviewDistanceKm = mapPreviewEntry?.distanceKm ?? null;
  const mappableShops = filteredShops
    .map((entry) => entry.shop)
    .filter((shop) => shop.latitude !== null && shop.longitude !== null);
  const activePins = mappableShops.length;
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
      setIsDarkTheme(root.classList.contains('dark'));
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
      setIsMobileViewport(mediaQuery.matches);
    };

    syncViewport();

    mediaQuery.addEventListener('change', syncViewport);
    return () => {
      mediaQuery.removeEventListener('change', syncViewport);
    };
  }, []);

  useEffect(() => {
    if (isMobileViewport) {
      return;
    }

    setMobileViewportHeight(null);
    setMobileSheetDragOffset(0);
    setIsMobileSheetDragging(false);
    setMobileSheetStage('collapsed');
  }, [isMobileViewport]);

  useEffect(() => {
    if (!isMobileViewport || typeof window === 'undefined') {
      return;
    }

    const syncViewportHeight = () => {
      const nextViewportHeight = Math.round(
        window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0,
      );
      const stageTop = Math.round(
        mobileStageRef.current?.getBoundingClientRect().top ?? MOBILE_MARKETPLACE_FALLBACK_TOP_OFFSET_PX,
      );
      const nextContentHeight = Math.max(nextViewportHeight - Math.max(stageTop, 0), 0);

      setMobileViewportHeight(nextContentHeight > 0 ? nextContentHeight : null);
    };

    syncViewportHeight();

    const visualViewport = window.visualViewport;
    window.addEventListener('resize', syncViewportHeight, { passive: true });
    visualViewport?.addEventListener('resize', syncViewportHeight);
    visualViewport?.addEventListener('scroll', syncViewportHeight);

    return () => {
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

    if (!trimmedQuery) {
      suggestionsRequestIdRef.current += 1;
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const requestId = suggestionsRequestIdRef.current + 1;
    suggestionsRequestIdRef.current = requestId;
    setIsSearching(true);

    void (async () => {
      const [shopSuggestions, areaSuggestions] = await Promise.all([
        fetchShopSuggestions(trimmedQuery),
        fetchAreaSuggestions(trimmedQuery),
      ]);

      if (suggestionsRequestIdRef.current !== requestId) {
        return;
      }

      setSuggestions([...shopSuggestions, ...areaSuggestions].slice(0, 8));
      setIsSearching(false);
    })().catch(() => {
      if (suggestionsRequestIdRef.current !== requestId) {
        return;
      }

      setSuggestions([]);
      setIsSearching(false);
    });
  }, [deferredSearchQuery]);

  useEffect(() => {
    if (!googleMapsApiKey || !mapElementRef.current || mapRef.current) {
      return;
    }

    let isCancelled = false;

    loadGoogleMapsPlacesApi(googleMapsApiKey)
      .then((google) => {
        if (isCancelled || !mapElementRef.current || !google?.maps || mapRef.current) {
          return;
        }

        googleMapsRef.current = google;
        autocompleteServiceRef.current = google.maps.places ? new google.maps.places.AutocompleteService() : null;
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

          viewportIdleTimeoutRef.current = window.setTimeout(() => {
            void loadViewportShops({
              preserveExistingOnEmpty: false,
              clearErrorOnSuccess: true,
            });
          }, 160);
        });

        setMapError(null);
        setIsMapReady(true);
      })
      .catch((loadError) => {
        if (isCancelled) {
          return;
        }

        setMapError(loadError instanceof Error ? loadError.message : 'No se pudo cargar Google Maps.');
        setIsMapReady(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [googleMapsApiKey, isDarkTheme]);

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
      visibleIds.add(shop.id);
      const position = {
        lat: Number(shop.latitude),
        lng: Number(shop.longitude),
      };
      const isActive = shop.id === selectedShop?.id;
      const existingMarker = markersRef.current.get(shop.id);

      if (!existingMarker) {
        const marker = new google.maps.Marker({
          map,
          position,
          title: shop.name,
          icon: getShopMarkerIcon(google.maps, shop, isActive, isDarkTheme),
          optimized: true,
          zIndex: isActive ? 20 : 10,
        });

        marker.addListener('click', () => {
          focusShop(shop, {
            openPreview: true,
          });
        });

        markersRef.current.set(shop.id, marker);
        continue;
      }

      existingMarker.setMap(map);
      existingMarker.setPosition(position);
      existingMarker.setTitle(shop.name);
      existingMarker.setIcon(getShopMarkerIcon(google.maps, shop, isActive, isDarkTheme));
      existingMarker.setZIndex(isActive ? 20 : 10);
    }

    for (const [shopId, marker] of markersRef.current.entries()) {
      if (visibleIds.has(shopId)) {
        continue;
      }

      marker.setMap(null);
    }
  }, [isDarkTheme, mappableShops, selectedShop]);

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

      for (const marker of markersRef.current.values()) {
        marker.setMap(null);
      }

      markersRef.current.clear();
      userMarkerRef.current?.setMap(null);
    };
  }, []);

  function centerMapOnCoordinates(latitude: number, longitude: number, zoom: number) {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.setCenter({
      lat: latitude,
      lng: longitude,
    });
    mapRef.current.setZoom(zoom);
  }

  function setMobileSheetSnap(nextStage: MobileSheetStage) {
    setMobileSheetStage(nextStage);
    setMobileSheetDragOffset(0);
    setIsMobileSheetDragging(false);
  }

  function getClosestMobileSheetStage(translatePercent: number, sheetHeight: number) {
    return (Object.entries(MOBILE_SHEET_STAGE_TRANSLATE) as Array<[MobileSheetStage, number]>).reduce(
      (closestStage, [stage]) => {
        const currentDistance = Math.abs(getMobileSheetStageTranslate(closestStage, sheetHeight) - translatePercent);
        const nextDistance = Math.abs(getMobileSheetStageTranslate(stage, sheetHeight) - translatePercent);
        return nextDistance < currentDistance ? stage : closestStage;
      },
      'mid' as MobileSheetStage,
    );
  }

  function handleMobileSheetDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isMobileViewport) {
      return;
    }

    const sheet = mobileSheetRef.current;
    if (!sheet) {
      return;
    }

    event.preventDefault();

    const startY = event.clientY;
    const sheetHeight = sheet.getBoundingClientRect().height;
    const stageTranslate = getMobileSheetStageTranslate(mobileSheetStage, sheetHeight);
    const collapsedTranslate = getMobileSheetStageTranslate('collapsed', sheetHeight);
    const minOffset = (-stageTranslate / 100) * sheetHeight;
    const maxOffset = ((collapsedTranslate - stageTranslate) / 100) * sheetHeight;

    setIsMobileSheetDragging(true);
    setMobileSheetDragOffset(0);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const rawOffset = moveEvent.clientY - startY;
      const clampedOffset = Math.min(Math.max(rawOffset, minOffset), maxOffset);
      setMobileSheetDragOffset(clampedOffset);
    };

    const handlePointerEnd = (endEvent?: PointerEvent) => {
      const finalOffset = endEvent ? endEvent.clientY - startY : 0;
      const clampedOffset = Math.min(Math.max(finalOffset, minOffset), maxOffset);
      const translatePercent = stageTranslate + (clampedOffset / sheetHeight) * 100;

      setMobileSheetDragOffset(0);
      setIsMobileSheetDragging(false);
      setMobileSheetStage(getClosestMobileSheetStage(translatePercent, sheetHeight));

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
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

  function focusShop(
    shop: MarketplaceShop,
    options?: {
      openPreview?: boolean;
    },
  ) {
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
  }

  async function fetchSearchResults(params: Record<string, string>) {
    const response = await fetch(`/api/shops/search?${new URLSearchParams(params).toString()}`, {
      method: 'GET',
      cache: 'no-store',
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

  function getViewportCacheKey(bounds: { north: number; south: number; east: number; west: number }, zoom: number) {
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

  async function fetchShopSuggestions(query: string) {
    const response = await fetchSearchResults({
      q: query,
      intent: 'name',
      limit: '4',
    });

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

    const predictions = await new Promise<Array<{ description: string; placeId: string }>>((resolve) => {
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
    });

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
    const cachedItems = viewportCacheRef.current.get(cacheKey) || null;

    if (cachedItems) {
      if (cachedItems.length > 0 || !options?.preserveExistingOnEmpty) {
        setViewportShops(cachedItems);
        setSelectedShopId((currentSelectedShopId) => {
          if (currentSelectedShopId && cachedItems.some((shop) => shop.id === currentSelectedShopId)) {
            return currentSelectedShopId;
          }

          return cachedItems[0]?.id || null;
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
      const response = await fetchViewportShops({
        north: String(viewportNorth),
        south: String(viewportSouth),
        east: String(viewportEast),
        west: String(viewportWest),
        limit: String(getViewportFetchLimit(zoom)),
      });

      if (requestId !== viewportLoadRequestIdRef.current) {
        return false;
      }

      viewportCacheRef.current.set(cacheKey, response.items);

      if (response.items.length > 0 || !options?.preserveExistingOnEmpty) {
        setViewportShops(response.items);
        setSelectedShopId((currentSelectedShopId) => {
          if (currentSelectedShopId && response.items.some((shop) => shop.id === currentSelectedShopId)) {
            return currentSelectedShopId;
          }

          return response.items[0]?.id || null;
        });
      }

      if (response.items.length > 0 && options?.clearErrorOnSuccess) {
        setSearchError(null);
      }

      return response.items.length > 0;
    } catch {
      if (!options?.preserveExistingOnEmpty) {
        setViewportShops([]);
      }

      return false;
    } finally {
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

      setSearchResults(response.items);
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

  async function applyAreaSearch(query: string, label?: string, placeId?: string): Promise<boolean> {
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
        setSearchError('No encontramos barberias visibles en esta zona todavia. Mueve el mapa para seguir explorando.');
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

    await applyAreaSearch(searchQuery.trim() || suggestion.label, suggestion.label, suggestion.placeId);
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
  const mobileViewportContentHeight = isMobileViewport && mobileViewportHeight ? mobileViewportHeight : null;
  const mobileSheetHeight = mobileViewportContentHeight ? Math.max(mobileViewportContentHeight - 16, 0) : null;
  const mobileSheetStyle = isMobileViewport
    ? {
        transform: `translateY(calc(${getMobileSheetStageTranslate(mobileSheetStage, mobileSheetHeight)}% + ${mobileSheetDragOffset}px))`,
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
      : 'h-[20rem] rounded-[2rem] border border-white/70 bg-white/88 p-2 shadow-[0_24px_44px_-30px_rgba(15,23,42,0.22)] md:h-[26rem] dark:border-white/10 dark:bg-slate-950/78 xl:h-[calc(100vh-8rem)] xl:min-h-[44rem]',
  );
  const mobileSheetClassName = cn(
    'pointer-events-auto relative z-10',
    isMobileViewport
      ? 'mobile-marketplace-sheet flex w-full h-[calc(100svh-9.5rem)] max-h-[calc(100svh-9.5rem)] flex-col rounded-t-[2.25rem] rounded-b-none border border-slate-200 bg-white shadow-[0_-28px_48px_-32px_rgba(15,23,42,0.32)] dark:border-white/10 dark:bg-slate-950'
      : 'relative z-10 rounded-[2.25rem] border border-white/70 bg-white/95 p-4 shadow-[0_-28px_48px_-32px_rgba(15,23,42,0.32)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/94 xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none xl:backdrop-blur-0',
    !isMobileViewport && '-mt-14 xl:mt-0',
    !isMobileSheetDragging && isMobileViewport && 'transition-transform duration-300 ease-out',
  );

  return (
    <div
      ref={mobileStageRef}
      className="relative -mx-4 -mb-16 -mt-5 flex h-[calc(100dvh-4.75rem)] flex-col gap-4 overflow-hidden sm:-mx-6 md:-mb-[4.5rem] md:-mt-7 xl:mx-0 xl:mb-0 xl:mt-0 xl:grid xl:h-auto xl:min-h-0 xl:overflow-visible xl:grid-cols-[minmax(0,1.02fr)_minmax(28rem,0.98fr)] xl:gap-6 xl:items-start"
      style={mobileStageStyle}
    >
      <div className="pointer-events-none absolute inset-0 z-20 flex items-end overflow-hidden xl:pointer-events-auto xl:relative xl:inset-auto xl:block xl:overflow-visible xl:order-1 xl:pr-4">
        <div className="hidden space-y-5 xl:block">
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

          <form className="soft-panel relative z-30 rounded-[1.8rem] p-4" onSubmit={handleSearchSubmit}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="hero-eyebrow">
                <Sparkles className="h-3.5 w-3.5" />
                Busca como en un mapa
              </div>
              {showResetSearch ? (
                <button
                  type="button"
                  onClick={clearSearchResults}
                  className="meta-chip transition hover:bg-white/80 dark:hover:bg-white/[0.08]"
                >
                  Limpiar busqueda
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="places-search-shell relative z-40">
                <div className="places-search-input-shell" data-open={showSuggestions ? 'true' : 'false'}>
                  <Search className="places-search-icon h-4 w-4" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      const hasValue = nextValue.trim().length > 0;

                      suggestionsRequestIdRef.current += 1;
                      setIsSearchFocused(true);
                      setSearchQuery(nextValue);
                      setSuggestions([]);
                      setIsSearching(hasValue);
                    }}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => {
                      window.setTimeout(() => setIsSearchFocused(false), 120);
                    }}
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
                        <button
                          key={suggestion.key}
                          type="button"
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
                        </button>
                      ))
                    ) : (
                      <p className="places-search-empty">No encontramos sugerencias. Presiona Buscar para intentar igual.</p>
                    )}
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                className="action-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold"
                disabled={isApplyingSearch}
              >
                {isApplyingSearch ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </button>
            </div>

            {searchError ? <p className="status-banner warning mt-3">{searchError}</p> : null}
          </form>
        </div>

        <div ref={mobileSheetRef} className={mobileSheetClassName} style={mobileSheetStyle}>
          <div
            className="mobile-sheet-surface absolute inset-x-0 top-0 z-10 flex h-7 cursor-grab touch-none justify-center pt-3 select-none active:cursor-grabbing xl:hidden"
            onPointerDown={handleMobileSheetDragStart}
          >
            <div className="h-1.5 w-14 rounded-full bg-black/20 dark:bg-white/20" />
          </div>

          <div
            className={cn(
              'mobile-sheet-surface relative z-10 xl:hidden cursor-grab touch-none select-none active:cursor-grabbing',
              mobileSheetStage === 'collapsed'
                ? 'h-[5.25rem] px-4 py-0 flex items-center justify-center'
                : 'px-4 pb-3 pt-7',
            )}
            onPointerDown={handleMobileSheetDragStart}
          >
            {mobileSheetStage === 'collapsed' ? (
              <p className="whitespace-nowrap text-base font-semibold leading-none text-ink dark:text-slate-100">
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
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{resultDescription}</p>
              </div>
            )}
            {mobileSheetStage !== 'collapsed' && showResetSearch ? (
              <button
                type="button"
                onClick={clearSearchResults}
                onPointerDown={(event) => event.stopPropagation()}
                className="meta-chip mt-3 transition hover:bg-white/80 dark:hover:bg-white/[0.08]"
              >
                Limpiar busqueda
              </button>
            ) : null}
            {mobileSheetStage !== 'collapsed' && searchError ? <p className="status-banner warning mt-3">{searchError}</p> : null}
          </div>

          <div
            className={cn(
              isMobileViewport
                ? 'mobile-sheet-surface mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-24 pt-5'
                : 'mt-5',
              isMobileViewport && mobileSheetStage === 'collapsed' && 'pointer-events-none opacity-0',
            )}
          >
        {showCardSkeletons ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: MARKETPLACE_CARD_SKELETON_COUNT }).map((_, index) => (
              <Card
                key={`shop-skeleton-${index}`}
                className="data-card overflow-hidden rounded-[1.9rem] border-0 p-0 shadow-none ring-1 ring-white/10"
              >
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <CardBody className="space-y-4 p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-2/3 rounded-xl" />
                    <Skeleton className="h-3 w-full rounded-xl" />
                    <Skeleton className="h-3 w-5/6 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full rounded-xl" />
                    <Skeleton className="h-3 w-4/5 rounded-xl" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-7 w-24 rounded-full" />
                    <Skeleton className="h-7 w-24 rounded-full" />
                    <Skeleton className="h-7 w-28 rounded-full" />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Skeleton className="h-10 w-24 rounded-2xl" />
                    <Skeleton className="h-10 w-28 rounded-2xl" />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : filteredShops.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredShops.map(({ shop, distanceKm }) => {
              const isActive = shop.id === selectedShop?.id;

              return (
                <Card
                  key={shop.id}
                  as="article"
                  isFooterBlurred
                  className={cn(
                    'data-card group h-[22rem] cursor-pointer overflow-hidden rounded-[1.9rem] border-0 p-0 shadow-none transition-transform duration-200 md:hover:-translate-y-1',
                    isActive
                      ? 'ring-2 ring-sky-400/35 dark:ring-sky-300/25'
                      : 'ring-1 ring-transparent',
                  )}
                  data-active={String(isActive)}
                  onClick={() => focusShop(shop)}
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
                    imageClassName="transition-transform duration-300 md:group-hover:scale-[1.03]"
                    dotsClassName="bottom-[7.1rem]"
                    fallback={<div className="h-full w-full" style={getFallbackCoverStyle(shop)} />}
                  />

                  <div className="absolute inset-0 z-[1] bg-gradient-to-t from-slate-950/88 via-slate-950/28 to-slate-950/10" />

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
                        <Link
                          href={buildShopHref(shop.slug)}
                          className="action-secondary rounded-full px-4 py-2 text-sm font-semibold"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Ver perfil
                        </Link>
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
            })}
          </div>
        ) : (
          <Card className="soft-panel rounded-[1.8rem] border-0 shadow-none">
            <CardBody className="p-5">
              <p className="text-sm text-slate/80 dark:text-slate-300">
                {activeSearchMode === 'all'
                  ? 'Aun no hay barberias visibles en esta vista.'
                  : 'No encontramos barberias para esa busqueda. Prueba con otra zona o limpia la busqueda.'}
              </p>
            </CardBody>
          </Card>
        )}
      </div>
      </div>
      </div>

      <div className="order-1 h-full min-h-0 xl:order-2 xl:h-auto xl:sticky xl:top-[6.25rem] xl:self-start xl:w-full">
        <div className={mobileMapShellClassName}>
          <div className="pointer-events-none absolute inset-x-3 top-3 z-20 xl:hidden">
            <form
              className="pointer-events-auto rounded-[1.7rem] border border-white/75 bg-white/94 p-3 shadow-[0_20px_42px_-28px_rgba(15,23,42,0.32)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/92"
              onSubmit={handleSearchSubmit}
            >
              <div className="flex items-center gap-2">
                <div className="places-search-shell relative z-40 min-w-0 flex-1">
                  <div className="places-search-input-shell" data-open={showSuggestions ? 'true' : 'false'}>
                    <Search className="places-search-icon h-4 w-4" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        const hasValue = nextValue.trim().length > 0;

                        suggestionsRequestIdRef.current += 1;
                        setIsSearchFocused(true);
                        setSearchQuery(nextValue);
                        setSuggestions([]);
                        setIsSearching(hasValue);
                      }}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => {
                        window.setTimeout(() => setIsSearchFocused(false), 120);
                      }}
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
                          <button
                            key={suggestion.key}
                            type="button"
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
                          </button>
                        ))
                      ) : (
                        <p className="places-search-empty">
                          No encontramos sugerencias. Presiona Buscar para intentar igual.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="action-primary inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                  disabled={isApplyingSearch}
                  aria-label="Buscar"
                >
                  {isApplyingSearch ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
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

          <div className="hidden xl:block">
            <div className="map-overlay-chip">
              <span>Marketplace Uruguay</span>
              <span>{activePins} pins</span>
            </div>
          </div>

          {mapPreviewShop ? (
            <div className="pointer-events-none absolute inset-x-3 top-[5.35rem] z-30 xl:inset-x-auto xl:bottom-4 xl:left-4 xl:right-auto xl:top-auto xl:max-w-[24rem]">
              <Card isFooterBlurred className="soft-panel pointer-events-auto overflow-hidden rounded-[1.7rem] border-0 p-0 shadow-none">
                <CardHeader className="absolute inset-x-0 top-0 z-10 items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
                      {getShopHighlight(mapPreviewShop, mapPreviewDistanceKm)}
                    </p>
                    <h3 className="mt-2 line-clamp-1 font-[family-name:var(--font-heading)] text-lg font-semibold text-white">
                      {mapPreviewShop.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-ink shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)] dark:bg-slate-950/90 dark:text-slate-100">
                      <Star className="mr-1 inline h-3.5 w-3.5 fill-current text-amber-500" />
                      {formatRating(mapPreviewShop.averageRating)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMapPreviewShopId(null)}
                      aria-label="Cerrar vista previa"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-ink shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)] transition hover:bg-white dark:bg-slate-950/90 dark:text-slate-100 dark:hover:bg-slate-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>

                <MediaShowcase
                  alt={`Vista de ${mapPreviewShop.name}`}
                  images={mapPreviewShop.imageUrls}
                  className="aspect-[16/10] w-full"
                  dotsClassName="bottom-[1.1rem]"
                  fallback={<div className="h-full w-full" style={getFallbackCoverStyle(mapPreviewShop)} />}
                />

                <div className="absolute inset-x-0 top-0 h-[40%] z-[1] bg-gradient-to-b from-slate-950/62 to-transparent" />

                <CardBody className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-ink dark:text-slate-100">{mapPreviewShop.name}</p>
                      <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                        {getLocationSummary(mapPreviewShop)}
                      </p>
                    </div>
                    {mapPreviewDistanceKm !== null ? (
                      <span className="rounded-full bg-sky-500/[0.12] px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-400/[0.12] dark:text-sky-200">
                        {mapPreviewDistanceKm.toFixed(1)} km
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
                    {getShopReviewSummary(mapPreviewShop)}
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Card className="rounded-2xl border-0 bg-white/70 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.24)] dark:bg-white/[0.06]">
                      <CardBody className="px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                          Reputacion
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                          {formatRating(mapPreviewShop.averageRating)} ({mapPreviewShop.reviewCount || 0})
                        </p>
                      </CardBody>
                    </Card>
                    <Card className="rounded-2xl border-0 bg-white/70 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.24)] dark:bg-white/[0.06]">
                      <CardBody className="px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                          Servicios
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                          {mapPreviewShop.activeServiceCount} activos
                        </p>
                      </CardBody>
                    </Card>
                  </div>
                </CardBody>

                <CardFooter className="flex flex-wrap gap-3 px-4 pb-4 pt-0">
                  <Link
                    href={buildShopHref(mapPreviewShop.slug)}
                    className="action-secondary rounded-2xl px-4 py-2 text-sm font-semibold"
                  >
                    Ver perfil
                  </Link>
                  <Link
                    href={buildShopHref(mapPreviewShop.slug, 'book')}
                    className="action-primary inline-flex items-center gap-1 rounded-2xl px-4 py-2 text-sm font-semibold"
                  >
                    Reservar
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </CardFooter>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
