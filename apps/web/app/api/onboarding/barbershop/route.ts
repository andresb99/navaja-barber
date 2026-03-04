import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const MIN_REQUIRED_SHOP_IMAGES = 1;
const MAX_RECOMMENDED_SHOP_IMAGES = 3;
const MAX_SHOP_IMAGES = 6;
const MAX_SHOP_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_SHOP_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PUBLIC_ASSETS_BUCKET = 'public-assets';

const barbershopOnboardingPayloadSchema = z.object({
  shop_name: z.string().trim().min(2).max(120),
  shop_slug: z.string().trim().min(1).max(160),
  timezone: z.string().trim().min(1).max(100),
  owner_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().max(1500).optional().nullable(),
  location_label: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  country_code: z.string().trim().max(8).optional().nullable(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

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

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Debes iniciar sesion para crear una barberia.', { status: 401 });
  }

  const formData = await request.formData();
  const payloadRaw = formData.get('payload');
  const uploadedFiles = formData
    .getAll('shopPhotos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (typeof payloadRaw !== 'string') {
    return new NextResponse('Solicitud multipart invalida.', { status: 400 });
  }

  if (uploadedFiles.length < MIN_REQUIRED_SHOP_IMAGES) {
    return new NextResponse('Debes subir al menos una foto del local para crear tu barberia.', { status: 400 });
  }

  if (uploadedFiles.length > MAX_SHOP_IMAGES) {
    return new NextResponse(`Puedes subir hasta ${MAX_SHOP_IMAGES} fotos por ahora.`, { status: 400 });
  }

  for (const file of uploadedFiles) {
    if (!ALLOWED_SHOP_IMAGE_TYPES.has(file.type)) {
      return new NextResponse('Solo aceptamos imagenes JPG, PNG o WEBP para el local.', { status: 400 });
    }

    if (file.size > MAX_SHOP_IMAGE_SIZE) {
      return new NextResponse('Cada foto del local debe pesar menos de 8MB.', { status: 400 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    return new NextResponse('Datos del onboarding invalidos.', { status: 400 });
  }

  const parsedPayload = barbershopOnboardingPayloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return new NextResponse(
      parsedPayload.error.flatten().formErrors.join(', ') || 'Datos del onboarding invalidos.',
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const storagePaths: string[] = [];
  let createdShopId: string | null = null;
  let createdShopSlug: string | null = null;

  try {
    await ensurePublicAssetsBucket(admin);

    const { data, error: rpcError } = await supabase.rpc('bootstrap_shop_owner', {
      p_shop_name: parsedPayload.data.shop_name,
      p_shop_slug: parsedPayload.data.shop_slug,
      p_timezone: parsedPayload.data.timezone,
      p_owner_name: parsedPayload.data.owner_name,
      p_contact_phone: parsedPayload.data.phone?.trim() || null,
      p_description: parsedPayload.data.description?.trim() || null,
      p_location_label: parsedPayload.data.location_label?.trim() || null,
      p_city: parsedPayload.data.city?.trim() || null,
      p_region: parsedPayload.data.region?.trim() || null,
      p_country_code: parsedPayload.data.country_code?.trim().toUpperCase() || null,
      p_latitude: parsedPayload.data.latitude ?? null,
      p_longitude: parsedPayload.data.longitude ?? null,
    });

    if (rpcError) {
      return new NextResponse(rpcError.message, { status: 400 });
    }

    const row = Array.isArray(data)
      ? (data[0] as { shop_id?: string; shop_slug?: string } | undefined)
      : undefined;

    if (!row?.shop_id) {
      return new NextResponse('No se pudo crear la barberia.', { status: 400 });
    }

    createdShopId = row.shop_id;
    createdShopSlug = row.shop_slug || parsedPayload.data.shop_slug;

    const galleryRows: Array<{
      shop_id: string;
      storage_path: string;
      public_url: string;
      sort_order: number;
    }> = [];

    for (const [index, file] of uploadedFiles.entries()) {
      const ext = getFileExtension(file);
      const safeName = sanitizeFilename(file.name || `shop-photo-${index + 1}.${ext}`);
      const storagePath = `shops/${createdShopId}/gallery/${index + 1}-${randomUUID()}-${safeName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await admin.storage.from(PUBLIC_ASSETS_BUCKET).upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      storagePaths.push(storagePath);

      const {
        data: { publicUrl },
      } = admin.storage.from(PUBLIC_ASSETS_BUCKET).getPublicUrl(storagePath);

      galleryRows.push({
        shop_id: createdShopId,
        storage_path: storagePath,
        public_url: publicUrl,
        sort_order: index,
      });
    }

    const primaryImage = galleryRows[0];
    if (!primaryImage) {
      throw new Error('Debes subir al menos una foto del local para crear tu barberia.');
    }

    const { error: galleryInsertError } = await admin.from('shop_gallery_images').insert(galleryRows);
    if (galleryInsertError) {
      throw new Error(galleryInsertError.message);
    }

    const { error: coverUpdateError } = await admin
      .from('shops')
      .update({
        cover_image_url: primaryImage.public_url,
      })
      .eq('id', createdShopId);

    if (coverUpdateError) {
      throw new Error(coverUpdateError.message);
    }

    return NextResponse.json({
      shop_id: createdShopId,
      shop_slug: createdShopSlug,
      uploaded_images: galleryRows.length,
      recommended_images: MAX_RECOMMENDED_SHOP_IMAGES,
    });
  } catch (error) {
    if (storagePaths.length > 0) {
      await admin.storage.from(PUBLIC_ASSETS_BUCKET).remove(storagePaths);
    }

    if (createdShopId) {
      await admin.from('shops').delete().eq('id', createdShopId);
    }

    if (isMissingShopGalleryTableError(error)) {
      return new NextResponse(getMissingGalleryTableMessage(), { status: 503 });
    }

    return new NextResponse(getRequestErrorMessage(error, 'No se pudo completar el onboarding de la barberia.'), {
      status: 400,
    });
  }
}
