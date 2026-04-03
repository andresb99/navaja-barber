import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@navaja/shared';
import { CourseMediaCard } from '@/components/public/course-media-card';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildTenantCourseHref, buildTenantPublicHref } from '@/lib/shop-links';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';
import { Container } from '@/components/heroui/container';
import { ShopPageBreadcrumb } from '@/components/public/shop-page-breadcrumb';

interface ShopCoursesPageProps {
  params: Promise<{ slug: string }>;
}

interface ShopCourseRow {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  duration_hours: number;
  level: string;
  image_url: string | null;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  intermediate: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  advanced: 'bg-rose-500/15 text-rose-300 border border-rose-500/20',
};

export async function generateMetadata({ params }: ShopCoursesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    return {};
  }

  return buildTenantPageMetadata({
    shop,
    title: `Cursos de ${shop.name}`,
    description: `Catalogo de cursos, workshops y sesiones publicadas por ${shop.name}.`,
    section: 'courses',
  });
}

export default async function ShopCoursesPage({ params }: ShopCoursesPageProps) {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);
  const routeContext = await getPublicTenantRouteContext();

  if (!shop) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, description, price_cents, duration_hours, level, image_url')
    .eq('shop_id', shop.id)
    .eq('is_active', true)
    .order('title');

  return (
    <section className="min-h-screen bg-at-page font-sans text-at-body pb-32 tenant-atelier">
      {/* Hero Section */}
      <div className="relative flex min-h-[60vh] sm:min-h-[75vh] w-full flex-col justify-end bg-at-page">
        <div className="absolute inset-0 z-0">
          <img
            src={shop.imageUrls[0] || "https://images.unsplash.com/photo-1585747860715-2ba11e20ee14?q=80&w=2670&auto=format&fit=crop"}
            alt="Academy Background"
            className="h-full w-full object-cover opacity-60 grayscale brightness-[0.4]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-at-page via-at-page/80 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-at-page/80 via-transparent to-transparent z-10" />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 md:px-16 w-full pt-32 pb-16 sm:pb-24">
          <div className="max-w-3xl">
            <div className="inline-block rounded-full border border-at-accent/30 bg-at-raised/80 backdrop-blur-md px-4 py-1.5 mb-6">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-at-accent-light">
                PRO-LEVEL CERTIFICATION
              </p>
            </div>
            
            <h1 className="font-[family-name:var(--font-heading)] text-5xl sm:text-7xl md:text-8xl lg:text-[8rem] font-extrabold uppercase tracking-tighter text-at-heading leading-[0.85] mb-6 drop-shadow-2xl">
              ACADEMIA
            </h1>
            
            <p className="text-base sm:text-lg text-at-muted font-light leading-relaxed max-w-xl mb-10 text-shadow-sm">
              Master the craft of nocturnal grooming. From fundamental aesthetics to high-precision engineering, join the elite circle of {shop.name} barbers.
            </p>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <a href="#curriculum" className="w-full sm:w-auto rounded-full bg-at-accent-light px-8 py-3.5 text-[15px] font-bold text-at-accent-on transition-all hover:bg-at-accent hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_-10px_rgba(var(--at-accent),0.5)] flex items-center justify-center gap-2">
                Explore Catalog
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </a>
              <button className="w-full sm:w-auto rounded-full border border-at-border/10 bg-at-border/5 backdrop-blur-md px-8 py-3.5 text-[15px] font-bold text-at-heading transition-all hover:bg-at-border/10 hover:border-at-border/20 flex items-center justify-center active:scale-95">
                View Academy Tour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-16 relative z-20 mb-12 sm:mb-16 md:mb-32 mt-8 md:mt-12">
        <div className="grid gap-4 sm:gap-8 sm:grid-cols-3">
          <div className="flex flex-col md:flex-row md:items-start gap-4 border-l-2 border-at-accent pl-6 py-2">
            <div className="hidden md:flex mt-1 text-at-accent">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>
            <div className="flex-1 w-full">
              <div className="flex items-baseline justify-between mb-2 w-full">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-at-heading">Active Courses</span>
                <span className="text-3xl md:text-4xl font-black text-at-heading">0{(courses || []).length}</span>
              </div>
              <p className="text-xs text-at-faint leading-relaxed">Specialized modules designed for modern urban techniques.</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-start gap-4 border-l-2 border-at-accent pl-6 py-2">
            <div className="hidden md:flex mt-1 text-at-accent">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 15v-6"/><path d="M11 15v-4"/><path d="M15 15v-2"/></svg>
            </div>
            <div className="flex-1 w-full">
              <div className="flex items-baseline justify-between mb-2 w-full">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-at-heading">Expert Levels</span>
                <span className="text-3xl md:text-4xl font-black text-at-heading">All</span>
              </div>
              <p className="text-xs text-at-faint leading-relaxed">Curriculum adapted for beginners to master tier artisans.</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-start gap-4 border-l-2 border-at-accent pl-6 py-2">
            <div className="hidden md:flex mt-1 text-at-accent">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
            </div>
            <div className="flex-1 w-full">
               <div className="flex items-baseline justify-between mb-2 w-full">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-at-heading">Session Format</span>
                <span className="text-3xl md:text-4xl font-black text-at-heading">Hybrid</span>
              </div>
              <p className="text-xs text-at-faint leading-relaxed">Blended learning - in person masterclasses & digital theory.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Grid */}
      <div id="curriculum" className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-16 mb-12 sm:mb-16 md:mb-24">
        <div className="flex items-center justify-between border-b-2 border-at-border/5 pb-2 mb-10 w-full relative">
           <div className="absolute -bottom-0.5 left-0 w-32 h-[2px] bg-at-accent" />
           <h2 className="font-[family-name:var(--font-heading)] text-3xl font-extrabold italic uppercase tracking-tighter text-at-heading">
             ELITE CURRICULUM
           </h2>
           <div className="flex gap-2">
             <button className="w-8 h-8 rounded bg-at-border/5 flex items-center justify-center hover:bg-at-border/10 transition-colors">
               <svg className="w-4 h-4 text-at-heading" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
             </button>
           </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(courses || []).length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-[1rem] border border-at-border/5 bg-at-raised/50 py-32 text-center backdrop-blur-sm">
              <p className="text-sm font-bold uppercase tracking-widest text-at-muted">
                Aún no hay cursos activos en esta academia
              </p>
            </div>
          ) : null}

          {((courses || []) as ShopCourseRow[]).map((course) => {
            const imageUrl = course.image_url ?? shop.imageUrls[0] ?? 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1500&auto=format&fit=crop';
            const levelKey = course.level?.toLowerCase() ?? '';
            
            return (
              <article key={course.id} className="group overflow-hidden rounded-[1rem] bg-at-border/5 ring-1 ring-at-border/5 flex flex-col justify-between transition-all hover:-translate-y-1 hover:ring-at-border/10 hover:shadow-[0_15px_30px_-15px_rgba(0,0,0,0.8)]">
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-black w-full">
                    <img
                      src={imageUrl}
                      alt={course.title}
                      className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-80" />
                    
                    <div className="absolute top-4 right-4 rounded-full bg-at-raised/80 backdrop-blur-md px-3 py-1 ring-1 ring-at-border/10">
                       <span className="text-[9px] font-bold uppercase tracking-wider text-at-heading">
                         {LEVEL_LABELS[levelKey] ?? course.level}
                       </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-at-faint">
                        {course.duration_hours} HORAS
                      </p>
                      <p className="text-lg font-black text-at-accent-light">
                        {formatCurrency(course.price_cents)}
                      </p>
                    </div>
                    
                    <h3 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-at-heading tracking-tight mb-3">
                      {course.title}
                    </h3>
                    
                    <p className="text-xs text-at-faint leading-relaxed line-clamp-3 mb-6 font-medium">
                      {course.description}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 mt-auto">
                   <div className="flex items-center gap-3">
                     <Link
                        href={buildTenantCourseHref(shop.slug, String(course.id), routeContext.mode)}
                        className="flex-1 rounded-[0.8rem] bg-at-accent-light py-3.5 flex items-center justify-center gap-2 text-[13px] font-bold text-at-accent-on transition-all hover:bg-at-accent hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_-10px_rgba(var(--at-accent),0.4)]"
                     >
                        Ver Detalles
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                     </Link>
                     <button className="flex h-12 w-12 items-center justify-center rounded-[0.8rem] bg-at-border/5 text-at-heading transition-all hover:bg-at-border/10 ring-1 ring-at-border/10 hover:scale-[1.02] active:scale-95">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                     </button>
                   </div>
                </div>
              </article>
            );
          })}
        </div>
        
        {courses && courses.length > 0 && (
          <div className="mt-12 flex justify-center">
              <Link
                href={buildTenantPublicHref(shop.slug, routeContext.mode, 'courses')}
                className="inline-flex items-center gap-2 rounded-full bg-at-accent-light px-8 py-3.5 text-[15px] font-bold text-at-accent-on transition-all hover:bg-at-accent hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_-10px_rgba(var(--at-accent),0.5)]"
              >
                Ver Catálogo Completo
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
          </div>
        )}
      </div>

       {/* Learn from the architects Section */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-16 mb-12 sm:mb-16 md:mb-24">
         <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-24 items-center">
            <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden ring-1 ring-at-border/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] order-2 md:order-1">
               <img 
                 src={shop.imageUrls[1] || shop.imageUrls[0] || shop.logoUrl || "https://images.unsplash.com/photo-1503951914875-452162b0f3ee?q=80&w=1500&auto=format&fit=crop"} 
                 className="w-full h-full object-cover grayscale brightness-75" 
                 alt="Master Barber" 
               />
               <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-at-deep/80 to-transparent">
                  <div className="rounded-xl bg-at-deep/60 backdrop-blur-md p-4 ring-1 ring-at-border/10 inline-block">
                     <p className="text-sm font-bold text-at-heading mb-1">EST. 2014</p>
                     <p className="text-[9px] font-bold uppercase tracking-widest text-at-accent">Award Winning Mentors</p>
                  </div>
               </div>
            </div>
            
            <div>
               <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-at-accent mb-4">CRAFTSMANSHIP FIRST</p>
               <h2 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tighter text-at-heading mb-6 leading-[0.95]">
                 LEARN FROM THE <br/>ARCHITECTS OF STYLE.
               </h2>
               <p className="text-sm text-at-muted font-light leading-relaxed mb-10 max-w-lg">
                 Our instructors are not just teachers; they are industry disruptors. Each mentor brings a decade of experience in high-fashion grooming, editorial styling, and precision barbering.
               </p>
               
               <div className="space-y-6">
                  <div className="flex gap-4">
                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-at-raised text-at-accent ring-1 ring-at-border/5">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                     <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-at-heading mb-1">OFFICIAL CERTIFICATION</p>
                        <p className="text-[11px] text-at-faint">Recognized valid globally by the Obsidian Barber association.</p>
                     </div>
                  </div>
                  
                  <div className="flex gap-4">
                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-at-raised text-at-accent ring-1 ring-at-border/5">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                     </div>
                     <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-at-heading mb-1">PLACEMENT PROGRAM</p>
                        <p className="text-[11px] text-at-faint">Direct access to elite barbershops in London, NYC and Milan.</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </section>
  );
}
