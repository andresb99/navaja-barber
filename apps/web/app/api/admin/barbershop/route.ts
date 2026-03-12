import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import { sanitizeText, sanitizeUnknownDeep } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const MAX_RECOMMENDED_SHOP_IMAGES = 3;
const MAX_SHOP_IMAGES = 6;
const MAX_SHOP_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_SHOP_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PUBLIC_ASSETS_BUCKET = 'public-assets';

const barbershopUpdatePayloadSchema = z.object({
  shop_id: z.string().uuid(),
  shop_name: z.string().trim().min(2).max(120),
  shop_slug: z.string().trim().min(1).max(160),
  timezone: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().max(1500).optional().nullable(),
  booking_cancellation_notice_hours: z.number().int().min(0).max(168).optional(),
  booking_staff_cancellation_refund_mode: z
    .enum(['automatic_full', 'manual_review'])
    .optional(),
  booking_cancellation_policy_text: z.string().trim().max(1500).optional().nullable(),
  location_label: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  country_code: z.string().trim().max(8).optional().nullable(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  retained_image_ids: z.array(z.string().uuid()).max(MAX_SHOP_IMAGES).optional().nullable(),
  cover_image_ref: z.string().trim().max(120).optional().nullable(),
});

interface ShopRow {
  id: string;
  slug: string;
  cover_image_url: string | null;
}

interface GalleryRow {
  id: string;
  shop_id: string;
  storage_path: string;
  public_url: string;
  sort_order: number;
  created_at: string | null;
}

function isMissingShopGalleryTableError(error: unknown) {
  if (!error) {
    return false;
  }

  const maybeError = error as { code?: string; message?: string };
  const code = String(maybeError.code || '').toUpperCase();
  const message = String(maybeError.message || error || '').toLowerCase();

  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    (message.includes('shop_gallery_images') &&
      (message.includes('schema cache') || message.includes('does not exist') || message.includes('not found')))
  );
}

function getMissingGalleryTableMessage() {
  return 'Falta la tabla de galeria en tu base. Aplica la migracion 202603040001_shop_gallery_images.sql y vuelve a intentar.';
}

function isBucketAlreadyExistsError(error: unknown) {
  if (!error) {
    return false;
  }

  const maybeError = error as { statusCode?: number | string; status?: number | string; message?: string };
  const statusCode = String(maybeError.statusCode ?? maybeError.status ?? '').trim();
  const message = String(maybeError.message || error || '').toLowerCase();

  return statusCode === '409' || message.includes('already exists') || message.includes('duplicate');
}

