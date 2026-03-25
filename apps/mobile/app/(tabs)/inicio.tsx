import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppMenuButton } from '../../components/navigation/app-menu';
import { ActionButton, Chip, MutedText, ThemeToggle } from '../../components/ui/primitives';
import { PlatformQuickLinks } from '../../components/marketing/platform-quick-links';
import {
  hasExternalApi,
  listMarketplaceShopsInViewportViaApi,
  searchMarketplaceShopsViaApi,
} from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import {
  type GeoPoint,
  geocodeMarketplaceArea,
  getDistanceKm,
  getMapTheme,
  getPointRegion,
  getShopRegion,
  openDirectionsToShop,
  openShopInGoogleMaps,
  requestCurrentDeviceLocation,
  URUGUAY_BOUNDS,
  URUGUAY_REGION,
} from '../../lib/maps';
import {
  formatMarketplaceLocation,
  listMarketplaceShops,
  resolvePreferredMarketplaceShopId,
  saveMarketplaceShopId,
  type MarketplaceShop,
} from '../../lib/marketplace';
import { env } from '../../lib/env';
import {
  getMapPinColor,
  getMarketplaceCoverGradient,
  getStatusSurface,
  useNavajaTheme,
  withOpacity,
} from '../../lib/theme';

type MobileSheetStage = 'collapsed' | 'mid' | 'expanded';
type MarketplaceSearchMode = 'all' | 'name' | 'area' | 'nearby';

type ShopSuggestion =
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
    };

interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const MOBILE_SHEET_COLLAPSED_PEEK_PX = 68;
const MOBILE_SHEET_STAGE_TRANSLATE: Record<MobileSheetStage, number> = {
  expanded: 0,
  mid: 42,
  collapsed: 88,
};
const MOBILE_STAGE_VERTICAL_PADDING = 6;
const MOBILE_TAB_BAR_CLEARANCE_PX = 0;
const MOBILE_SHEET_BOTTOM_GAP_PX = 8;
const MOBILE_PREVIEW_BOTTOM_GAP_PX = 16;
const MAP_LOADING_OVERLAY_OPACITY = 0.5;
const SEARCH_SUGGESTION_LIMIT = 8;
const MAP_ANIMATION_DURATION_MS = 280;
const VIEWPORT_DEBOUNCE_MS = 260;
const REMOTE_SUGGESTIONS_TIMEOUT_MS = 1200;
const REMOTE_NAME_SEARCH_TIMEOUT_MS = 1500;
const REMOTE_VIEWPORT_TIMEOUT_MS = 1500;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMobileSheetStageTranslate(stage: MobileSheetStage, sheetHeight?: number | null) {
  if (stage !== 'collapsed') {
    return MOBILE_SHEET_STAGE_TRANSLATE[stage];
  }

  if (!sheetHeight || sheetHeight <= 0) {
    return MOBILE_SHEET_STAGE_TRANSLATE.collapsed;
  }

  const collapsedTranslate = 100 - (MOBILE_SHEET_COLLAPSED_PEEK_PX / sheetHeight) * 100;
  return clamp(collapsedTranslate, 0, 100);
}

function getClosestMobileSheetStage(translatePercent: number, sheetHeight: number) {
  const stages: MobileSheetStage[] = ['expanded', 'mid', 'collapsed'];
  return stages.reduce<MobileSheetStage>((closestStage, stage) => {
    const currentDistance = Math.abs(
      getMobileSheetStageTranslate(closestStage, sheetHeight) - translatePercent,
    );
    const nextDistance = Math.abs(getMobileSheetStageTranslate(stage, sheetHeight) - translatePercent);
    return nextDistance < currentDistance ? stage : closestStage;
  }, 'mid');
}

function formatRating(value: number | null) {
  if (value === null) {
    return 'Nuevo';
  }

  return value.toFixed(1);
}

function normalizeSearchTerm(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getNameMatchScore(shop: MarketplaceShop, query: string) {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) {
    return -1;
  }

  const normalizedName = normalizeSearchTerm(shop.name);
  const normalizedSlug = normalizeSearchTerm(shop.slug).replace(/-/g, ' ');
  let score = -1;

  if (normalizedName === normalizedQuery) {
    score = Math.max(score, 1200);
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    score = Math.max(score, 900);
  }

  if (normalizedName.includes(normalizedQuery)) {
    score = Math.max(score, 700);
  }

  if (normalizedSlug.includes(normalizedQuery)) {
    score = Math.max(score, 620);
  }

  const nameWords = normalizedName.split(/\s+/).filter(Boolean);
  if (nameWords.some((word) => word.startsWith(normalizedQuery))) {
    score = Math.max(score, 560);
  }

  if (score < 0) {
    return -1;
  }

  return score + shop.reviewCount * 2 + (shop.averageRating || 0) * 10;
}

function getAreaFieldMatchScore(field: string, query: string) {
  const normalizedField = normalizeSearchTerm(field);
  const normalizedQuery = normalizeSearchTerm(query);

  if (!normalizedField || !normalizedQuery) {
    return -1;
  }

  if (normalizedField === normalizedQuery) {
    return 950;
  }

  if (normalizedField.startsWith(normalizedQuery)) {
    return 760;
  }

  if (normalizedField.includes(normalizedQuery)) {
    return 620;
  }

  return -1;
}

function getLocalAreaSuggestions(shops: MarketplaceShop[], query: string, limit = 4): ShopSuggestion[] {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) {
    return [];
  }

  const byKey = new Map<
    string,
    {
      label: string;
      score: number;
    }
  >();

  for (const shop of shops) {
    const fields = [shop.locationLabel, shop.city, shop.region];
    for (const field of fields) {
      if (!field) {
        continue;
      }

      const score = getAreaFieldMatchScore(field, normalizedQuery);
      if (score < 0) {
        continue;
      }

      const normalizedField = normalizeSearchTerm(field);
      const finalScore = score + Math.min(shop.reviewCount, 40) + (shop.isVerified ? 20 : 0);
      const current = byKey.get(normalizedField);

      if (!current || finalScore > current.score) {
        byKey.set(normalizedField, {
          label: field,
          score: finalScore,
        });
      }
    }
  }

  return Array.from(byKey.entries())
    .sort((left, right) => right[1].score - left[1].score)
    .slice(0, limit)
    .map(([key, value]) => ({
      key: `area:${key}`,
      type: 'area' as const,
      label: value.label,
      description: 'Buscar barberias en esta zona',
    }));
}

function takeTopShops(entries: Array<{ shop: MarketplaceShop; score: number }>, limit: number) {
  return entries
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.shop);
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

function getApproximateZoom(region: Region) {
  const delta = Math.max(region.longitudeDelta, 0.0001);
  return Math.max(1, Math.round(Math.log2(360 / delta)));
}

