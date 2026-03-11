import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JobsForm } from '@/components/public/jobs-form';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';
import { Container } from '@/components/heroui/container';

interface ShopJobsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ShopJobsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    return {};
  }

  return buildTenantPageMetadata({
    shop,
    title: `Trabaja en ${shop.name}`,
    description: `Postulaciones y vacantes abiertas dentro del workspace de ${shop.name}.`,
    section: 'jobs',
  });
}

export default async function ShopJobsPage({ params }: ShopJobsPageProps) {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <Container variant="hero" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Talento</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Postulate para trabajar en {shop.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              El CV y el pipeline de reclutamiento quedan aislados dentro de este workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Tenant
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Aislado</p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                CV
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Privado</p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Marca
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">{shop.slug}</p>
            </div>
          </div>
        </div>
      </Container>
      <JobsForm shopId={shop.id} />
    </section>
  );
}
