'use client';

import { useEffectEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea } from '@heroui/react';
import { Star, Trash2, X } from 'lucide-react';
import { buildAdminHref } from '@/lib/workspace-routes';

const MAX_RECOMMENDED_SHOP_IMAGES = 3;
const MAX_SHOP_IMAGES = 6;
const MIN_REQUIRED_SHOP_IMAGES = 1;

interface AdminBarbershopSettingsFormProps {
  shopId: string;
  initialShopName: string;
  initialShopSlug: string;
  initialTimezone: string;
  initialPhone: string | null;
  initialDescription: string | null;
  initialLocationLabel: string | null;
  initialCity: string | null;
  initialRegion: string | null;
  initialCountryCode: string | null;
  initialLatitude: number | null;
  initialLongitude: number | null;
  initialCoverImageUrl: string | null;
  initialGalleryImages: Array<{
    id: string;
    publicUrl: string;
  }>;
}

interface ExistingShopImage {
  id: string;
  publicUrl: string;
}

interface NewShopImage {
  id: string;
  file: File;
  previewUrl: string;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createLocalImageId() {
  return `local-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function normalizeNumberInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AdminBarbershopSettingsForm({
  shopId,
  initialShopName,
  initialShopSlug,
  initialTimezone,
  initialPhone,
  initialDescription,
  initialLocationLabel,
  initialCity,
  initialRegion,
  initialCountryCode,
  initialLatitude,
  initialLongitude,
  initialCoverImageUrl,
  initialGalleryImages,
}: AdminBarbershopSettingsFormProps) {
  const router = useRouter();

  const [shopName, setShopName] = useState(initialShopName);
  const [shopSlug, setShopSlug] = useState(initialShopSlug);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [phone, setPhone] = useState(initialPhone || '');
  const [description, setDescription] = useState(initialDescription || '');
  const [locationLabel, setLocationLabel] = useState(initialLocationLabel || '');
  const [city, setCity] = useState(initialCity || '');
  const [region, setRegion] = useState(initialRegion || '');
  const [countryCode, setCountryCode] = useState(initialCountryCode || 'UY');
  const [latitudeInput, setLatitudeInput] = useState(
    initialLatitude !== null && Number.isFinite(initialLatitude) ? String(initialLatitude) : '',
  );
  const [longitudeInput, setLongitudeInput] = useState(
    initialLongitude !== null && Number.isFinite(initialLongitude) ? String(initialLongitude) : '',
  );
  const [existingImages, setExistingImages] = useState<ExistingShopImage[]>(initialGalleryImages);
  const [newImages, setNewImages] = useState<NewShopImage[]>([]);
  const [coverImageRef, setCoverImageRef] = useState<string | null>(() => {
    if (initialCoverImageUrl) {
      const match = initialGalleryImages.find((image) => image.publicUrl === initialCoverImageUrl);
      if (match) {
        return `existing:${match.id}`;
      }
    }

    const firstImage = initialGalleryImages[0];
    return firstImage ? `existing:${firstImage.id}` : null;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totalImages = existingImages.length + newImages.length;

  const removeExistingImage = useEffectEvent((imageId: string) => {
    setExistingImages((current) => {
      const next = current.filter((image) => image.id !== imageId);
      if (coverImageRef === `existing:${imageId}`) {
        const firstExisting = next[0];
        if (firstExisting) {
          setCoverImageRef(`existing:${firstExisting.id}`);
        } else {
          const firstNew = newImages[0];
          setCoverImageRef(firstNew ? `new-local:${firstNew.id}` : null);
        }
      }
      return next;
    });
  });

  const removeNewImage = useEffectEvent((imageId: string) => {
    setNewImages((current) => {
      const target = current.find((image) => image.id === imageId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      const next = current.filter((image) => image.id !== imageId);
      if (coverImageRef === `new-local:${imageId}`) {
        const firstExisting = existingImages[0];
        if (firstExisting) {
          setCoverImageRef(`existing:${firstExisting.id}`);
        } else {
          const firstNew = next[0];
          setCoverImageRef(firstNew ? `new-local:${firstNew.id}` : null);
        }
      }
      return next;
    });
  });

  const handleAddPhotos = useEffectEvent((files: FileList | null) => {
    if (!files) {
      return;
    }

    const availableSlots = Math.max(MAX_SHOP_IMAGES - (existingImages.length + newImages.length), 0);
    if (availableSlots <= 0) {
      return;
    }

    const incoming = Array.from(files).filter((file) => file.size > 0).slice(0, availableSlots);
    const additions = incoming.map((file) => ({
      id: createLocalImageId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    if (additions.length === 0) {
      return;
    }

    setNewImages((current) => [...current, ...additions]);

    if (!coverImageRef) {
      const firstAddition = additions[0];
      if (firstAddition) {
        setCoverImageRef(`new-local:${firstAddition.id}`);
      }
    }
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const resolvedSlug = slugify(shopSlug || shopName);
    if (!resolvedSlug) {
      setSubmitting(false);
      setError('Define un nombre o slug valido para la barberia.');
      return;
    }

    if (totalImages < MIN_REQUIRED_SHOP_IMAGES) {
      setSubmitting(false);
      setError('Debes mantener o subir al menos una foto del local.');
      return;
    }

    const latitude = normalizeNumberInput(latitudeInput);
    const longitude = normalizeNumberInput(longitudeInput);
    if ((latitude === null) !== (longitude === null)) {
      setSubmitting(false);
      setError('Si completas coordenadas, debes completar latitud y longitud.');
      return;
    }

    const retainedImageIds = existingImages.map((image) => image.id);
    let coverImageRefForApi = coverImageRef;
    if (coverImageRefForApi?.startsWith('new-local:')) {
      const localId = coverImageRefForApi.slice('new-local:'.length);
      const newIndex = newImages.findIndex((image) => image.id === localId);
      coverImageRefForApi = newIndex >= 0 ? `new:${newIndex}` : null;
    }

    try {
      const payload = {
        shop_id: shopId,
        shop_name: shopName.trim(),
        shop_slug: resolvedSlug,
        timezone: timezone.trim() || 'UTC',
        phone: phone.trim() || null,
        description: description.trim() || null,
        location_label: locationLabel.trim() || shopName.trim() || null,
        city: city.trim() || null,
        region: region.trim() || null,
        country_code: countryCode.trim().toUpperCase() || null,
        latitude,
        longitude,
        retained_image_ids: retainedImageIds,
        cover_image_ref: coverImageRefForApi,
      };

      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));

      for (const image of newImages) {
        formData.append('shopPhotos', image.file);
      }

      const response = await fetch('/api/admin/barbershop', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        setSubmitting(false);
        setError(message || 'No se pudo actualizar la barberia.');
        return;
      }

      const result = (await response.json()) as { shop_slug?: string };
      for (const image of newImages) {
        URL.revokeObjectURL(image.previewUrl);
      }
      setNewImages([]);
      setSubmitting(false);
      setSuccess('Barberia actualizada correctamente.');
      router.replace(buildAdminHref('/admin/barbershop', result.shop_slug || resolvedSlug));
      router.refresh();
    } catch (requestError) {
      setSubmitting(false);
      setError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar la barberia.');
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? <p className="status-banner error">{error}</p> : null}
      {success ? <p className="status-banner success">{success}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nombre de la barberia" labelPlacement="inside" value={shopName} onChange={(event) => setShopName(event.target.value)} required />
        <Input
          label="Slug publico"
          labelPlacement="inside"
          value={shopSlug}
          onChange={(event) => setShopSlug(slugify(event.target.value))}
          placeholder="mi-barberia"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Timezone" labelPlacement="inside" value={timezone} onChange={(event) => setTimezone(event.target.value)} required />
        <Input label="Telefono" labelPlacement="inside" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </div>

      <Textarea label="Descripcion" labelPlacement="inside" minRows={3} value={description} onChange={(event) => setDescription(event.target.value)} />

      <div className="grid gap-4 md:grid-cols-3">
        <Input label="Nombre de ubicacion" labelPlacement="inside" value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} />
        <Input label="Ciudad" labelPlacement="inside" value={city} onChange={(event) => setCity(event.target.value)} />
        <Input label="Departamento" labelPlacement="inside" value={region} onChange={(event) => setRegion(event.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Input label="Pais" labelPlacement="inside" value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} />
        <Input label="Latitud (opcional)" labelPlacement="inside" value={latitudeInput} onChange={(event) => setLatitudeInput(event.target.value)} placeholder="-34.9011" />
        <Input label="Longitud (opcional)" labelPlacement="inside" value={longitudeInput} onChange={(event) => setLongitudeInput(event.target.value)} placeholder="-56.1645" />
      </div>

      <div className="surface-card rounded-[1.75rem] p-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink dark:text-slate-100">Fotos del local</p>
              <p className="text-xs text-slate/80 dark:text-slate-400">
                Mantiene al menos 1 foto. Recomendado: {MAX_RECOMMENDED_SHOP_IMAGES}.
              </p>
            </div>
            <span className="meta-chip" data-tone={totalImages >= MAX_RECOMMENDED_SHOP_IMAGES ? 'success' : undefined}>
              {totalImages}/{MAX_RECOMMENDED_SHOP_IMAGES} recomendadas
            </span>
          </div>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => handleAddPhotos(event.target.files)}
            className="block w-full cursor-pointer rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-700 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)] file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:bg-white/85 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:file:bg-white dark:file:text-slate-950"
            disabled={totalImages >= MAX_SHOP_IMAGES}
          />

          {totalImages > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {existingImages.map((image) => {
                const ref = `existing:${image.id}`;
                const isCover = coverImageRef === ref;
                return (
                  <div key={image.id} className="relative overflow-hidden rounded-2xl border border-white/12">
                    <img src={image.publicUrl} alt="Foto actual del local" className="h-36 w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-slate-950/70 px-2 py-2 text-white backdrop-blur">
                      <button type="button" onClick={() => setCoverImageRef(ref)} className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2 py-1 text-[11px] font-semibold">
                        <Star className={`h-3.5 w-3.5 ${isCover ? 'fill-current text-amber-300' : 'text-white/75'}`} />
                        {isCover ? 'Portada' : 'Portada'}
                      </button>
                      <button type="button" onClick={() => removeExistingImage(image.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-rose-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {newImages.map((image) => {
                const ref = `new-local:${image.id}`;
                const isCover = coverImageRef === ref;
                return (
                  <div key={image.id} className="relative overflow-hidden rounded-2xl border border-white/12">
                    <img src={image.previewUrl} alt="Foto nueva del local" className="h-36 w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-slate-950/70 px-2 py-2 text-white backdrop-blur">
                      <button type="button" onClick={() => setCoverImageRef(ref)} className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2 py-1 text-[11px] font-semibold">
                        <Star className={`h-3.5 w-3.5 ${isCover ? 'fill-current text-amber-300' : 'text-white/75'}`} />
                        {isCover ? 'Portada' : 'Portada'}
                      </button>
                      <button type="button" onClick={() => removeNewImage(image.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-rose-100">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-300">Debes mantener o subir al menos una foto.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" isLoading={submitting} isDisabled={submitting} className="action-primary px-5 text-sm font-semibold">
          {submitting ? 'Guardando cambios...' : 'Guardar cambios'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="action-secondary px-5 text-sm font-semibold"
          onClick={() => router.push(buildAdminHref('/admin', initialShopSlug))}
          isDisabled={submitting}
        >
          Volver al resumen
        </Button>
      </div>
    </form>
  );
}