function getViewportBounds(region: Region): ViewportBounds {
  const halfLatitude = Math.max(region.latitudeDelta / 2, 0);
  const halfLongitude = Math.max(region.longitudeDelta / 2, 0);
  const north = region.latitude + halfLatitude;
  const south = region.latitude - halfLatitude;
  const east = region.longitude + halfLongitude;
  const west = region.longitude - halfLongitude;
  const latitudeSpan = Math.max(0, north - south);
  const longitudeSpan = Math.max(0, east - west);
  const latitudePadding = Math.min(Math.max(latitudeSpan * 0.08, 0.003), 0.03);
  const longitudePadding = Math.min(Math.max(longitudeSpan * 0.08, 0.003), 0.03);

  return {
    north: Math.min(north + latitudePadding, URUGUAY_BOUNDS.north),
    south: Math.max(south - latitudePadding, URUGUAY_BOUNDS.south),
    west: Math.max(west - longitudePadding, URUGUAY_BOUNDS.west),
    east: Math.min(east + longitudePadding, URUGUAY_BOUNDS.east),
  };
}

function getViewportCacheKey(bounds: ViewportBounds, zoom: number) {
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

function isLikelyShopQuery(query: string, suggestion: ShopSuggestion | null) {
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
    return 'Perfil nuevo en el marketplace. Ideal para descubrir una propuesta reciente.';
  }

  if ((shop.averageRating || 0) >= 4.8) {
    return `Clientes destacan constancia y experiencia. ${shop.reviewCount} resenas verificadas disponibles.`;
  }

  if ((shop.averageRating || 0) >= 4.5) {
    return `Muy bien valorada por clientes frecuentes. ${shop.reviewCount} resenas verificadas para comparar con confianza.`;
  }

  return `${shop.reviewCount} resenas verificadas publicadas en su perfil.`;
}

function getFallbackCoverGradient(
  shop: MarketplaceShop,
  colors: ReturnType<typeof useNavajaTheme>['colors'],
) {
  return getMarketplaceCoverGradient(colors, shop.name);
}

