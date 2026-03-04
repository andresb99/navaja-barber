import Link from 'next/link';
import { Card, CardBody } from '@heroui/card';
import { AdminBarbershopSettingsForm } from '@/components/admin/barbershop-settings-form';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildAdminHref } from '@/lib/workspace-routes';

interface AdminBarbershopSettingsPageProps {
  searchParams: Promise<{ shop?: string }>;
}

interface ShopRow {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  phone: string | null;
  description: string | null;
  cover_image_url: string | null;
}

interface LocationRow {
  label: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface GalleryRow {
  id: string;
  public_url: string | null;
}

export default async function AdminBarbershopSettingsPage({
  searchParams,
}: AdminBarbershopSettingsPageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const supabase = await createSupabaseServerClient();

  const [{ data: shop }, { data: location }, { data: gallery }] = await Promise.all([
    supabase
      .from('shops')
      .select('id, name, slug, timezone, phone, description, cover_image_url')
      .eq('id', ctx.shopId)
      .maybeSingle(),
    supabase
      .from('shop_locations')
      .select('label, city, region, country_code, latitude, longitude')
      .eq('shop_id', ctx.shopId)
      .maybeSingle(),
    supabase
      .from('shop_gallery_images')
      .select('id, public_url, sort_order, created_at')
      .eq('shop_id', ctx.shopId)
      .order('sort_order')
      .order('created_at'),
  ]);

  const shopData = (shop as ShopRow | null) || null;
  const locationData = (location as LocationRow | null) || null;
  const galleryRows = ((gallery || []) as GalleryRow[]).filter(
    (item) => typeof item.public_url === 'string' && item.public_url.trim().length > 0,
  );

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="hero-eyebrow">Configuracion</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.2rem] dark:text-slate-100">
              Editar barberia
            </h1>
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              Actualiza nombre, slug, ubicacion y fotos publicas de {ctx.shopName}.
            </p>
          </div>

          <Link
            href={buildAdminHref('/admin', ctx.shopSlug)}
            className="action-secondary inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold no-underline"
          >
            Volver al panel
          </Link>
        </div>
      </div>

      <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
        <CardBody className="space-y-5 p-5 md:p-6">
          <AdminBarbershopSettingsForm
            shopId={ctx.shopId}
            initialShopName={shopData?.name || ctx.shopName}
            initialShopSlug={shopData?.slug || ctx.shopSlug}
            initialTimezone={shopData?.timezone || ctx.shopTimezone}
            initialPhone={shopData?.phone || null}
            initialDescription={shopData?.description || null}
            initialLocationLabel={locationData?.label || null}
            initialCity={locationData?.city || null}
            initialRegion={locationData?.region || null}
            initialCountryCode={locationData?.country_code || 'UY'}
            initialLatitude={locationData?.latitude ?? null}
            initialLongitude={locationData?.longitude ?? null}
            initialCoverImageUrl={shopData?.cover_image_url || null}
            initialGalleryImages={galleryRows.map((item) => ({
              id: item.id,
              publicUrl: String(item.public_url),
            }))}
          />
        </CardBody>
      </Card>
    </section>
  );
}
