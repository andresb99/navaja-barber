'use client';

import { type FormEvent, type ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea } from '@heroui/react';
import {
  ArrowUpRight,
  Clock3,
  ImagePlus,
  MapPin,
  Phone,
  Scissors,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { buildShopHref } from '@/lib/shop-links';
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
  initialBookingCancellationNoticeHours: number;
  initialBookingRefundMode: 'automatic_full' | 'manual_review';
  initialBookingPolicyText: string | null;
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

interface SettingsSectionProps {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  children: ReactNode;
}

interface ChecklistItemProps {
  done: boolean;
  label: string;
  detail: string;
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

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function resolveCancellationWindowLabel(value: string) {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < 0) {
    return 'Define la ventana en horas.';
  }

  if (parsed === 0) {
    return 'El cliente podra cancelar hasta el inicio de la cita.';
  }

  return `El cliente podra cancelar hasta ${parsed} hora${parsed === 1 ? '' : 's'} antes.`;
}

function SettingsSection({
  id,
  eyebrow,
  title,
  description,
  badge,
  children,
}: SettingsSectionProps) {
  return (
    <section id={id} className="surface-card scroll-mt-28 rounded-[1.75rem] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">{title}</h3>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{description}</p>
        </div>
        {badge ? <span className="meta-chip">{badge}</span> : null}
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function ChecklistItem({ done, label, detail }: ChecklistItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-[1.2rem] border border-white/60 bg-white/45 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          done
            ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-200'
            : 'bg-slate-900/8 text-slate-500 dark:bg-white/10 dark:text-slate-300'
        }`}
      >
        {done ? 'OK' : '...'}
      </span>
      <div>
        <p className="text-sm font-semibold text-ink dark:text-slate-100">{label}</p>
        <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">{detail}</p>
      </div>
    </div>
  );
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
  initialBookingCancellationNoticeHours,
  initialBookingRefundMode,
  initialBookingPolicyText,
  initialGalleryImages,
}: AdminBarbershopSettingsFormProps) {
  const router = useRouter();

  const [shopName, setShopName] = useState(initialShopName);
  const [shopSlug, setShopSlug] = useState(initialShopSlug);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [phone, setPhone] = useState(initialPhone || '');
  const [description, setDescription] = useState(initialDescription || '');
  const [bookingCancellationNoticeHours, setBookingCancellationNoticeHours] = useState(
    String(initialBookingCancellationNoticeHours || 6),
  );
  const [bookingRefundMode, setBookingRefundMode] = useState<'automatic_full' | 'manual_review'>(
    initialBookingRefundMode,
  );
  const [bookingPolicyText, setBookingPolicyText] = useState(initialBookingPolicyText || '');
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
  const newImagesRef = useRef<NewShopImage[]>([]);
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
  const remainingSlots = Math.max(MAX_SHOP_IMAGES - totalImages, 0);
  const resolvedShopName = shopName.trim() || 'Tu barberia';
  const resolvedSlug = slugify(shopSlug || shopName);
  const publicProfileHref = resolvedSlug ? buildShopHref(resolvedSlug) : '/shops';
  const publicBookingHref = resolvedSlug ? buildShopHref(resolvedSlug, 'book') : '/shops';
  const locationSummary = [locationLabel.trim(), city.trim(), region.trim(), countryCode.trim()]
    .filter(Boolean)
    .join(' - ');
  const previewImages = [
    ...existingImages.map((image) => ({ ref: `existing:${image.id}`, url: image.publicUrl })),
    ...newImages.map((image) => ({ ref: `new-local:${image.id}`, url: image.previewUrl })),
  ];
  const coverPreviewUrl =
    previewImages.find((image) => image.ref === coverImageRef)?.url || previewImages[0]?.url || null;
  const completionItems = [
    {
      done: Boolean(resolvedShopName && resolvedSlug),
      label: 'Nombre y slug definidos',
      detail: 'La ruta publica necesita una identidad clara.',
    },
    {
      done: description.trim().length >= 40,
      label: 'Descripcion con contexto',
      detail: 'Ayuda a explicar el estilo del local.',
    },
    {
      done: Boolean(locationLabel.trim() || city.trim() || region.trim()),
      label: 'Ubicacion visible',
      detail: 'Sin ubicacion el cliente entiende peor el local.',
    },
    {
      done: totalImages >= MAX_RECOMMENDED_SHOP_IMAGES,
      label: 'Galeria recomendada',
      detail: `Ideal: ${MAX_RECOMMENDED_SHOP_IMAGES} fotos o mas.`,
    },
    {
      done: bookingPolicyText.trim().length >= 30,
      label: 'Politica visible',
      detail: 'Aclara cancelaciones y reembolsos antes del pago.',
    },
  ];
  const completionCount = completionItems.filter((item) => item.done).length;
  const quickLinks = [
    { href: '#business-settings', label: 'Identidad del local' },
    { href: '#public-profile', label: 'Perfil publico' },
    { href: '#booking-policy', label: 'Politicas de reserva' },
  ] as const;

  useEffect(() => {
    newImagesRef.current = newImages;
  }, [newImages]);

  useEffect(() => {
    return () => {
      newImagesRef.current.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });
    };
  }, []);

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

    const additions = Array.from(files)
      .filter((file) => file.size > 0)
      .slice(0, availableSlots)
      .map((file) => ({
        id: createLocalImageId(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));

    if (!additions.length) {
      return;
    }

    setNewImages((current) => [...current, ...additions]);

    if (!coverImageRef && additions[0]) {
      setCoverImageRef(`new-local:${additions[0].id}`);
    }
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const resolvedSubmitSlug = slugify(shopSlug || shopName);
    if (!resolvedSubmitSlug) {
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
    const cancellationNoticeHours = Number(bookingCancellationNoticeHours.trim());
    if ((latitude === null) !== (longitude === null)) {
      setSubmitting(false);
      setError('Si completas coordenadas, debes completar latitud y longitud.');
      return;
    }

    if (
      !Number.isInteger(cancellationNoticeHours) ||
      cancellationNoticeHours < 0 ||
      cancellationNoticeHours > 168
    ) {
      setSubmitting(false);
      setError('La ventana de cancelacion debe estar entre 0 y 168 horas.');
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
        shop_slug: resolvedSubmitSlug,
        timezone: timezone.trim() || 'UTC',
        phone: phone.trim() || null,
        description: description.trim() || null,
        booking_cancellation_notice_hours: cancellationNoticeHours,
        booking_staff_cancellation_refund_mode: bookingRefundMode,
        booking_cancellation_policy_text: bookingPolicyText.trim() || null,
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
      newImages.forEach((image) => formData.append('shopPhotos', image.file));

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
      newImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setNewImages([]);
      setSubmitting(false);
      setSuccess('Barberia actualizada correctamente.');
      router.replace(buildAdminHref('/admin/barbershop', result.shop_slug || resolvedSubmitSlug));
      router.refresh();
    } catch (requestError) {
      setSubmitting(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo actualizar la barberia.',
      );
    }
  }
 
  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? <p className="status-banner error">{error}</p> : null}
      {success ? <p className="status-banner success">{success}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.14fr)_320px]">
        <div className="space-y-5">
          <SettingsSection
            id="business-settings"
            eyebrow="Base del negocio"
            title="Identidad del local"
            description="Define el nombre, slug y datos base del workspace."
            badge={resolvedSlug ? `/shops/${resolvedSlug}` : 'Slug pendiente'}
          >
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
                description="Se normaliza automaticamente."
              />
            </div>

            <div className="rounded-[1.45rem] border border-white/65 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Ruta publica
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="meta-chip">
                  {resolvedSlug ? `/shops/${resolvedSlug}` : '/shops/tu-barberia'}
                </span>
                <span className="text-xs text-slate/75 dark:text-slate-400">
                  Si activas dominio propio, tambien se servira desde tu marca.
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Timezone"
                labelPlacement="inside"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                required
                description="Afecta horarios y validaciones."
              />
              <Input
                label="Telefono"
                labelPlacement="inside"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                description="Opcional, pero util para confianza."
              />
            </div>
          </SettingsSection>

          <SettingsSection
            id="public-profile"
            eyebrow="Storefront"
            title="Perfil publico"
            description="Descripcion, ubicacion y fotos que alimentan el perfil publico."
            badge={`${totalImages}/${MAX_SHOP_IMAGES} fotos`}
          >
            <Textarea
              label="Descripcion"
              labelPlacement="inside"
              minRows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              description="Aparece en el perfil publico y mejora conversion."
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Nombre de ubicacion"
                labelPlacement="inside"
                value={locationLabel}
                onChange={(event) => setLocationLabel(event.target.value)}
                description="Ejemplo: Casa central."
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

            <div className="rounded-[1.45rem] border border-white/65 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">
                    Ubicacion y coordenadas
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">
                    La direccion visible vive arriba; esto queda como soporte de discovery y mapas.
                  </p>
                </div>
                <span className="meta-chip">{locationSummary || 'Sin ubicacion visible'}</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Input
                  label="Pais"
                  labelPlacement="inside"
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value.toUpperCase())}
                />
                <Input
                  label="Latitud"
                  labelPlacement="inside"
                  value={latitudeInput}
                  onChange={(event) => setLatitudeInput(event.target.value)}
                  placeholder="-34.9011"
                  description="Opcional"
                />
                <Input
                  label="Longitud"
                  labelPlacement="inside"
                  value={longitudeInput}
                  onChange={(event) => setLongitudeInput(event.target.value)}
                  placeholder="-56.1645"
                  description="Opcional"
                />
              </div>
            </div>
            <div className="rounded-[1.55rem] border border-dashed border-white/70 bg-white/52 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">
                    Galeria del local
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">
                    Mantiene al menos una foto y elige una portada fuerte.
                  </p>
                </div>
                <span
                  className="meta-chip"
                  data-tone={totalImages >= MAX_RECOMMENDED_SHOP_IMAGES ? 'success' : undefined}
                >
                  {totalImages}/{MAX_RECOMMENDED_SHOP_IMAGES} recomendadas
                </span>
              </div>

              <label
                className={`mt-4 block rounded-[1.4rem] border border-dashed px-4 py-4 transition ${
                  totalImages >= MAX_SHOP_IMAGES
                    ? 'cursor-not-allowed border-white/40 bg-white/35 opacity-70 dark:border-white/10 dark:bg-white/[0.03]'
                    : 'cursor-pointer border-white/75 bg-white/65 hover:border-sky-300/55 hover:bg-white/80 dark:border-white/12 dark:bg-white/[0.05] dark:hover:border-sky-400/30'
                }`}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => handleAddPhotos(event.target.files)}
                  className="sr-only"
                  disabled={totalImages >= MAX_SHOP_IMAGES}
                />
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-white/70 bg-white/80 text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink dark:text-slate-100">
                        {totalImages >= MAX_SHOP_IMAGES
                          ? 'Limite de fotos alcanzado'
                          : 'Subir nuevas fotos'}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">
                        JPG, PNG o WEBP. Puedes cargar hasta {remainingSlots} archivo
                        {remainingSlots === 1 ? '' : 's'} mas.
                      </p>
                    </div>
                  </div>
                  <span className="meta-chip">{MAX_SHOP_IMAGES} maximo</span>
                </div>
              </label>

              {totalImages > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {existingImages.map((image) => {
                    const ref = `existing:${image.id}`;
                    const isCover = coverImageRef === ref;
                    return (
                      <div
                        key={image.id}
                        className="group relative overflow-hidden rounded-[1.35rem] border border-white/55 bg-slate-950/5 dark:border-white/10"
                      >
                        <img
                          src={image.publicUrl}
                          alt="Foto actual del local"
                          className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-slate-950/72 px-3 py-3 text-white backdrop-blur">
                          <button
                            type="button"
                            onClick={() => setCoverImageRef(ref)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              isCover ? 'bg-amber-400/20 text-amber-100' : 'bg-white/12 text-white'
                            }`}
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                isCover ? 'fill-current text-amber-300' : 'text-white/80'
                              }`}
                            />
                            {isCover ? 'Portada activa' : 'Usar de portada'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeExistingImage(image.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20 text-rose-100"
                            aria-label="Eliminar foto actual"
                          >
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
                      <div
                        key={image.id}
                        className="group relative overflow-hidden rounded-[1.35rem] border border-white/55 bg-slate-950/5 dark:border-white/10"
                      >
                        <img
                          src={image.previewUrl}
                          alt="Foto nueva del local"
                          className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-slate-950/72 px-3 py-3 text-white backdrop-blur">
                          <button
                            type="button"
                            onClick={() => setCoverImageRef(ref)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              isCover ? 'bg-amber-400/20 text-amber-100' : 'bg-white/12 text-white'
                            }`}
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                isCover ? 'fill-current text-amber-300' : 'text-white/80'
                              }`}
                            />
                            {isCover ? 'Portada activa' : 'Usar de portada'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeNewImage(image.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20 text-rose-100"
                            aria-label="Eliminar foto nueva"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-xs font-medium text-rose-600 dark:text-rose-300">
                  Debes mantener o subir al menos una foto.
                </p>
              )}
            </div>
          </SettingsSection>

          <SettingsSection
            id="booking-policy"
            eyebrow="Reservas"
            title="Politicas y friccion del checkout"
            description="Reglas visibles para clientes sobre cancelaciones y devoluciones."
            badge={bookingRefundMode === 'automatic_full' ? 'Automatico' : 'Revision manual'}
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <Input
                label="Cancelacion sin friccion (horas)"
                labelPlacement="inside"
                type="number"
                min={0}
                max={168}
                value={bookingCancellationNoticeHours}
                onChange={(event) => setBookingCancellationNoticeHours(event.target.value)}
                description="Rango admitido: 0 a 168 horas."
              />
              <div className="rounded-[1.45rem] border border-white/65 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 text-slate/75 dark:text-slate-300" />
                  <div>
                    <p className="text-sm font-semibold text-ink dark:text-slate-100">
                      Ventana actual
                    </p>
                    <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">
                      {resolveCancellationWindowLabel(bookingCancellationNoticeHours)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                className={`rounded-[1.4rem] border p-4 text-left transition ${
                  bookingRefundMode === 'automatic_full'
                    ? 'border-sky-300/45 bg-sky-500/10 shadow-[0_18px_30px_-24px_rgba(14,165,233,0.34)] dark:border-sky-400/25 dark:bg-sky-500/10'
                    : 'border-white/65 bg-white/45 dark:border-white/10 dark:bg-white/[0.03]'
                }`}
                onClick={() => setBookingRefundMode('automatic_full')}
              >
                <p className="text-sm font-semibold text-ink dark:text-slate-100">
                  Reembolso automatico 100%
                </p>
                <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">
                  Reduce soporte manual y deja claro el criterio cuando cancela el local.
                </p>
              </button>
              <button
                type="button"
                className={`rounded-[1.4rem] border p-4 text-left transition ${
                  bookingRefundMode === 'manual_review'
                    ? 'border-sky-300/45 bg-sky-500/10 shadow-[0_18px_30px_-24px_rgba(14,165,233,0.34)] dark:border-sky-400/25 dark:bg-sky-500/10'
                    : 'border-white/65 bg-white/45 dark:border-white/10 dark:bg-white/[0.03]'
                }`}
                onClick={() => setBookingRefundMode('manual_review')}
              >
                <p className="text-sm font-semibold text-ink dark:text-slate-100">
                  Revision manual
                </p>
                <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">
                  Sirve si el caso depende del staff o de una excepcion del negocio.
                </p>
              </button>
            </div>

            <Textarea
              label="Politica visible para clientes"
              labelPlacement="inside"
              minRows={4}
              value={bookingPolicyText}
              onChange={(event) => setBookingPolicyText(event.target.value)}
              description="Este texto aparece durante la reserva."
            />
          </SettingsSection>

          <div className="surface-card rounded-[1.75rem] p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink dark:text-slate-100">
                  Guardado centralizado
                </p>
                <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                  Actualiza identidad, perfil publico, galeria y politicas en una sola accion.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  isLoading={submitting}
                  isDisabled={submitting}
                  className="action-primary px-5 text-sm font-semibold"
                >
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
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="surface-card rounded-[1.7rem] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Ir directo
            </p>
            <div className="mt-3 grid gap-2">
              {quickLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-[1.1rem] border border-white/65 bg-white/45 px-3 py-3 text-sm font-semibold text-ink no-underline transition hover:border-white/90 hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-100"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="surface-card overflow-hidden rounded-[1.8rem] p-0">
            <div className="relative h-44 overflow-hidden bg-slate-950">
              {coverPreviewUrl ? (
                <img
                  src={coverPreviewUrl}
                  alt="Vista previa de portada"
                  className="h-full w-full object-cover opacity-95"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))]">
                  <Scissors className="h-10 w-10 text-white/70" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              <div className="absolute left-4 top-4">
                <span className="meta-chip bg-white/18 text-white dark:bg-white/18 dark:text-white">
                  Vista previa publica
                </span>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <p className="text-lg font-semibold text-ink dark:text-slate-100">
                  {resolvedShopName}
                </p>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  {description.trim()
                    ? truncateText(description.trim(), 148)
                    : 'Todavia no hay una descripcion visible para clientes.'}
                </p>
              </div>

              <div className="grid gap-2">
                <div className="flex items-start gap-2 rounded-[1.1rem] border border-white/60 bg-white/45 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate/75 dark:text-slate-300" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                      Ubicacion
                    </p>
                    <p className="mt-1 text-sm text-ink dark:text-slate-100">
                      {locationSummary || 'Sin ubicacion visible'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-[1.1rem] border border-white/60 bg-white/45 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <Phone className="mt-0.5 h-4 w-4 text-slate/75 dark:text-slate-300" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                      Contacto y horario
                    </p>
                    <p className="mt-1 text-sm text-ink dark:text-slate-100">
                      {phone.trim() || 'Telefono opcional'}
                    </p>
                    <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">{timezone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-[1.1rem] border border-white/60 bg-white/45 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-slate/75 dark:text-slate-300" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                      Politica visible
                    </p>
                    <p className="mt-1 text-sm text-ink dark:text-slate-100">
                      {bookingPolicyText.trim()
                        ? truncateText(bookingPolicyText.trim(), 110)
                        : 'Sin texto publico cargado.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={publicProfileHref}
                  target="_blank"
                  rel="noreferrer"
                  className="action-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold no-underline"
                >
                  Ver perfil
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href={publicBookingHref}
                  target="_blank"
                  rel="noreferrer"
                  className="action-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold no-underline"
                >
                  Ver reservas
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="surface-card rounded-[1.7rem] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Checklist de publicacion
                </p>
                <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                  Te ayuda a ver rapido si esta pagina ya se siente lista de cara al cliente.
                </p>
              </div>
              <span
                className="meta-chip"
                data-tone={completionCount === completionItems.length ? 'success' : undefined}
              >
                {completionCount}/{completionItems.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {completionItems.map((item) => (
                <ChecklistItem
                  key={item.label}
                  done={item.done}
                  label={item.label}
                  detail={item.detail}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
