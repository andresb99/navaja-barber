'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea } from '@heroui/react';
import { MapPin, Search, X } from 'lucide-react';
import {
  type GoogleAutocompleteService,
  type GoogleGeocoder,
  type GoogleGeocoderResult,
  type GoogleMap,
  type GoogleMapsApi,
  type GoogleMarker,
  URUGUAY_CENTER,
  URUGUAY_ZOOM,
  getGoogleMapThemeOptions,
  loadGoogleMapsPlacesApi,
} from '@/lib/google-maps';
import { WORKSPACE_COOKIE_MAX_AGE_SECONDS, WORKSPACE_COOKIE_NAME } from '@/lib/workspace-cookie';
import { buildAdminHref } from '@/lib/workspace-routes';

type GooglePrediction = {
  description?: string;
  place_id?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type GoogleAutocompleteSessionToken = object;

const MIN_REQUIRED_SHOP_IMAGES = 1;
const RECOMMENDED_SHOP_IMAGES = 3;
const MAX_SHOP_IMAGES = 6;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getLocalTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function pickAddressComponent(
  components: Array<{ long_name?: string; short_name?: string; types?: string[] }>,
  type: string,
) {
  return components.find((component) => component.types?.includes(type));
}

function getPhotoFingerprint(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function arePredictionsEqual(left: GooglePrediction[], right: GooglePrediction[]) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (!leftItem || !rightItem) {
      return false;
    }

    if (
      String(leftItem.place_id || '') !== String(rightItem.place_id || '') ||
      String(leftItem.description || '') !== String(rightItem.description || '') ||
      String(leftItem.structured_formatting?.main_text || '') !==
        String(rightItem.structured_formatting?.main_text || '') ||
      String(leftItem.structured_formatting?.secondary_text || '') !==
        String(rightItem.structured_formatting?.secondary_text || '')
    ) {
      return false;
    }
  }

  return true;
}