function haveSameShopOrder(left: MarketplaceShop[], right: MarketplaceShop[]) {
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

function getViewportContext(region: Region) {
  const zoom = getApproximateZoom(region);
  const bounds = getViewportBounds(region);
  const cacheKey = getViewportCacheKey(bounds, zoom);
  const limit = getViewportFetchLimit(zoom);

  return {
    zoom,
    bounds,
    cacheKey,
    limit,
  };
}

export default function InicioScreen() {
  const { colors } = useNavajaTheme();
  const successTone = getStatusSurface(colors, 'success');
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const mapRef = useRef<MapView | null>(null);
  const viewportCacheRef = useRef<Map<string, MarketplaceShop[]>>(new Map());
  const viewportRequestIdRef = useRef(0);
  const areaSearchRequestIdRef = useRef(0);
  const suggestionsRequestIdRef = useRef(0);
  const viewportDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRegionRef = useRef<Region | null>(null);

  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [viewportShops, setViewportShops] = useState<MarketplaceShop[]>([]);
  const [searchResults, setSearchResults] = useState<MarketplaceShop[] | null>(null);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [mapPreviewShopId, setMapPreviewShopId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchLabel, setActiveSearchLabel] = useState<string | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<ShopSuggestion[]>([]);
  const [searchMode, setSearchMode] = useState<MarketplaceSearchMode>('all');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isApplyingSearch, setIsApplyingSearch] = useState(false);
  const [isViewportLoading, setIsViewportLoading] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mobileSheetStage, setMobileSheetStage] = useState<MobileSheetStage>('collapsed');
  const [mobileSheetDragOffset, setMobileSheetDragOffset] = useState(0);
  const [brokenCovers, setBrokenCovers] = useState<Record<string, boolean>>({});
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        setLoading(true);
        setError(null);
        setSearchError(null);
        setSearchMode('all');
        setActiveSearchLabel(null);
        setSearchResults(null);
        setViewportShops([]);
        setSearchSuggestions([]);
        setIsSearching(false);
        viewportCacheRef.current.clear();
        viewportRequestIdRef.current += 1;
        areaSearchRequestIdRef.current += 1;
        suggestionsRequestIdRef.current += 1;

        const marketplaceShops = await listMarketplaceShops();

        if (!active) {
          return;
        }

        setShops(marketplaceShops);
        if (marketplaceShops.length === 0) {
          setError('No hay barberias activas para mostrar en el marketplace.');
        }

        const preferredShopId = await resolvePreferredMarketplaceShopId(marketplaceShops);
        if (!active) {
          return;
        }

        setSelectedShopId(preferredShopId);
        setMapPreviewShopId(null);
        setLoading(false);
      })().catch(() => {
        if (!active) {
          return;
        }

        setLoading(false);
        setError(
          'No se pudo cargar el marketplace. Revisa conexion y variables de entorno de mobile.',
        );
      });

      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    setIsMapReady(false);
  }, [colors.mode]);

  const displayedShops = useMemo(() => {
    if (searchMode === 'name') {
      return searchResults || [];
    }

    return viewportShops;
  }, [searchMode, searchResults, viewportShops]);

  const filteredShops = useMemo(() => {
    const withDistance = displayedShops.map((shop) => {
      const distanceKm =
        userLocation && shop.latitude != null && shop.longitude != null
          ? getDistanceKm(userLocation.latitude, userLocation.longitude, shop.latitude, shop.longitude)
          : null;

      return { shop, distanceKm };
    });

    return withDistance.sort((left, right) => {
      if (left.distanceKm != null && right.distanceKm != null) {
        return left.distanceKm - right.distanceKm;
      }

      if (left.distanceKm != null) {
        return -1;
      }

      if (right.distanceKm != null) {
        return 1;
      }

      const leftScore = (left.shop.averageRating || 0) * 100 + left.shop.reviewCount;
      const rightScore = (right.shop.averageRating || 0) * 100 + right.shop.reviewCount;
      return rightScore - leftScore;
    });
  }, [displayedShops, userLocation]);

  const selectedShopEntry = useMemo(() => {
    const inFiltered = filteredShops.find((entry) => entry.shop.id === selectedShopId);
    if (inFiltered) {
      return inFiltered;
    }

    if (selectedShopId) {
      const fallback = shops.find((shop) => shop.id === selectedShopId);
      if (fallback) {
        const distanceKm =
          userLocation && fallback.latitude != null && fallback.longitude != null
            ? getDistanceKm(
                userLocation.latitude,
                userLocation.longitude,
                fallback.latitude,
                fallback.longitude,
              )
            : null;
        return { shop: fallback, distanceKm };
      }
    }

    return filteredShops[0] || (shops[0] ? { shop: shops[0], distanceKm: null } : null);
  }, [filteredShops, selectedShopId, shops, userLocation]);

  const mapPreviewShopEntry = useMemo(() => {
    if (!mapPreviewShopId) {
      return null;
    }

    const inFiltered = filteredShops.find((entry) => entry.shop.id === mapPreviewShopId);
    if (inFiltered) {
      return inFiltered;
    }

    const fallback = shops.find((shop) => shop.id === mapPreviewShopId);
    if (!fallback) {
      return null;
    }

    const distanceKm =
      userLocation && fallback.latitude != null && fallback.longitude != null
        ? getDistanceKm(userLocation.latitude, userLocation.longitude, fallback.latitude, fallback.longitude)
        : null;
    return { shop: fallback, distanceKm };
  }, [filteredShops, mapPreviewShopId, shops, userLocation]);

  const selectedShop = selectedShopEntry?.shop || null;
  const mapPreviewShop = mapPreviewShopEntry?.shop || null;
  const mapPreviewDistanceKm = mapPreviewShopEntry?.distanceKm ?? null;
  const mappableShops = useMemo(
    () => filteredShops.map((entry) => entry.shop).filter((shop) => shop.latitude != null && shop.longitude != null),
    [filteredShops],
  );

  const activePins = mappableShops.length;
  const showSuggestions = isSearchFocused && searchQuery.trim().length > 0;
  const showResetSearch = (searchMode !== 'all' || Boolean(activeSearchLabel)) && !isApplyingSearch;
  const mobileCollapsedCountLabel = `${filteredShops.length} ${
    filteredShops.length === 1 ? 'barberia' : 'barberias'
  } en esta zona`;

  const resultHeadline =
    searchMode === 'nearby'
      ? `${filteredShops.length} barberias cerca de ti`
      : searchMode === 'name' && activeSearchLabel
        ? `${filteredShops.length} barberias para ${activeSearchLabel}`
        : activeSearchLabel
          ? `${filteredShops.length} barberias en ${activeSearchLabel}`
          : filteredShops.length > 0
            ? `${filteredShops.length} barberias dentro del area del mapa`
            : 'Explora barberias dentro del area del mapa';
  const resultDescription =
    searchMode === 'name'
      ? 'Resultados directos por nombre de barberia.'
      : 'Compara reputacion, perfil y disponibilidad antes de reservar.';

  const initialMapRegion = useMemo(() => {
    if (selectedShop?.latitude != null && selectedShop.longitude != null) {
      return getShopRegion(selectedShop);
    }

    if (userLocation) {
      return getPointRegion(userLocation);
    }

    return URUGUAY_REGION;
  }, [selectedShop, userLocation]);

  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  const usesGoogleMapsProvider =
    Boolean(env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) && (Platform.OS === 'android' || !isExpoGo);
  const platformMapThemeProps = useMemo(
    () =>
      Platform.OS === 'ios' && !usesGoogleMapsProvider
        ? { userInterfaceStyle: colors.mode as 'light' | 'dark' }
        : {},
    [colors.mode, usesGoogleMapsProvider],
  );
  const mapType = useMemo(
    () =>
      Platform.OS === 'ios' && colors.mode === 'dark' && !usesGoogleMapsProvider
        ? 'mutedStandard'
        : 'standard',
    [colors.mode, usesGoogleMapsProvider],
  );
  const mapCustomStyle = useMemo(() => {
    if (Platform.OS === 'ios' && !usesGoogleMapsProvider) {
      return undefined;
    }

    return getMapTheme(colors.mode);
  }, [colors.mode, usesGoogleMapsProvider]);
  const mobileTabClearance = useMemo(
    () => insets.bottom + MOBILE_TAB_BAR_CLEARANCE_PX,
    [insets.bottom],
  );
  const mobileSheetBottomOffset = useMemo(
    () => mobileTabClearance + MOBILE_SHEET_BOTTOM_GAP_PX,
    [mobileTabClearance],
  );
  const mapPreviewBottom = useMemo(
    () => mobileTabClearance + MOBILE_PREVIEW_BOTTOM_GAP_PX,
    [mobileTabClearance],
  );

  const mobileViewportContentHeight = useMemo(
    () =>
      Math.max(
        420,
        Math.round(
          viewportHeight - insets.top - mobileSheetBottomOffset - MOBILE_STAGE_VERTICAL_PADDING,
        ),
      ),
    [insets.top, mobileSheetBottomOffset, viewportHeight],
  );
  const mobileSheetHeight = useMemo(() => Math.max(mobileViewportContentHeight - 16, 0), [mobileViewportContentHeight]);
  const shouldHideMobileSheetForMapPreview = Boolean(mapPreviewShop);

  const sheetStageTranslatePercent = useMemo(
    () => getMobileSheetStageTranslate(mobileSheetStage, mobileSheetHeight),
    [mobileSheetHeight, mobileSheetStage],
  );
  const collapsedTranslatePercent = useMemo(
    () => getMobileSheetStageTranslate('collapsed', mobileSheetHeight),
    [mobileSheetHeight],
  );
  const sheetMinOffset = useMemo(
    () => (-sheetStageTranslatePercent / 100) * mobileSheetHeight,
    [mobileSheetHeight, sheetStageTranslatePercent],
  );
  const sheetMaxOffset = useMemo(
    () => ((collapsedTranslatePercent - sheetStageTranslatePercent) / 100) * mobileSheetHeight,
    [collapsedTranslatePercent, mobileSheetHeight, sheetStageTranslatePercent],
  );
  const sheetTranslateY = useMemo(() => {
    if (shouldHideMobileSheetForMapPreview) {
      return mobileSheetHeight + 24;
    }

    const basePx = (sheetStageTranslatePercent / 100) * mobileSheetHeight;
    return clamp(basePx + mobileSheetDragOffset, 0, mobileSheetHeight);
  }, [
    mobileSheetDragOffset,
    mobileSheetHeight,
    sheetStageTranslatePercent,
    shouldHideMobileSheetForMapPreview,
  ]);

  useEffect(() => {
    if (!filteredShops.length) {
      setSelectedShopId('');
      setMapPreviewShopId(null);
      return;
    }

    const hasActiveShop = filteredShops.some((entry) => entry.shop.id === selectedShopId);
    if (!hasActiveShop) {
      setSelectedShopId(filteredShops[0]?.shop.id || '');
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
    return () => {
      if (viewportDebounceRef.current) {
        clearTimeout(viewportDebounceRef.current);
      }
    };
  }, []);

  async function selectShop(shopId: string) {
    setSelectedShopId(shopId);
    await saveMarketplaceShopId(shopId);
  }

  function setMobileSheetSnap(nextStage: MobileSheetStage) {
    setMobileSheetStage(nextStage);
    setMobileSheetDragOffset(0);
  }

  function markCoverAsBroken(shopId: string) {
    setBrokenCovers((current) => {
      if (current[shopId]) {
        return current;
      }

      return {
        ...current,
        [shopId]: true,
      };
    });
  }

  function getActiveRegion() {
    return latestRegionRef.current || initialMapRegion;
  }

  function getLocalViewportShops(bounds: ViewportBounds, limit: number) {
    return shops
      .filter((shop) => {
        if (shop.latitude == null || shop.longitude == null) {
          return false;
        }

        const latitude = Number(shop.latitude);
        const longitude = Number(shop.longitude);
        return (
          latitude >= bounds.south &&
          latitude <= bounds.north &&
          longitude >= bounds.west &&
          longitude <= bounds.east
        );
      })
      .slice(0, limit);
  }

  async function fetchViewportShopsForRegion(region: Region) {
    const { bounds, cacheKey, limit } = getViewportContext(region);
    const cached = viewportCacheRef.current.get(cacheKey);
    if (cached) {
      return {
        items: cached,
        fromCache: true,
      };
    }

    const localItems = getLocalViewportShops(bounds, limit);
    let items: MarketplaceShop[] = localItems;
    if (hasExternalApi && localItems.length === 0) {
      try {
        const response = await listMarketplaceShopsInViewportViaApi({
          north: bounds.north,
          south: bounds.south,
          east: bounds.east,
          west: bounds.west,
          limit,
          timeoutMs: REMOTE_VIEWPORT_TIMEOUT_MS,
        });
        const remoteItems = response?.items || [];
        if (remoteItems.length > 0) {
          items = remoteItems;
        }
      } catch {
        items = localItems;
      }
    }

    viewportCacheRef.current.set(cacheKey, items);
    return {
      items,
      fromCache: false,
    };
  }

  async function loadViewportShops(
    region: Region,
    options?: {
      preserveExistingOnEmpty?: boolean;
      clearErrorOnSuccess?: boolean;
    },
  ) {
    const { cacheKey } = getViewportContext(region);
    const hasCached = viewportCacheRef.current.has(cacheKey);
    const requestId = viewportRequestIdRef.current + 1;
    viewportRequestIdRef.current = requestId;
    if (!hasCached) {
      setIsViewportLoading(true);
    }

    try {
      const response = await fetchViewportShopsForRegion(region);
      if (requestId !== viewportRequestIdRef.current) {
        return false;
      }

      if (response.items.length > 0 || !options?.preserveExistingOnEmpty) {
        setViewportShops((current) =>
          haveSameShopOrder(current, response.items) ? current : response.items,
        );
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
      if (requestId === viewportRequestIdRef.current) {
        setIsViewportLoading(false);
      }
    }
  }

  function getLocalNameSearchResults(query: string, limit = 24) {
    return takeTopShops(
      shops.map((shop) => ({
        shop,
        score: getNameMatchScore(shop, query),
      })),
      limit,
    );
  }

  async function fetchShopSuggestions(query: string) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    const localSuggestions = getLocalNameSearchResults(trimmedQuery, 4).map<ShopSuggestion>((shop) => ({
      key: `shop:${shop.id}`,
      type: 'shop',
      label: shop.name,
      description: formatMarketplaceLocation(shop),
      shop,
    }));

    if (!hasExternalApi || localSuggestions.length > 0) {
      return localSuggestions;
    }

    try {
      const response = await searchMarketplaceShopsViaApi({
        query: trimmedQuery,
        intent: 'name',
        limit: 4,
        timeoutMs: REMOTE_SUGGESTIONS_TIMEOUT_MS,
      });
      const items = response?.items || [];
      return items.map<ShopSuggestion>((shop) => ({
        key: `shop:${shop.id}`,
        type: 'shop',
        label: shop.name,
        description: formatMarketplaceLocation(shop),
        shop,
      }));
    } catch {
      return localSuggestions;
    }
  }

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      suggestionsRequestIdRef.current += 1;
      setSearchSuggestions([]);
      setIsSearching(false);
      return;
    }

    const requestId = suggestionsRequestIdRef.current + 1;
    suggestionsRequestIdRef.current = requestId;
    setIsSearching(true);
    const localAreaSuggestions = getLocalAreaSuggestions(shops, trimmedQuery, 4);

    const timeoutId = setTimeout(() => {
      void (async () => {
        const shopSuggestions = await fetchShopSuggestions(trimmedQuery);
        if (requestId !== suggestionsRequestIdRef.current) {
          return;
        }

        const next: ShopSuggestion[] = [
          ...shopSuggestions,
          ...localAreaSuggestions,
          {
            key: `area:${normalizeSearchTerm(trimmedQuery)}`,
            type: 'area',
            label: trimmedQuery,
            description: 'Buscar barberias en esta zona',
          },
        ];
        setSearchSuggestions(next.slice(0, SEARCH_SUGGESTION_LIMIT));
        setIsSearching(false);
      })().catch(() => {
        if (requestId !== suggestionsRequestIdRef.current) {
          return;
        }

        setSearchSuggestions([
          {
            key: `area:${normalizeSearchTerm(trimmedQuery)}`,
            type: 'area',
            label: trimmedQuery,
            description: 'Buscar barberias en esta zona',
          },
        ]);
        setIsSearching(false);
      });
    }, 180);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery, shops]);

  function clearSearchResults() {
    areaSearchRequestIdRef.current += 1;
    viewportRequestIdRef.current += 1;
    suggestionsRequestIdRef.current += 1;
    setSearchMode('all');
    setActiveSearchLabel(null);
    setSearchQuery('');
    setSearchResults(null);
    setSearchSuggestions([]);
    setIsSearching(false);
    setSearchError(null);
    setIsSearchFocused(false);
    setMapPreviewShopId(null);
    setMobileSheetSnap('collapsed');

    const region = getActiveRegion();
    void loadViewportShops(region, {
      preserveExistingOnEmpty: false,
      clearErrorOnSuccess: true,
    });
  }

  async function applyNamedSearch(query: string, label?: string): Promise<boolean> {
    areaSearchRequestIdRef.current += 1;
    viewportRequestIdRef.current += 1;
    suggestionsRequestIdRef.current += 1;

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      clearSearchResults();
      return false;
    }

    setIsApplyingSearch(true);
    setIsViewportLoading(false);
    setSearchMode('name');
    setActiveSearchLabel(label || trimmedQuery);
    setSearchResults(null);
    setSearchSuggestions([]);
    setIsSearching(false);
    setSearchError(null);
    setMapPreviewShopId(null);
    setMobileSheetSnap('mid');

    try {
      let items: MarketplaceShop[] = getLocalNameSearchResults(trimmedQuery);

      if (items.length === 0 && hasExternalApi) {
        try {
          const response = await searchMarketplaceShopsViaApi({
            query: trimmedQuery,
            intent: 'name',
            timeoutMs: REMOTE_NAME_SEARCH_TIMEOUT_MS,
          });
          const remoteItems = response?.items || [];
          if (remoteItems.length > 0) {
            items = remoteItems;
          }
        } catch {
          items = getLocalNameSearchResults(trimmedQuery);
        }
      }

      setSearchResults(items);
      const topResult = items[0] || null;
      setSelectedShopId(topResult?.id || '');

      if (topResult) {
        void selectShop(topResult.id);
        setMapPreviewShopId(topResult.id);
        setMobileSheetSnap('collapsed');

        if (topResult.latitude != null && topResult.longitude != null) {
          const nextRegion = getShopRegion(topResult);
          latestRegionRef.current = nextRegion;
          mapRef.current?.animateToRegion(nextRegion, MAP_ANIMATION_DURATION_MS);
        }
      }

      if (items.length === 0) {
        setSearchError('No encontramos barberias con ese nombre.');
      }
      return items.length > 0;
    } catch (nextError) {
      setSearchError(
        nextError instanceof Error ? nextError.message : 'No se pudo completar la busqueda.',
      );
      return false;
    } finally {
      setIsApplyingSearch(false);
    }
  }

  async function applyAreaSearch(query: string, label?: string) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      clearSearchResults();
      return false;
    }

    const requestId = areaSearchRequestIdRef.current + 1;
    areaSearchRequestIdRef.current = requestId;
    viewportRequestIdRef.current += 1;
    suggestionsRequestIdRef.current += 1;

    setIsApplyingSearch(true);
    setSearchMode('area');
    setActiveSearchLabel(label || trimmedQuery);
    setSearchResults(null);
    setSearchSuggestions([]);
    setIsSearching(false);
    setSearchError(null);
    setMapPreviewShopId(null);
    setMobileSheetSnap('collapsed');

    try {
      const geocodedRegion = await geocodeMarketplaceArea(trimmedQuery);
      if (!geocodedRegion) {
        if (requestId === areaSearchRequestIdRef.current) {
          setSearchError('No se pudo ubicar esa zona.');
        }
        return false;
      }

      if (requestId !== areaSearchRequestIdRef.current) {
        return false;
      }

      latestRegionRef.current = geocodedRegion;
      mapRef.current?.animateToRegion(geocodedRegion, MAP_ANIMATION_DURATION_MS);

      const hasResults = await loadViewportShops(geocodedRegion, {
        preserveExistingOnEmpty: false,
        clearErrorOnSuccess: true,
      });

      if (requestId !== areaSearchRequestIdRef.current) {
        return false;
      }

      if (!hasResults) {
        setSearchError(
          'No encontramos barberias visibles en esta zona todavia. Mueve el mapa para seguir explorando.',
        );
      }

      return true;
    } catch {
      if (requestId === areaSearchRequestIdRef.current) {
        setSearchError('No se pudo buscar esa zona.');
      }
      return false;
    } finally {
      if (requestId === areaSearchRequestIdRef.current) {
        setIsApplyingSearch(false);
      }
    }
  }

  function focusShop(
    shop: MarketplaceShop,
    options?: {
      openPreview?: boolean;
    },
  ) {
    void selectShop(shop.id);

    setMapPreviewShopId((currentPreviewShopId) => {
      if (!options?.openPreview) {
        return null;
      }

      return currentPreviewShopId === shop.id ? null : shop.id;
    });

    if (options?.openPreview) {
      setMobileSheetSnap('collapsed');
    }

    if (shop.latitude == null || shop.longitude == null || !mapRef.current) {
      return;
    }

    mapRef.current.animateToRegion(getShopRegion(shop), MAP_ANIMATION_DURATION_MS);
  }

  async function handleSuggestionPress(suggestion: ShopSuggestion) {
    suggestionsRequestIdRef.current += 1;
    setSearchQuery(suggestion.label);
    setIsSearchFocused(false);
    setSearchError(null);
    setSearchSuggestions([]);
    setIsSearching(false);

    if (suggestion.type === 'shop') {
      await applyNamedSearch(suggestion.shop.name, suggestion.shop.name);
      return;
    }

    await applyAreaSearch(searchQuery.trim() || suggestion.label, suggestion.label);
  }

  async function handleSearchSubmit() {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      clearSearchResults();
      return;
    }

    setIsSearchFocused(false);

    const topShopSuggestion = searchSuggestions.find((item) => item.type === 'shop') || null;
    const topAreaSuggestion = searchSuggestions.find((item) => item.type === 'area') || null;

    if (isLikelyShopQuery(trimmedQuery, topShopSuggestion)) {
      await applyNamedSearch(trimmedQuery, trimmedQuery);
      return;
    }

    if (topShopSuggestion && topShopSuggestion.type === 'shop') {
      const hasNameResults = await applyNamedSearch(trimmedQuery, topShopSuggestion.shop.name);
      if (hasNameResults) {
        return;
      }
    }

    if (topAreaSuggestion && topAreaSuggestion.type === 'area') {
      await applyAreaSearch(trimmedQuery, topAreaSuggestion.label);
      setSearchQuery(topAreaSuggestion.label);
      return;
    }

    const areaSearchApplied = await applyAreaSearch(trimmedQuery, trimmedQuery);
    if (areaSearchApplied) {
      return;
    }

    await applyNamedSearch(trimmedQuery, trimmedQuery);
  }

  async function handleReserveAtShop(shop: MarketplaceShop) {
    await selectShop(shop.id);
    router.push('/(tabs)/reservas');
  }

  async function handleCoursesAtShop(shop: MarketplaceShop) {
    await selectShop(shop.id);
    router.push('/(tabs)/cursos');
  }

  async function handleDirectionsToShop(shop: MarketplaceShop) {
    setLocationError(null);

    let resolvedUserLocation = userLocation;
    if (!resolvedUserLocation) {
      const result = await requestCurrentDeviceLocation();
      if (!result.coords) {
        setLocationError(result.error || 'No se pudo obtener tu ubicacion para calcular el recorrido.');
      } else {
        resolvedUserLocation = result.coords;
        setUserLocation(result.coords);
      }
    }

    await openDirectionsToShop(shop, resolvedUserLocation || null);
  }

  useEffect(() => {
    if (!isMapReady || searchMode === 'name') {
      return;
    }

    const nextRegion = getActiveRegion();
    latestRegionRef.current = nextRegion;
    void loadViewportShops(nextRegion, {
      preserveExistingOnEmpty: false,
      clearErrorOnSuccess: true,
    });
  }, [isMapReady, searchMode, shops]);

  function handleRegionChangeComplete(nextRegion: Region) {
    latestRegionRef.current = nextRegion;

    if (!isMapReady || searchMode === 'name') {
      return;
    }

    if (viewportDebounceRef.current) {
      clearTimeout(viewportDebounceRef.current);
    }

    viewportDebounceRef.current = setTimeout(() => {
      void loadViewportShops(nextRegion, {
        preserveExistingOnEmpty: false,
        clearErrorOnSuccess: true,
      });
    }, VIEWPORT_DEBOUNCE_MS);
  }

  const sheetDragStateRef = useRef({
    mobileSheetHeight,
    sheetMinOffset,
    sheetMaxOffset,
    sheetStageTranslatePercent,
  });
  useEffect(() => {
    sheetDragStateRef.current = {
      mobileSheetHeight,
      sheetMinOffset,
      sheetMaxOffset,
      sheetStageTranslatePercent,
    };
  }, [mobileSheetHeight, sheetMinOffset, sheetMaxOffset, sheetStageTranslatePercent]);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 3,
      onPanResponderGrant: () => {
        setMobileSheetDragOffset(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const { mobileSheetHeight: h, sheetMinOffset: minO, sheetMaxOffset: maxO } = sheetDragStateRef.current;
        if (h <= 0) return;
        setMobileSheetDragOffset(clamp(gestureState.dy, minO, maxO));
      },
      onPanResponderRelease: (_, gestureState) => {
        const { mobileSheetHeight: h, sheetMinOffset: minO, sheetMaxOffset: maxO, sheetStageTranslatePercent: pct } = sheetDragStateRef.current;
        if (h <= 0) { setMobileSheetDragOffset(0); return; }
        const clampedOffset = clamp(gestureState.dy, minO, maxO);
        const translatePercent = pct + (clampedOffset / h) * 100;
        setMobileSheetDragOffset(0);
        setMobileSheetStage(getClosestMobileSheetStage(translatePercent, h));
      },
      onPanResponderTerminate: (_, gestureState) => {
        const { mobileSheetHeight: h, sheetMinOffset: minO, sheetMaxOffset: maxO, sheetStageTranslatePercent: pct } = sheetDragStateRef.current;
        if (h <= 0) { setMobileSheetDragOffset(0); return; }
        const clampedOffset = clamp(gestureState.dy, minO, maxO);
        const translatePercent = pct + (clampedOffset / h) * 100;
        setMobileSheetDragOffset(0);
        setMobileSheetStage(getClosestMobileSheetStage(translatePercent, h));
      },
    })
  ).current;

  const topOverlayOffset = insets.top + 8;
  const mapChipTop = topOverlayOffset + 138;
  const sheetBodyBottomPadding = 24;

  return (
    <View style={[styles.stage, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.background, colors.backgroundBase]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.mapLayer}>
        <MapView
          key={`market-map-${colors.mode}`}
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={initialMapRegion}
          {...(usesGoogleMapsProvider ? { provider: PROVIDER_GOOGLE } : {})}
          mapType={mapType}
          {...(mapCustomStyle ? { customMapStyle: mapCustomStyle } : {})}
          {...platformMapThemeProps}
          showsCompass={false}
          toolbarEnabled={false}
          onMapReady={() => {
            latestRegionRef.current = getActiveRegion();
            setIsMapReady(true);
          }}
          onRegionChangeComplete={handleRegionChangeComplete}
        >
          {mappableShops.map((shop) => {
            const isActive = shop.id === selectedShop?.id;

            return (
              <Marker
                key={shop.id}
                coordinate={{
                  latitude: Number(shop.latitude),
                  longitude: Number(shop.longitude),
                }}
                title={shop.name}
                description={formatMarketplaceLocation(shop)}
                anchor={{ x: 0.5, y: 1 }}
              pinColor={getMapPinColor(colors, isActive)}
                onPress={() => {
                  focusShop(shop, {
                    openPreview: true,
                  });
                }}
              />
            );
          })}
          {userLocation ? (
            <Marker
              coordinate={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }}
              title="Tu ubicacion"
              pinColor={colors.focus}
            />
          ) : null}
        </MapView>

        {!isMapReady ? (
          <View
            style={[
              styles.mapLoadingOverlay,
              {
                backgroundColor:
                  withOpacity(colors.background, MAP_LOADING_OVERLAY_OPACITY),
              },
            ]}
          >
            <View
              style={[
                styles.mapLoadingPill,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.panelStrong,
                },
              ]}
            >
              <ActivityIndicator color={colors.text} size="small" />
              <Text style={[styles.mapLoadingText, { color: colors.text }]}>Cargando mapa...</Text>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.mapChip,
            {
              top: mapChipTop,
              backgroundColor: colors.panelStrong,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.mapChipText, { color: colors.textMuted }]}>
            Marketplace Uruguay - {activePins} pins{isViewportLoading ? ' - actualizando' : ''}
          </Text>
        </View>
      </View>

      <View style={[styles.searchOverlay, { top: topOverlayOffset }]}>
        <View style={styles.chromeRow}>
          <View
            style={[
              styles.chromeBrand,
              {
                borderColor: colors.border,
                backgroundColor: colors.panelStrong,
              },
            ]}
          >
            <View
              style={[
                styles.chromeLogo,
                {
                  borderColor: colors.borderActive,
                  backgroundColor: colors.pillActive,
                },
              ]}
            >
              <Ionicons name="cut-outline" size={16} color={colors.textAccent} />
            </View>

            <View style={styles.chromeCopy}>
              <Text style={[styles.chromeEyebrow, { color: colors.textMuted }]}>Navaja</Text>
              <Text style={[styles.chromeTitle, { color: colors.text }]}>
                Marketplace barber
              </Text>
            </View>
          </View>

          <View style={styles.chromeActions}>
            <ThemeToggle />
            <AppMenuButton />
          </View>
        </View>

        <View
          style={[
            styles.searchCard,
            {
              borderColor: colors.border,
              backgroundColor: colors.panelStrong,
            },
          ]}
        >
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchInputShell,
                {
                  borderColor: colors.inputBorder,
                  backgroundColor: colors.input,
                },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={(nextValue) => {
                  setIsSearchFocused(true);
                  setSearchQuery(nextValue);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  setTimeout(() => setIsSearchFocused(false), 120);
                }}
                onSubmitEditing={() => {
                  void handleSearchSubmit();
                }}
                placeholder="Buscar zona o barberia"
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
                returnKeyType="search"
              />
            </View>

            <Pressable
              onPress={() => {
                void handleSearchSubmit();
              }}
              style={[
                styles.searchSubmitButton,
                {
                  borderColor: colors.borderMuted,
                  backgroundColor: colors.inverseSurface,
                },
              ]}
            >
              {isApplyingSearch ? (
                <ActivityIndicator color={colors.inverseForeground} size="small" />
              ) : (
                <Ionicons name="search-outline" size={17} color={colors.inverseForeground} />
              )}
            </Pressable>
          </View>

          {showSuggestions ? (
            <View
              style={[
                styles.suggestionsSheet,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.panelStrong,
                },
              ]}
            >
              {searchSuggestions.length ? (
                searchSuggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion.key}
                    onPress={() => {
                      void handleSuggestionPress(suggestion);
                    }}
                    style={styles.suggestionRow}
                  >
                    <Text style={[styles.suggestionLabel, { color: colors.text }]}>{suggestion.label}</Text>
                    <Text style={[styles.suggestionDescription, { color: colors.textMuted }]}>
                      {suggestion.description}
                    </Text>
                  </Pressable>
                ))
              ) : isSearching ? (
                <MutedText>Buscando sugerencias...</MutedText>
              ) : (
                <MutedText>No encontramos sugerencias. Presiona buscar para intentar igual.</MutedText>
              )}
            </View>
          ) : null}
        </View>
      </View>

      {mapPreviewShop ? (
        <View
          style={[
            styles.mapPreviewFloating,
            {
              bottom: mapPreviewBottom,
            },
          ]}
        >
          <View
            style={[
              styles.mapPreviewCard,
              {
                borderColor: colors.border,
                backgroundColor: colors.panelStrong,
              },
            ]}
          >
            <View style={styles.mapPreviewMediaShell}>
              {mapPreviewShop.coverImageUrl && !brokenCovers[mapPreviewShop.id] ? (
                <Image
                  source={{ uri: mapPreviewShop.coverImageUrl }}
                  style={styles.mapPreviewMedia}
                  resizeMode="cover"
                  onError={() => markCoverAsBroken(mapPreviewShop.id)}
                />
              ) : (
                <LinearGradient
                  colors={getFallbackCoverGradient(mapPreviewShop, colors)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.mapPreviewMedia}
                />
              )}

              <View style={styles.mapPreviewTopBar}>
                <Chip
                  label={getShopHighlight(mapPreviewShop, mapPreviewDistanceKm)}
                  tone={mapPreviewShop.isVerified ? 'success' : 'neutral'}
                />

                <Pressable
                  onPress={() => {
                    setMapPreviewShopId(null);
                    setMobileSheetSnap('collapsed');
                  }}
                  style={[
                    styles.previewCloseButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.panelStrong,
                    },
                  ]}
                >
                  <Ionicons name="close" size={17} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <View style={styles.mapPreviewBody}>
              <View style={styles.mapPreviewTitleRow}>
                <View style={styles.mapPreviewTitleBlock}>
                  <Text style={[styles.mapPreviewTitle, { color: colors.text }]}>{mapPreviewShop.name}</Text>
                  <Text style={[styles.mapPreviewMeta, { color: colors.textMuted }]}>
                    {formatMarketplaceLocation(mapPreviewShop)}
                  </Text>
                </View>
                <Text style={[styles.mapPreviewRatingText, { color: colors.text }]}>
                  {formatRating(mapPreviewShop.averageRating)} ({mapPreviewShop.reviewCount})
                </Text>
              </View>

              <Text style={[styles.mapPreviewDescription, { color: colors.textSoft }]} numberOfLines={2}>
                {mapPreviewShop.description || getShopReviewSummary(mapPreviewShop)}
              </Text>

              <View style={styles.mapPreviewFacts}>
                {mapPreviewDistanceKm !== null ? (
                  <Chip label={`${mapPreviewDistanceKm.toFixed(1)} km`} tone="warning" style={styles.metaChip} />
                ) : null}
                <Chip label={`${mapPreviewShop.activeServiceCount} servicios`} tone="neutral" style={styles.metaChip} />
                {mapPreviewShop.minServicePriceCents != null ? (
                  <Chip
                    label={`Desde ${formatCurrency(mapPreviewShop.minServicePriceCents)}`}
                    tone="success"
                    style={styles.metaChip}
                  />
                ) : null}
              </View>

              <View style={styles.mapPreviewActions}>
                <ActionButton
                  label="Reservar"
                  onPress={() => {
                    void handleReserveAtShop(mapPreviewShop);
                  }}
                  style={styles.mapPreviewActionButton}
                />
                <ActionButton
                  label="Ver perfil"
                  variant="secondary"
                  onPress={() => {
                    router.push(`/shops/${mapPreviewShop.slug}`);
                  }}
                  style={styles.mapPreviewActionButton}
                />
              </View>

              <View style={styles.mapPreviewActions}>
                <ActionButton
                  label="Cursos"
                  variant="secondary"
                  onPress={() => {
                    void handleCoursesAtShop(mapPreviewShop);
                  }}
                  style={styles.mapPreviewActionButton}
                />
                <ActionButton
                  label="Abrir mapa"
                  variant="secondary"
                  onPress={() => {
                    void openShopInGoogleMaps(mapPreviewShop);
                  }}
                  style={styles.mapPreviewActionButton}
                />
              </View>

              <View style={styles.mapPreviewActions}>
                <ActionButton
                  label="Como llegar"
                  variant="secondary"
                  onPress={() => {
                    void handleDirectionsToShop(mapPreviewShop);
                  }}
                  style={styles.mapPreviewActionButton}
                />
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.mobileSheet,
          {
            height: mobileSheetHeight,
            bottom: mobileSheetBottomOffset,
            transform: [{ translateY: sheetTranslateY }],
            borderColor: colors.border,
            backgroundColor: colors.panelStrong,
            opacity: shouldHideMobileSheetForMapPreview ? 0 : 1,
          },
        ]}
        pointerEvents={shouldHideMobileSheetForMapPreview ? 'none' : 'auto'}
      >
        <View style={styles.sheetHandleZone} {...sheetPanResponder.panHandlers}>
          <View
            style={[
              styles.sheetHandle,
              { backgroundColor: withOpacity(colors.text, colors.mode === 'dark' ? 0.2 : 0.16) },
            ]}
          />
        </View>

        <Pressable
          style={[
            styles.sheetHeader,
            mobileSheetStage === 'collapsed' ? styles.sheetHeaderCollapsed : styles.sheetHeaderExpanded,
          ]}
          onPress={() => {
            if (mobileSheetStage === 'collapsed') {
              setMobileSheetSnap('mid');
            }
          }}
        >
          {mobileSheetStage === 'collapsed' ? (
            <Text style={[styles.sheetCollapsedTitle, { color: colors.text }]}>{mobileCollapsedCountLabel}</Text>
          ) : (
            <View>
              <View style={styles.sheetTitleRow}>
                <View style={styles.sheetTitleBlock}>
                  <Text style={[styles.sheetEyebrow, { color: colors.textMuted }]}>Barberias en el area del mapa</Text>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>{resultHeadline}</Text>
                </View>
                <View
                  style={[
                    styles.sheetPinsBadge,
                    {
                      borderColor: successTone.borderColor,
                      backgroundColor: successTone.backgroundColor,
                    },
                  ]}
                >
                  <Ionicons name="location-outline" size={14} color={successTone.textColor} />
                  <Text style={[styles.sheetPinsBadgeText, { color: successTone.textColor }]}>
                    {activePins}
                  </Text>
                </View>
              </View>
              <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>{resultDescription}</Text>
            </View>
          )}

          {mobileSheetStage !== 'collapsed' && showResetSearch ? (
            <Pressable
              onPress={clearSearchResults}
              style={[
                styles.clearSearchButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.panelRaised,
                },
              ]}
            >
              <Text style={[styles.clearSearchButtonText, { color: colors.text }]}>Limpiar busqueda</Text>
            </Pressable>
          ) : null}

          {mobileSheetStage !== 'collapsed' && searchError ? (
            <Text style={[styles.warningText, { color: colors.danger }]}>{searchError}</Text>
          ) : null}
          {mobileSheetStage !== 'collapsed' && error ? (
            <Text style={[styles.warningText, { color: colors.danger }]}>{error}</Text>
          ) : null}
          {mobileSheetStage !== 'collapsed' && locationError ? (
            <Text style={[styles.warningText, { color: colors.danger }]}>{locationError}</Text>
          ) : null}
        </Pressable>

        <View
          style={[
            styles.sheetBody,
            mobileSheetStage === 'collapsed' && styles.sheetBodyCollapsed,
          ]}
        >
          {mobileSheetStage === 'collapsed' ? null : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.sheetBodyContent, { paddingBottom: sheetBodyBottomPadding }]}
              keyboardShouldPersistTaps="handled"
            >
              <PlatformQuickLinks
                title="Plataforma Navaja"
                description="Software, agenda, marketplace y planes tambien viven en la app con la misma narrativa principal de web."
              />

              {loading ? (
                <View style={styles.sheetStatusState}>
                  <MutedText>Cargando barberias...</MutedText>
                </View>
              ) : filteredShops.length ? (
                filteredShops.map(({ shop, distanceKm }) => {
                  const isActive = shop.id === selectedShop?.id;

                  return (
                    <Pressable
                      key={shop.id}
                      onPress={() => focusShop(shop)}
                      style={[
                        styles.shopCard,
                        {
                          borderColor: isActive ? colors.borderActive : colors.border,
                          backgroundColor: colors.panelStrong,
                        },
                      ]}
                    >
                      <View style={styles.shopCardMediaShell}>
                        {shop.coverImageUrl && !brokenCovers[shop.id] ? (
                          <Image
                            source={{ uri: shop.coverImageUrl }}
                            style={styles.shopCardMedia}
                            resizeMode="cover"
                            onError={() => markCoverAsBroken(shop.id)}
                          />
                        ) : (
                          <LinearGradient
                            colors={getFallbackCoverGradient(shop, colors)}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.shopCardMedia}
                          />
                        )}

                        <LinearGradient
                          colors={[
                            withOpacity(colors.backgroundBase, 0.08),
                            withOpacity(colors.backgroundBase, 0.72),
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />

                        <View style={styles.shopCardTopRow}>
                          <Text style={[styles.shopCardHighlight, { color: colors.textStrong }]}>
                            {getShopHighlight(shop, distanceKm)}
                          </Text>
                          <View style={[styles.shopCardRatingBadge, { backgroundColor: colors.accent }]}>
                            <Ionicons name="star" size={12} color={colors.accentForeground} />
                            <Text style={[styles.shopCardRatingText, { color: colors.accentForeground }]}>
                              {formatRating(shop.averageRating)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.shopCardBottomRow}>
                          <View style={styles.shopCardTitleBlock}>
                            <Text style={[styles.shopCardTitle, { color: colors.textStrong }]}>
                              {shop.name}
                            </Text>
                            <Text style={[styles.shopCardLocation, { color: colors.textOnDark }]}>
                              {shop.locationLabel || shop.city || 'Uruguay'}
                            </Text>
                          </View>
                          {distanceKm !== null ? (
                            <Text
                              style={[
                                styles.shopCardDistance,
                                {
                                  color: colors.textStrong,
                                  backgroundColor: withOpacity(
                                    colors.accent,
                                    colors.mode === 'dark' ? 0.24 : 0.18,
                                  ),
                                },
                              ]}
                            >
                              {distanceKm.toFixed(1)} km
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.shopCardBody}>
                        <Text style={[styles.shopCardDescription, { color: colors.textSoft }]} numberOfLines={2}>
                          {shop.description || getShopReviewSummary(shop)}
                        </Text>

                        <View style={styles.shopCardFacts}>
                          <Chip label={`${shop.reviewCount || 0} resenas`} tone="neutral" style={styles.metaChip} />
                          <Chip label={`${shop.activeServiceCount} servicios`} tone="neutral" style={styles.metaChip} />
                          {shop.minServicePriceCents !== null ? (
                            <Chip
                              label={`Desde ${formatCurrency(shop.minServicePriceCents)}`}
                              tone="success"
                              style={styles.metaChip}
                            />
                          ) : null}
                          {shop.isVerified ? <Chip label="Verificada" tone="success" style={styles.metaChip} /> : null}
                        </View>

                        <View style={styles.shopCardActions}>
                          <ActionButton
                            label="Reservar"
                            onPress={() => {
                              void handleReserveAtShop(shop);
                            }}
                            style={styles.shopCardActionButton}
                          />
                          <ActionButton
                            label="Ver perfil"
                            variant="secondary"
                            onPress={() => {
                              router.push(`/shops/${shop.slug}`);
                            }}
                            style={styles.shopCardActionButton}
                          />
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <View
                  style={[
                    styles.sheetStatusState,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.panel,
                    },
                  ]}
                >
                  <Text style={[styles.sheetStatusText, { color: colors.textMuted }]}>
                    {searchMode === 'all'
                      ? 'Aun no hay barberias visibles en esta vista.'
                      : 'No encontramos barberias para esa busqueda. Prueba con otra zona o limpia la busqueda.'}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    overflow: 'hidden',
  },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 22,
    paddingHorizontal: 12,
    zIndex: 12,
  },
  mapLoadingPill: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapLoadingText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  mapChip: {
    position: 'absolute',
    left: 12,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    zIndex: 14,
  },
  mapChipText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.75,
    textTransform: 'uppercase',
  },
  markerBadge: {
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markerBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  searchOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 24,
    gap: 10,
  },
  chromeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  chromeBrand: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chromeLogo: {
    width: 34,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chromeCopy: {
    flex: 1,
    gap: 1,
  },
  chromeEyebrow: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  chromeTitle: {
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
  },
  chromeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputShell: {
    flex: 1,
    minHeight: 44,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchSubmitButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsSheet: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 6,
    gap: 2,
  },
  suggestionRow: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 2,
  },
  suggestionLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  suggestionDescription: {
    fontSize: 12,
  },
  mapPreviewFloating: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 34,
  },
  mapPreviewCard: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapPreviewMediaShell: {
    height: 132,
    position: 'relative',
  },
  mapPreviewMedia: {
    width: '100%',
    height: '100%',
  },
  mapPreviewTopBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  previewCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPreviewBody: {
    padding: 12,
    gap: 7,
  },
  mapPreviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  mapPreviewTitleBlock: {
    flex: 1,
    gap: 2,
  },
  mapPreviewTitle: {
    fontSize: 16,
    fontFamily: 'Sora_800ExtraBold',
  },
  mapPreviewMeta: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  mapPreviewRatingText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  mapPreviewDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  mapPreviewFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    marginRight: 0,
  },
  mapPreviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mapPreviewActionButton: {
    flex: 1,
    minHeight: 40,
  },
  mobileSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 28,
  },
  sheetHandleZone: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHandle: {
    width: 58,
    height: 6,
    borderRadius: 999,
  },
  sheetHeader: {
    paddingHorizontal: 16,
  },
  sheetHeaderCollapsed: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  sheetHeaderExpanded: {
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  sheetCollapsedTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sheetTitleBlock: {
    flex: 1,
    gap: 4,
  },
  sheetEyebrow: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    fontSize: 21,
    fontFamily: 'Sora_800ExtraBold',
    lineHeight: 26,
  },
  sheetSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  sheetPinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sheetPinsBadgeText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  clearSearchButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  clearSearchButtonText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  warningText: {
    fontSize: 12,
  },
  sheetBody: {
    flex: 1,
  },
  sheetBodyCollapsed: {
    opacity: 0,
  },
  sheetBodyContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  sheetStatusState: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sheetStatusText: {
    fontSize: 13,
    lineHeight: 19,
  },
  shopCard: {
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shopCardMediaShell: {
    height: 208,
    position: 'relative',
    justifyContent: 'space-between',
  },
  shopCardMedia: {
    ...StyleSheet.absoluteFillObject,
  },
  shopCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  shopCardHighlight: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  shopCardRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  shopCardRatingText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  shopCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  shopCardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  shopCardTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Sora_800ExtraBold',
  },
  shopCardLocation: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  shopCardDistance: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  shopCardBody: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  shopCardDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  shopCardFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  shopCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  shopCardActionButton: {
    flex: 1,
    minHeight: 40,
  },
});