async function ensurePublicAssetsBucket(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const { error } = await admin.storage.createBucket(PUBLIC_ASSETS_BUCKET, {
    public: true,
    allowedMimeTypes: Array.from(ALLOWED_SHOP_IMAGE_TYPES),
    fileSizeLimit: `${MAX_SHOP_IMAGE_SIZE}`,
  });

  if (error && !isBucketAlreadyExistsError(error)) {
    throw new Error(error.message || 'No se pudo preparar el bucket de imagenes.');
  }
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function getFileExtension(file: File) {
  if (file.name.includes('.')) {
    const fromName = file.name.split('.').pop()?.trim().toLowerCase();
    if (fromName) {
      return fromName;
    }
  }

  if (file.type === 'image/png') {
    return 'png';
  }

  if (file.type === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

function getRequestErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export async function POST(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    return new NextResponse('Debes iniciar sesion para editar la barberia.', { status: 401 });
  }

  const formData = await request.formData();
  const payloadRaw = sanitizeText(formData.get('payload'), { trim: true });
  const uploadedFiles = formData
    .getAll('shopPhotos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!payloadRaw) {
    return new NextResponse('Solicitud multipart invalida.', { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    return new NextResponse('Datos de edicion invalidos.', { status: 400 });
  }

  const parsedPayload = barbershopUpdatePayloadSchema.safeParse(sanitizeUnknownDeep(payload));
  if (!parsedPayload.success) {
    return new NextResponse(
      parsedPayload.error.flatten().formErrors.join(', ') || 'Datos de edicion invalidos.',
      { status: 400 },
    );
  }

  for (const file of uploadedFiles) {
    if (!ALLOWED_SHOP_IMAGE_TYPES.has(file.type)) {
      return new NextResponse('Solo aceptamos imagenes JPG, PNG o WEBP para el local.', { status: 400 });
    }

    if (file.size > MAX_SHOP_IMAGE_SIZE) {
      return new NextResponse('Cada foto del local debe pesar menos de 8MB.', { status: 400 });
    }
  }

  const admin = createSupabaseAdminClient();
  const data = parsedPayload.data;

  const [{ data: ownedShop }, { data: membership }, { data: staffAdmin }] = await Promise.all([
    admin
      .from('shops')
      .select('id')
      .eq('id', data.shop_id)
      .eq('owner_user_id', user.id)
      .maybeSingle(),
    admin
      .from('shop_memberships')
      .select('id')
      .eq('shop_id', data.shop_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .eq('membership_status', 'active')
      .maybeSingle(),
    admin
      .from('staff')
      .select('id')
      .eq('shop_id', data.shop_id)
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .eq('role', 'admin')
      .maybeSingle(),
  ]);

  if (!ownedShop?.id && !membership?.id && !staffAdmin?.id) {
    return new NextResponse('No tienes permisos para editar esta barberia.', { status: 403 });
  }

  const { data: shopRow, error: shopError } = await admin
    .from('shops')
    .select('id, slug, cover_image_url')
    .eq('id', data.shop_id)
    .maybeSingle();

  if (shopError || !shopRow) {
    return new NextResponse('No encontramos la barberia a editar.', { status: 404 });
  }

  const currentShop = shopRow as ShopRow;

  const { data: galleryRows, error: galleryError } = await admin
    .from('shop_gallery_images')
    .select('id, shop_id, storage_path, public_url, sort_order, created_at')
    .eq('shop_id', data.shop_id)
    .order('sort_order')
    .order('created_at');

  if (galleryError) {
    if (isMissingShopGalleryTableError(galleryError)) {
      return new NextResponse(getMissingGalleryTableMessage(), { status: 503 });
    }

    return new NextResponse(galleryError.message, { status: 400 });
  }

  const existingGalleryRows = (galleryRows || []) as GalleryRow[];
  const existingById = new Map(existingGalleryRows.map((item) => [item.id, item]));
  const retainedImageIds =
    data.retained_image_ids == null
      ? existingGalleryRows.map((item) => item.id)
      : Array.from(new Set(data.retained_image_ids));

  if (retainedImageIds.some((id) => !existingById.has(id))) {
    return new NextResponse('Intentaste conservar fotos que ya no existen.', { status: 400 });
  }

  const retainedGalleryRows = retainedImageIds
    .map((id) => existingById.get(id))
    .filter((item): item is GalleryRow => item !== undefined);

  if (retainedGalleryRows.length + uploadedFiles.length < 1) {
    return new NextResponse('Debes mantener o subir al menos una foto del local.', { status: 400 });
  }

  if (retainedGalleryRows.length + uploadedFiles.length > MAX_SHOP_IMAGES) {
    return new NextResponse(`Puedes mantener/subir hasta ${MAX_SHOP_IMAGES} fotos por ahora.`, { status: 400 });
  }

  const uploadedStoragePaths: string[] = [];
  const uploadedRows: Array<{
    ref: string;
    storage_path: string;
    public_url: string;
  }> = [];

  try {
    if (uploadedFiles.length > 0) {
      await ensurePublicAssetsBucket(admin);
    }

    for (const [index, file] of uploadedFiles.entries()) {
      const ext = getFileExtension(file);
      const safeName = sanitizeFilename(file.name || `shop-photo-${index + 1}.${ext}`);
      const storagePath = `shops/${data.shop_id}/gallery/${Date.now()}-${index + 1}-${randomUUID()}-${safeName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await admin.storage.from(PUBLIC_ASSETS_BUCKET).upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      uploadedStoragePaths.push(storagePath);
      const {
        data: { publicUrl },
      } = admin.storage.from(PUBLIC_ASSETS_BUCKET).getPublicUrl(storagePath);

      uploadedRows.push({
        ref: `new:${index}`,
        storage_path: storagePath,
        public_url: publicUrl,
      });
    }

    const requestedCoverRef = data.cover_image_ref?.trim() || null;
    const resolvedCoverUrlFromRetained =
      requestedCoverRef && requestedCoverRef.startsWith('existing:')
        ? retainedGalleryRows.find((item) => item.id === requestedCoverRef.slice('existing:'.length))?.public_url || null
        : null;
    const resolvedCoverUrlFromUploads =
      requestedCoverRef && requestedCoverRef.startsWith('new:')
        ? uploadedRows.find((item) => item.ref === requestedCoverRef)?.public_url || null
        : null;
    const resolvedExistingCoverUrl =
      !requestedCoverRef && currentShop.cover_image_url
        ? retainedGalleryRows.find((item) => item.public_url === currentShop.cover_image_url)?.public_url || null
        : null;
    const coverImageUrl =
      resolvedCoverUrlFromRetained ||
      resolvedCoverUrlFromUploads ||
      resolvedExistingCoverUrl ||
      retainedGalleryRows[0]?.public_url ||
      uploadedRows[0]?.public_url ||
      null;

    if (!coverImageUrl) {
      throw new Error('No se pudo definir la portada. Mantiene o sube al menos una foto.');
    }

    const { error: shopUpdateError } = await admin
      .from('shops')
      .update({
        name: data.shop_name.trim(),
        slug: data.shop_slug.trim(),
        timezone: data.timezone.trim(),
        phone: data.phone?.trim() || null,
        description: data.description?.trim() || null,
        booking_cancellation_notice_hours: data.booking_cancellation_notice_hours ?? 6,
        booking_staff_cancellation_refund_mode:
          data.booking_staff_cancellation_refund_mode || 'automatic_full',
        booking_cancellation_policy_text: data.booking_cancellation_policy_text?.trim() || null,
        cover_image_url: coverImageUrl,
      })
      .eq('id', data.shop_id);

    if (shopUpdateError) {
      throw new Error(shopUpdateError.message);
    }

    const { error: locationError } = await admin.from('shop_locations').upsert(
      {
        shop_id: data.shop_id,
        label: data.location_label?.trim() || null,
        city: data.city?.trim() || null,
        region: data.region?.trim() || null,
        country_code: data.country_code?.trim().toUpperCase() || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        is_public: true,
      },
      {
        onConflict: 'shop_id',
      },
    );

    if (locationError) {
      throw new Error(locationError.message);
    }

    const removedGalleryRows = existingGalleryRows.filter((item) => !retainedImageIds.includes(item.id));
    if (removedGalleryRows.length > 0) {
      const { error: removeRowsError } = await admin
        .from('shop_gallery_images')
        .delete()
        .in(
          'id',
          removedGalleryRows.map((item) => item.id),
        );

      if (removeRowsError) {
        throw new Error(removeRowsError.message);
      }
    }

    if (retainedGalleryRows.length > 0) {
      for (const [index, row] of retainedGalleryRows.entries()) {
        const { error: sortUpdateError } = await admin
          .from('shop_gallery_images')
          .update({ sort_order: index })
          .eq('id', row.id);

        if (sortUpdateError) {
          throw new Error(sortUpdateError.message);
        }
      }
    }

    if (uploadedRows.length > 0) {
      const { error: insertGalleryError } = await admin.from('shop_gallery_images').insert(
        uploadedRows.map((row, index) => ({
          shop_id: data.shop_id,
          storage_path: row.storage_path,
          public_url: row.public_url,
          sort_order: retainedGalleryRows.length + index,
        })),
      );

      if (insertGalleryError) {
        throw new Error(insertGalleryError.message);
      }
    }

    const removedStoragePaths = existingGalleryRows
      .filter((item) => !retainedImageIds.includes(item.id))
      .map((item) => item.storage_path);

    if (removedStoragePaths.length > 0) {
      await admin.storage.from(PUBLIC_ASSETS_BUCKET).remove(removedStoragePaths);
    }

    const previousSlug = currentShop.slug;
    const nextSlug = data.shop_slug.trim();

    revalidatePath('/admin');
    revalidatePath('/admin/barbershop');
    revalidatePath('/shops');
    revalidatePath('/courses');
    if (previousSlug) {
      revalidatePath(`/shops/${previousSlug}`);
      revalidatePath(`/shops/${previousSlug}/courses`);
    }
    if (nextSlug && nextSlug !== previousSlug) {
      revalidatePath(`/shops/${nextSlug}`);
      revalidatePath(`/shops/${nextSlug}/courses`);
    }

    return NextResponse.json({
      shop_id: data.shop_id,
      shop_slug: nextSlug,
      total_images: retainedGalleryRows.length + uploadedRows.length,
      recommended_images: MAX_RECOMMENDED_SHOP_IMAGES,
    });
  } catch (error) {
    if (uploadedStoragePaths.length > 0) {
      await admin.storage.from(PUBLIC_ASSETS_BUCKET).remove(uploadedStoragePaths);
    }

    if (isMissingShopGalleryTableError(error)) {
      return new NextResponse(getMissingGalleryTableMessage(), { status: 503 });
    }

    return new NextResponse(getRequestErrorMessage(error, 'No se pudo actualizar la barberia.'), {
      status: 400,
    });
  }
}