export function BarbershopOnboardingForm() {
  const router = useRouter();
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

  const searchShellRef = useRef<HTMLDivElement | null>(null);
  const locationMapRef = useRef<HTMLDivElement | null>(null);
  const googleMapsRef = useRef<GoogleMapsApi | null>(null);
  const googleMapRef = useRef<GoogleMap | null>(null);
  const googleMarkerRef = useRef<GoogleMarker | null>(null);
  const autocompleteServiceRef = useRef<GoogleAutocompleteService | null>(null);
  const geocoderRef = useRef<GoogleGeocoder | null>(null);
  const sessionTokenRef = useRef<GoogleAutocompleteSessionToken | null>(null);
  const predictionRequestIdRef = useRef(0);

  const [shopName, setShopName] = useState('');
  const [shopSlug, setShopSlug] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [timezone, setTimezone] = useState(getLocalTimezone);
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [countryCode, setCountryCode] = useState('UY');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [shopPhotos, setShopPhotos] = useState<File[]>([]);
  const [placesMode, setPlacesMode] = useState<'loading' | 'ready' | 'fallback'>(
    googleMapsApiKey ? 'loading' : 'fallback',
  );
  const [locationStatus, setLocationStatus] = useState<string>(
    googleMapsApiKey
      ? 'Busca tu local y selecciona una direccion real en Uruguay.'
      : 'Sin API key de Google Maps. Usa la carga manual mientras configuras NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.',
  );
  const [predictions, setPredictions] = useState<GooglePrediction[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetSelectedLocation = useEffectEvent((nextStatus: string) => {
    setLatitude((current) => (current === null ? current : null));
    setLongitude((current) => (current === null ? current : null));
    setCity((current) => (current === '' ? current : ''));
    setRegion((current) => (current === '' ? current : ''));
    setCountryCode((current) => (current === 'UY' ? current : 'UY'));
    setLocationLabel((current) => (current === '' ? current : ''));
    setLocationStatus((current) => (current === nextStatus ? current : nextStatus));
  });

  const applyGeocodedPlace = useEffectEvent(
    (prediction: GooglePrediction, place: GoogleGeocoderResult) => {
      const components = Array.isArray(place?.address_components) ? place.address_components : [];
      const country = pickAddressComponent(components, 'country');
      const nextCountryCode =
        typeof country?.short_name === 'string' ? country.short_name.toUpperCase() : 'UY';

      if (nextCountryCode !== 'UY') {
        resetSelectedLocation('La barbershop debe estar ubicada en Uruguay.');
        return;
      }

      const geometry = place?.geometry?.location;
      const nextLatitude = typeof geometry?.lat === 'function' ? geometry.lat() : null;
      const nextLongitude = typeof geometry?.lng === 'function' ? geometry.lng() : null;

      if (typeof nextLatitude !== 'number' || typeof nextLongitude !== 'number') {
        resetSelectedLocation('No pudimos fijar la ubicacion exacta. Elige otra sugerencia.');
        return;
      }

      const nextCity =
        pickAddressComponent(components, 'locality')?.long_name ||
        pickAddressComponent(components, 'postal_town')?.long_name ||
        pickAddressComponent(components, 'administrative_area_level_2')?.long_name ||
        pickAddressComponent(components, 'sublocality_level_1')?.long_name ||
        '';

      const nextRegion =
        pickAddressComponent(components, 'administrative_area_level_1')?.long_name ||
        pickAddressComponent(components, 'administrative_area_level_2')?.long_name ||
        '';

      const formattedAddress =
        typeof place?.formatted_address === 'string'
          ? place.formatted_address.trim()
          : prediction.description?.trim() || '';
      const inferredLabel =
        prediction.structured_formatting?.main_text?.trim() || shopName.trim() || formattedAddress;

      setLocationQuery(formattedAddress);
      setLocationLabel(inferredLabel);
      setCity(nextCity);
      setRegion(nextRegion);
      setCountryCode(nextCountryCode);
      setLatitude(nextLatitude);
      setLongitude(nextLongitude);
      setPredictions([]);
      setIsSearchOpen(false);
      setLocationStatus('Ubicacion confirmada. El pin rojo marca donde aparecera tu barberia.');

      const google = googleMapsRef.current;
      if (google?.maps?.places?.AutocompleteSessionToken) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      }
    },
  );

  const selectPrediction = useEffectEvent((prediction: GooglePrediction) => {
    const placeId = prediction.place_id?.trim();
    if (!placeId || !geocoderRef.current) {
      resetSelectedLocation('No se pudo resolver esa direccion. Prueba otra sugerencia.');
      return;
    }

    setLocationQuery(prediction.description?.trim() || '');
    setPredictions([]);
    setIsSearchOpen(false);
    setIsSearchingPlaces(true);
    setLocationStatus('Buscando coordenadas exactas...');

    geocoderRef.current.geocode(
      { placeId },
      (results: GoogleGeocoderResult[] | null, status: string) => {
        setIsSearchingPlaces(false);

        if (status !== 'OK' || !Array.isArray(results) || results.length === 0) {
          resetSelectedLocation('No se pudo fijar esa direccion. Selecciona otra sugerencia.');
          return;
        }

        const firstResult = results[0];
        if (!firstResult) {
          resetSelectedLocation('No se pudo fijar esa direccion. Selecciona otra sugerencia.');
          return;
        }

        applyGeocodedPlace(prediction, firstResult);
      },
    );
  });

  const handlePhotosChange = useEffectEvent((files: FileList | null) => {
    if (!files) {
      return;
    }

    const incomingPhotos = Array.from(files)
      .filter((file) => file.size > 0)
      .slice(0, MAX_SHOP_IMAGES);

    if (incomingPhotos.length === 0) {
      return;
    }

    setShopPhotos((current) => {
      const mergedByFingerprint = new Map<string, File>();

      for (const file of current) {
        mergedByFingerprint.set(getPhotoFingerprint(file), file);
      }

      for (const file of incomingPhotos) {
        mergedByFingerprint.set(getPhotoFingerprint(file), file);
      }

      return Array.from(mergedByFingerprint.values()).slice(0, MAX_SHOP_IMAGES);
    });
  });

  const removePhoto = useEffectEvent((targetFingerprint: string) => {
    setShopPhotos((current) =>
      current.filter((file) => getPhotoFingerprint(file) !== targetFingerprint),
    );
  });

  const clearPhotos = useEffectEvent(() => {
    setShopPhotos([]);
  });

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
    if (!googleMapsApiKey) {
      setPlacesMode('fallback');
      setLocationStatus(
        'Sin API key de Google Maps. Usa la carga manual mientras configuras NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.',
      );
      return;
    }

    let isCancelled = false;

    setPlacesMode('loading');
    setLocationStatus('Conectando Google Maps para cargar el buscador...');

    loadGoogleMapsPlacesApi(googleMapsApiKey)
      .then((google) => {
        if (isCancelled || !google?.maps?.places) {
          return;
        }

        googleMapsRef.current = google;
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        geocoderRef.current = new google.maps.Geocoder();
        sessionTokenRef.current = google.maps.places.AutocompleteSessionToken
          ? new google.maps.places.AutocompleteSessionToken()
          : null;

        setPlacesMode('ready');
        setLocationStatus('Busca tu direccion y elige una sugerencia para fijarla en el mapa.');
      })
      .catch((loadError) => {
        if (isCancelled) {
          return;
        }

        setPlacesMode('fallback');
        setLocationStatus(
          loadError instanceof Error
            ? `${loadError.message} Completa la ubicacion manualmente por ahora.`
            : 'No se pudo cargar Google Maps. Completa la ubicacion manualmente por ahora.',
        );
      });

    return () => {
      isCancelled = true;
    };
  }, [googleMapsApiKey]);

  useEffect(() => {
    if (
      placesMode === 'fallback' ||
      !googleMapsApiKey ||
      !locationMapRef.current ||
      googleMapRef.current
    ) {
      return;
    }

    let isCancelled = false;

    loadGoogleMapsPlacesApi(googleMapsApiKey)
      .then((google) => {
        if (isCancelled || !locationMapRef.current || !google?.maps || googleMapRef.current) {
          return;
        }

        googleMapRef.current = new google.maps.Map(locationMapRef.current, {
          center: URUGUAY_CENTER,
          zoom: URUGUAY_ZOOM,
          ...getGoogleMapThemeOptions(isDarkTheme),
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          gestureHandling: 'cooperative',
          clickableIcons: false,
        });

        googleMarkerRef.current = new google.maps.Marker({
          map: null,
          position: URUGUAY_CENTER,
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setLocationStatus('No se pudo renderizar el mapa de ubicacion.');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [googleMapsApiKey, isDarkTheme, placesMode]);

  useEffect(() => {
    const map = googleMapRef.current;
    if (!map) {
      return;
    }

    map.setOptions(getGoogleMapThemeOptions(isDarkTheme));
  }, [isDarkTheme]);

  useEffect(() => {
    const map = googleMapRef.current;
    const marker = googleMarkerRef.current;
    if (!map || !marker) {
      return;
    }

    if (latitude === null || longitude === null) {
      marker.setMap(null);
      map.setCenter(URUGUAY_CENTER);
      map.setZoom(URUGUAY_ZOOM);
      return;
    }

    const position = { lat: latitude, lng: longitude };
    marker.setPosition(position);
    marker.setMap(map);
    map.panTo(position);
    map.setZoom(16);
  }, [latitude, longitude]);

  useEffect(() => {
    if (placesMode !== 'ready') {
      return;
    }

    const query = locationQuery.trim();
    if (query.length < 3 || !autocompleteServiceRef.current) {
      predictionRequestIdRef.current += 1;
      setPredictions((current) => (current.length === 0 ? current : []));
      setIsSearchingPlaces((current) => (current ? false : current));
      return;
    }

    const autocompleteService = autocompleteServiceRef.current;
    setIsSearchingPlaces(true);
    const requestId = predictionRequestIdRef.current + 1;
    predictionRequestIdRef.current = requestId;

    const timeoutId = window.setTimeout(() => {
      autocompleteService.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'uy' },
          sessionToken: sessionTokenRef.current,
        },
        (results: Array<Record<string, unknown>> | null, status: string) => {
          if (requestId !== predictionRequestIdRef.current) {
            return;
          }

          setIsSearchingPlaces((current) => (current ? false : current));
          if (status !== 'OK' || !Array.isArray(results)) {
            setPredictions((current) => (current.length === 0 ? current : []));
            return;
          }

          const nextPredictions = results.slice(0, 6) as GooglePrediction[];
          setPredictions((current) =>
            arePredictionsEqual(current, nextPredictions) ? current : nextPredictions,
          );
        },
      );
    }, 180);

    return () => {
      predictionRequestIdRef.current += 1;
      window.clearTimeout(timeoutId);
    };
  }, [locationQuery, placesMode]);

  useEffect(() => {
    if (placesMode !== 'ready') {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!searchShellRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [placesMode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resolvedSlug = slugify(shopSlug || shopName);
    if (!resolvedSlug) {
      setSubmitting(false);
      setError('Define un nombre o slug valido para la barbershop.');
      return;
    }

    if (
      googleMapsApiKey &&
      placesMode !== 'fallback' &&
      (latitude === null || longitude === null)
    ) {
      setSubmitting(false);
      setError('Selecciona una ubicacion valida desde el buscador antes de crear la barbershop.');
      return;
    }

    if (shopPhotos.length < MIN_REQUIRED_SHOP_IMAGES) {
      setSubmitting(false);
      setError('Debes subir al menos una foto del local antes de crear la barberia.');
      return;
    }

    try {
      const payload = {
        shop_name: shopName.trim(),
        shop_slug: resolvedSlug,
        timezone: timezone.trim() || 'UTC',
        owner_name: ownerName.trim() || 'Shop owner',
        phone: phone.trim() || null,
        description: description.trim() || null,
        location_label: locationLabel.trim() || shopName.trim() || locationQuery.trim() || null,
        city: city.trim() || null,
        region: region.trim() || null,
        country_code: countryCode.trim().toUpperCase() || null,
        latitude,
        longitude,
      };

      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));

      for (const photo of shopPhotos) {
        formData.append('shopPhotos', photo);
      }

      const response = await fetch('/api/onboarding/barbershop', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        setSubmitting(false);
        setError(message || 'No se pudo crear la barberia.');
        return;
      }

      const result = (await response.json()) as { shop_id?: string; shop_slug?: string };
      if (result.shop_id) {
        document.cookie = `${WORKSPACE_COOKIE_NAME}=${encodeURIComponent(result.shop_id)}; path=/; max-age=${WORKSPACE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
        router.replace(buildAdminHref('/admin', result.shop_slug || resolvedSlug));
        router.refresh();
        return;
      }

      const targetSlug = result.shop_slug || resolvedSlug;
      router.replace(`/shops/${targetSlug}`);
      router.refresh();
    } catch (requestError) {
      setSubmitting(false);
      setError(
        requestError instanceof Error ? requestError.message : 'No se pudo crear la barbershop.',
      );
      return;
    }
  }

  const selectedLocationSummary =
    latitude !== null && longitude !== null
      ? [city, region, countryCode].filter(Boolean).join(' - ')
      : 'Uruguay';
  const remainingRecommendedPhotos = Math.max(RECOMMENDED_SHOP_IMAGES - shopPhotos.length, 0);
  const reachedRecommendedPhotos = shopPhotos.length >= RECOMMENDED_SHOP_IMAGES;

  const showSearchDropdown =
    placesMode === 'ready' &&
    isSearchOpen &&
    locationQuery.trim().length >= 3 &&
    (isSearchingPlaces || predictions.length > 0);

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? <p className="status-banner error">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Nombre de la barberia"
          labelPlacement="inside"
          value={shopName}
          onChange={(event) => setShopName(event.target.value)}
          required
        />
        <Input
          label="Slug publico"
          labelPlacement="inside"
          value={shopSlug}
          onChange={(event) => setShopSlug(slugify(event.target.value))}
          placeholder="mi-barberia"
          description="Se usara en la URL publica."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Input
          label="Nombre del owner"
          labelPlacement="inside"
          value={ownerName}
          onChange={(event) => setOwnerName(event.target.value)}
          required
        />
        <Input
          label="Timezone"
          labelPlacement="inside"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          required
        />
        <Input
          label="Telefono"
          labelPlacement="inside"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>

      <Textarea
        label="Descripcion"
        labelPlacement="inside"
        minRows={3}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      <div className="surface-card rounded-[1.75rem] p-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink dark:text-slate-100">Fotos del local</p>
              <p className="text-xs text-slate/80 dark:text-slate-400">
                Sube al menos {MIN_REQUIRED_SHOP_IMAGES}. Recomendado: {RECOMMENDED_SHOP_IMAGES}{' '}
                para mostrar mejor tu barberia.
              </p>
            </div>
            <span
              className="meta-chip"
              data-tone={shopPhotos.length >= RECOMMENDED_SHOP_IMAGES ? 'success' : 'default'}
            >
              {shopPhotos.length}/{RECOMMENDED_SHOP_IMAGES} recomendadas
            </span>
          </div>
          {reachedRecommendedPhotos ? (
            <p className="status-banner success">
              Excelente: ya subiste al menos {RECOMMENDED_SHOP_IMAGES} fotos. Eso mejora la
              confianza de quienes visitan tu perfil.
            </p>
          ) : (
            <p className="status-banner warning">
              Te faltan {remainingRecommendedPhotos} foto
              {remainingRecommendedPhotos === 1 ? '' : 's'} para llegar al recomendado de{' '}
              {RECOMMENDED_SHOP_IMAGES}.
            </p>
          )}

          <label className="block">
            <span className="sr-only">Seleccionar fotos del local</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={shopPhotos.length >= MAX_SHOP_IMAGES}
              onChange={(event) => {
                handlePhotosChange(event.target.files);
                event.currentTarget.value = '';
              }}
              className="block w-full cursor-pointer rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-700 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)] file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:bg-white/85 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:file:bg-white dark:file:text-slate-950"
            />
          </label>

          <p className="text-xs text-slate/70 dark:text-slate-400">
            Puedes agregar fotos en varias tandas. La primera foto seleccionada se usara como
            portada publica de la barberia. Maximo: {MAX_SHOP_IMAGES}.
          </p>
          {shopPhotos.length >= MAX_SHOP_IMAGES ? (
            <p className="text-xs font-medium text-sky-700 dark:text-sky-200">
              Ya alcanzaste el maximo de {MAX_SHOP_IMAGES} fotos.
            </p>
          ) : null}

          {shopPhotos.length > 0 ? (
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate/70 dark:text-slate-400">Fotos seleccionadas</p>
                <Button
                  type="button"
                  size="sm"
                  variant="light"
                  className="text-xs font-semibold text-rose-600 underline-offset-2 hover:underline dark:text-rose-300"
                  onClick={clearPhotos}
                >
                  Limpiar seleccion
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {shopPhotos.map((file, index) => {
                  const fingerprint = getPhotoFingerprint(file);
                  return (
                    <span key={fingerprint} className="meta-chip inline-flex items-center gap-2">
                      <span>
                        {index === 0 ? 'Portada:' : `Foto ${index + 1}:`} {file.name}
                      </span>
                      <Button
                        type="button"
                        isIconOnly
                        size="sm"
                        radius="full"
                        variant="light"
                        aria-label={`Quitar ${file.name}`}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/15 text-rose-700 transition hover:bg-rose-500/25 dark:text-rose-200"
                        onClick={() => removePhoto(fingerprint)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-300">
              Debes seleccionar al menos una foto del local para continuar.
            </p>
          )}
        </div>
      </div>

      {placesMode === 'fallback' ? (
        <>
          <p className="status-banner warning">{locationStatus}</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Nombre de la ubicacion"
              labelPlacement="inside"
              value={locationLabel}
              onChange={(event) => setLocationLabel(event.target.value)}
              placeholder="Sucursal Pocitos"
            />
            <Input
              label="Ciudad"
              labelPlacement="inside"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
            <Input
              label="Departamento"
              labelPlacement="inside"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            />
          </div>

          <Input
            label="Pais"
            labelPlacement="inside"
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value.toUpperCase())}
            maxLength={8}
          />
        </>
      ) : (
        <div className="space-y-4">
          <div ref={searchShellRef} className="places-search-shell">
            <label htmlFor="shop-location-search">Ubicacion del local</label>
            <div
              className="places-search-input-shell"
              data-open={showSearchDropdown ? 'true' : 'false'}
            >
              <Search size={18} className="places-search-icon" />
              <input
                id="shop-location-search"
                type="text"
                value={locationQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(event) => {
                  setLocationQuery(event.target.value);
                  setIsSearchOpen(true);
                  resetSelectedLocation(
                    'Escribe y selecciona una sugerencia valida de Google Maps.',
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setIsSearchOpen(false);
                    return;
                  }

                  if (event.key === 'Enter' && predictions.length > 0 && isSearchOpen) {
                    event.preventDefault();
                    const firstPrediction = predictions[0];
                    if (firstPrediction) {
                      selectPrediction(firstPrediction);
                    }
                  }
                }}
                placeholder="Busca una direccion o nombre de local en Uruguay"
                autoComplete="street-address"
                disabled={placesMode === 'loading'}
              />
              {showSearchDropdown ? (
                <div className="places-search-dropdown">
                  {isSearchingPlaces ? (
                    <p className="places-search-empty">Buscando resultados...</p>
                  ) : null}

                  {!isSearchingPlaces
                    ? predictions.map((prediction) => {
                        const key = `${prediction.place_id || 'prediction'}-${prediction.description || ''}`;
                        return (
                          <Button
                            key={key}
                            type="button"
                            variant="light"
                            className="places-search-option"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectPrediction(prediction)}
                          >
                            <MapPin size={16} className="places-search-option-icon" />
                            <span className="places-search-option-copy">
                              <span>
                                {prediction.structured_formatting?.main_text ||
                                  prediction.description ||
                                  'Ubicacion'}
                              </span>
                              {prediction.structured_formatting?.secondary_text ? (
                                <small>{prediction.structured_formatting?.secondary_text}</small>
                              ) : null}
                            </span>
                          </Button>
                        );
                      })
                    : null}
                </div>
              ) : null}

              {placesMode === 'ready' &&
              isSearchOpen &&
              !isSearchingPlaces &&
              predictions.length === 0 &&
              locationQuery.trim().length >= 3 ? (
                <div className="places-search-dropdown">
                  <p className="places-search-empty">
                    No encontramos sugerencias para esa busqueda en Uruguay.
                  </p>
                </div>
              ) : null}
            </div>
            <p className="text-xs text-slate/80">{locationStatus}</p>
          </div>

          <div className="surface-card rounded-[1.75rem] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate/70">
                  Ubicacion en el mapa
                </p>
                <p className="text-sm text-slate/80">{selectedLocationSummary}</p>
              </div>
              {latitude !== null && longitude !== null ? (
                <span className="meta-chip" data-tone="success">
                  <MapPin className="h-3.5 w-3.5" />
                  Pin confirmado
                </span>
              ) : (
                <p className="text-xs font-medium text-slate/70 dark:text-slate-400">
                  El pin aparece automaticamente cuando eliges una direccion.
                </p>
              )}
            </div>

            <div className="relative overflow-hidden rounded-[1.35rem] border border-white/10">
              <div ref={locationMapRef} className="h-72 w-full bg-slate-950/5" />
              {latitude === null || longitude === null ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/8 px-6 text-center">
                  <div className="rounded-3xl border border-white/12 bg-slate-950/55 px-5 py-4 text-sm text-white shadow-2xl backdrop-blur-xl">
                    Selecciona una direccion y dejaremos un pin rojo exacto en tu futura barberia.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          isLoading={submitting}
          isDisabled={submitting}
          className="action-primary px-5 text-sm font-semibold"
        >
          {submitting ? 'Creando workspace...' : 'Crear barbershop'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="action-secondary px-5 text-sm font-semibold"
          onClick={() => router.push('/shops')}
          isDisabled={submitting}
        >
          Volver al marketplace
        </Button>
      </div>
    </form>
  );
}
