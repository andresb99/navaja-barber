import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { formatCurrency } from '@navaja/shared';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { getRequestOriginFromHeaders } from '@/lib/request-origin';
import { buildTenantPublicHref } from '@/lib/shop-links';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';
import { buildCanonicalRedirectUrlFromLegacyPath } from '@/lib/tenant-public-urls';
import { ShopImageCarousel } from '@/components/public/shop-image-carousel';
import {
  MapPin,
  CheckCircle2,
  Clock,
  Scissors,
  Crown,
  Calendar,
  ChevronRight,
  Briefcase,
  Users,
  BookOpen,
  Phone,
  Star
} from 'lucide-react';

interface ShopProfilePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ShopProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);
  if (!shop) return {};
  return buildTenantPageMetadata({
    shop,
    title: `${shop.name} | The Atelier`,
    description: shop.description || `Experiencia premium en ${shop.name}.`,
    section: 'profile',
  });
}

type AvailabilityStatus = 'available' | 'few_slots' | 'no_slots' | 'closed';

const AVAILABILITY_MAP: Record<string, { label: string; dot: string; cls: string }> = {
  available: { label: 'Disponible', dot: 'bg-emerald-400', cls: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' },
  few_slots: { label: 'Pocos turnos', dot: 'bg-amber-400', cls: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30' },
  no_slots: { label: 'Sin turnos hoy', dot: 'bg-rose-400', cls: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30' },
  closed: { label: 'Cerrado', dot: 'bg-white/40', cls: 'bg-white/5 text-white/60 ring-1 ring-white/10' },
};

function AvailabilityBadge({ status }: { status: AvailabilityStatus | string | null | undefined }) {
  const cfg = AVAILABILITY_MAP[status ?? 'closed'] ?? (AVAILABILITY_MAP['closed'] as (typeof AVAILABILITY_MAP)[string]);
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] backdrop-blur-md ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
}

const DAY_LABELS: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
};

function formatTime(t: string) {
  const [h, m] = t.split(':');
  const hour = Number(h);
  return `${hour}:${m}hs`;
}

function StaffInitials({ name, index }: { name: string; index: number }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('');
  const gradients = [
    'from-[#a078ff] to-[#6d3bd7]',
    'from-[#353437] to-[#1c1b1d]',
    'from-[#ffb869] to-[#ca801e]',
    'from-[#6d3bd7] to-[#340080]'
  ];
  const bg = gradients[index % gradients.length] ?? gradients[0];
  return (
    <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br ${bg} text-2xl font-bold text-white shadow-lg`}>
      {initials}
    </div>
  );
}

function isOwnerRole(role: string) {
  const r = role.toLowerCase();
  return r.includes('owner') || r.includes('dueño') || r.includes('admin');
}

export default async function ShopProfilePage({ params }: ShopProfilePageProps) {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);
  const routeContext = await getPublicTenantRouteContext();

  if (!shop) notFound();

  if (routeContext.mode === 'path') {
    const headerStore = await headers();
    const canonicalRedirectUrl = buildCanonicalRedirectUrlFromLegacyPath({
      pathname: `/shops/${shop.slug}`,
      requestOrigin: getRequestOriginFromHeaders(headerStore),
      shop,
    });
    if (canonicalRedirectUrl) redirect(canonicalRedirectUrl);
  }

  const supabase = createSupabaseAdminClient();
  const [{ data: services }, { data: staff }, { data: reviews }] = await Promise.all([
    supabase.from('services').select('id, name, price_cents, duration_minutes').eq('shop_id', shop.id).eq('is_active', true).order('price_cents'),
    supabase.from('staff').select('id, name, role').eq('shop_id', shop.id).eq('is_active', true).order('name'),
    supabase.from('appointment_reviews').select('staff_id, rating, comment, submitted_at').eq('shop_id', shop.id).eq('status', 'published').eq('is_verified', true).order('submitted_at', { ascending: false }).limit(6),
  ]);

  const staffById = new Map((staff || []).map((s) => [String(s.id), String(s.name)]));
  const canBook = Boolean(services?.length) && Boolean(staff?.length);
  const locationLabel = [shop.locationLabel, shop.city, shop.region].filter(Boolean).join(' · ') || null;
  const minPriceCents = (services || []).length > 0 ? Math.min(...(services || []).map((s) => Number(s.price_cents || 0))) : null;

  const hoursByDay = new Map<number, { startTime: string; endTime: string }[]>();
  for (const wh of shop.workingHours ?? []) {
    const existing = hoursByDay.get(wh.dayOfWeek) ?? [];
    hoursByDay.set(wh.dayOfWeek, [...existing, { startTime: wh.startTime, endTime: wh.endTime }]);
  }
  const workingDays = Array.from(hoursByDay.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="min-h-screen bg-[#131315] text-[#e5e1e4] selection:bg-[#a078ff]/30 selection:text-white font-sans antialiased overflow-hidden">

      {/* ── IMMERSIVE HERO ──────────────────────────────────────────────────────── */}
      <div className="relative w-full h-[85vh] min-h-[600px] flex items-end">
        <div className="absolute inset-0 z-0">
          <ShopImageCarousel images={shop.imageUrls ?? []} shopName={shop.name} ratio="100%" />
        </div>

        {/* Deep obscidian fade overlay */}
        <div className="absolute inset-x-0 bottom-0 z-10 h-[80%] bg-gradient-to-t from-[#131315] via-[#131315]/80 to-transparent pointer-events-none" />

        <div className="absolute top-6 left-6 z-20">
          <AvailabilityBadge status={shop.todayAvailability as AvailabilityStatus | null} />
        </div>

        <div className="relative z-20 w-full px-6 md:px-12 lg:px-20 pb-16 md:pb-24">
          <div className="max-w-4xl">
            {shop.isVerified && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/5 backdrop-blur-md ring-1 ring-white/10 px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#cbc3d7]">
                <CheckCircle2 className="h-4 w-4 text-[#a078ff]" />
                Tenant Verificado
              </div>
            )}
            
            <h1 className="font-[family-name:var(--font-heading)] text-5xl sm:text-6xl md:text-8xl font-bold tracking-tighter text-white drop-shadow-2xl leading-[0.9]">
              {shop.name.toUpperCase()}
            </h1>
            
            {locationLabel && (
              <p className="mt-8 text-sm sm:text-lg text-[#cbc3d7] font-medium tracking-wide flex items-center gap-3">
                <MapPin className="h-5 w-5 text-[#a078ff]" />
                {locationLabel}
              </p>
            )}

            <div className="mt-10 flex flex-col sm:flex-row gap-4 sm:items-center">
              {canBook && (
                <Link
                  href={buildTenantPublicHref(shop.slug, routeContext.mode, 'book')}
                  className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#d0bcff] px-8 py-5 text-sm font-bold uppercase tracking-widest text-[#23005c] transition-all hover:bg-[#e9ddff] hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_-10px_rgba(208,188,255,0.4)]"
                >
                  <Scissors className="h-5 w-5" />
                  <span>Reservar The Experience</span>
                </Link>
              )}
              {shop.phone && (
                <a 
                  href={`tel:${shop.phone}`} 
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-md px-8 py-5 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10"
                >
                  <Phone className="h-5 w-5" />
                  Contacto
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ATMOSPHERIC METRICS ──────────────────────────────────────────────────── */}
      <div className="relative z-30 -mt-10 px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="flex flex-col justify-center rounded-[2rem] bg-[#201f22]/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl ring-1 ring-white/5 transition-transform hover:-translate-y-1">
            <p className="text-4xl md:text-5xl font-bold tracking-tighter text-white">
              {shop.averageRating ? shop.averageRating.toFixed(1) : '–'}
            </p>
            <p className="mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#cbc3d7]">Rating</p>
            {shop.reviewCount > 0 && <p className="mt-2 text-xs text-white/30">{shop.reviewCount} reseñas</p>}
          </div>
          <div className="flex flex-col justify-center rounded-[2rem] bg-[#201f22]/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl ring-1 ring-white/5 transition-transform hover:-translate-y-1">
            <p className="text-4xl md:text-5xl font-bold tracking-tighter text-white">{(staff || []).length}</p>
            <p className="mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#cbc3d7]">Artesanos</p>
          </div>
          <div className="flex flex-col justify-center rounded-[2rem] bg-[#201f22]/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl ring-1 ring-white/5 transition-transform hover:-translate-y-1">
            <p className="text-4xl md:text-5xl font-bold tracking-tighter text-white">{(services || []).length}</p>
            <p className="mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#cbc3d7]">Servicios</p>
          </div>
          {minPriceCents !== null && (
            <div className="flex flex-col justify-center rounded-[2rem] bg-gradient-to-br from-[#a078ff]/10 to-transparent backdrop-blur-xl p-8 sm:p-10 shadow-2xl ring-1 ring-[#a078ff]/20 transition-transform hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-[#d0bcff]/20 blur-3xl rounded-full pointer-events-none" />
              <p className="text-4xl md:text-4xl font-bold tracking-tight text-[#d0bcff]">{formatCurrency(minPriceCents)}</p>
              <p className="mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#d0bcff]/70">Desde</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 py-32 space-y-40">

        {/* ── SERVICES (THE COLLECTION) ──────────────────────────────────────── */}
        <section id="services" className="scroll-mt-32">
          <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
               <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#a078ff]">La Colección</p>
               <h2 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-white leading-none">
                 SERVICIOS
               </h2>
            </div>
          </div>

          {(services || []).length === 0 ? (
            <p className="text-[#cbc3d7]">Sin servicios disponibles.</p>
          ) : (
            <div className="grid gap-6">
              {(services || []).map((service) => (
                <div
                  key={String(service.id)}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-[2rem] bg-[#0e0e10] p-8 sm:p-10 transition-all hover:bg-[#201f22]"
                >
                  <div className="flex items-center gap-6 z-10">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1c1b1d] group-hover:bg-[#a078ff]/10 transition-colors">
                       <Scissors className="h-6 w-6 text-white group-hover:text-[#a078ff] transition-colors" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-white tracking-tight">{String(service.name)}</p>
                      <div className="mt-2 flex items-center gap-2 text-sm text-[#cbc3d7]">
                         <Clock className="h-4 w-4 opacity-50" />
                         <span>{Number(service.duration_minutes || 0)} MINUTOS</span>
                      </div>
                    </div>
                  </div>
                  <div className="z-10 flex items-center justify-between sm:justify-end gap-8 w-full sm:w-auto mt-4 sm:mt-0">
                    <span className="text-2xl sm:text-3xl font-bold text-[#d0bcff] tracking-tighter">
                      {formatCurrency(Number(service.price_cents || 0))}
                    </span>
                    {canBook && (
                       <Link
                         href={buildTenantPublicHref(shop.slug, routeContext.mode, 'book')}
                         className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 text-white transition hover:bg-white/10 hover:scale-110"
                       >
                         <ChevronRight className="h-6 w-6" />
                       </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── THE ARTISANS ───────────────────────────────────────────────── */}
        {(staff || []).length > 0 && (
          <section id="equipo" className="scroll-mt-32">
            <div className="mb-16">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#a078ff]">Los Artesanos</p>
              <h2 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-white leading-none">
                BARBEROS
              </h2>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(staff || []).map((member, i) => {
                const role = String(member.role);
                const owner = isOwnerRole(role);
                return (
                  <div
                    key={String(member.id)}
                    className="group relative overflow-hidden rounded-[2.5rem] bg-[#201f22] p-8 transition-all hover:-translate-y-2 hover:bg-[#353437] shadow-xl ring-1 ring-white/5"
                  >
                    <div className="flex flex-col items-center text-center gap-6 relative z-10">
                      <div className="relative">
                        <StaffInitials name={String(member.name)} index={i} />
                        {owner && (
                          <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#a078ff] ring-4 ring-[#201f22] shadow-lg group-hover:ring-[#353437]">
                            <Crown className="h-4 w-4 text-[#23005c]" />
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-2xl font-bold tracking-tight text-white mb-2">
                          {String(member.name)}
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a078ff]">
                          {role}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── REVIEWS (THE VERDICT) ─────────────────────────────────────────────── */}
        {(reviews || []).length > 0 && (
          <section>
             <div className="mb-16">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#a078ff]">El Veredicto</p>
              <h2 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-white leading-none">
                RESEÑAS
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(reviews || []).map((review, index) => {
                const rating = Number(review.rating || 0);
                const barber = staffById.get(String(review.staff_id)) || 'Agente';
                return (
                  <div
                    key={`${String(review.staff_id)}-${index}`}
                    className="relative flex flex-col justify-between rounded-[2rem] bg-[#0e0e10] p-10 ring-1 ring-white/5 hover:ring-[#a078ff]/30 transition-all"
                  >
                    <div className="flex gap-1 mb-6">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < rating ? 'fill-[#d0bcff] text-[#d0bcff]' : 'text-white/10'}`} />
                      ))}
                    </div>
                    <p className="text-lg md:text-xl font-medium leading-relaxed text-[#e5e1e4] mb-10">
                      "{String(review.comment || 'Experiencia inigualable.')}"
                    </p>
                    <div className="flex items-center gap-4 mt-auto">
                       <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-xs font-bold text-white/50 ring-1 ring-white/10 uppercase">
                          {barber.charAt(0)}
                       </div>
                       <div>
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#a078ff]">{barber}</p>
                          {review.submitted_at && (
                            <p suppressHydrationWarning className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
                              {new Date(String(review.submitted_at)).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── SCHEDULE & HOURS ───────────────────────────────────────────────── */}
        {workingDays.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#a078ff]">El Tiempo</p>
              <h2 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-white leading-none mb-10">
                HORARIOS
              </h2>
              <p className="text-[#cbc3d7] text-lg max-w-sm">
                Encontrá el momento perfecto para tu próxima sesión. La puntualidad es parte de nuestra firma.
              </p>
            </div>

            <div className="rounded-[2.5rem] bg-[#201f22] p-8 sm:p-12 shadow-2xl ring-1 ring-white/5">
              {workingDays.map(([day, slots], idx) => (
                <div
                  key={day}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 ${idx < workingDays.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <p className="text-lg font-bold tracking-tight text-white/90">
                    {DAY_LABELS[day] ?? String(day)}
                  </p>
                  <div className="flex flex-wrap gap-3 sm:justify-end">
                    {slots.map((slot, si) => (
                      <span key={si} className="rounded-xl bg-[#0e0e10] px-4 py-2 text-sm font-semibold tracking-wide text-[#cbc3d7] ring-1 ring-white/5">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── FOOTER CTA ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[3rem] bg-gradient-to-tr from-[#201f22] to-[#131315] px-8 py-24 sm:py-32 text-center ring-1 ring-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#6d3bd7]/20 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            <h2 className="font-[family-name:var(--font-heading)] text-5xl sm:text-7xl font-bold tracking-tighter text-white mb-6 leading-none">
              RESERVÁ TU SESIÓN
            </h2>
            <p className="text-lg sm:text-xl text-[#cbc3d7] mb-12 max-w-lg">
              Elevá tu estilo. Asegurá tu lugar ahora mismo sin esperas ni complicaciones.
            </p>
            
            {canBook ? (
              <Link
                href={buildTenantPublicHref(shop.slug, routeContext.mode, 'book')}
                className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-[2rem] bg-[#d0bcff] px-10 py-6 text-base font-bold uppercase tracking-widest text-[#23005c] transition-all hover:bg-[#e9ddff] hover:scale-105 shadow-[0_0_60px_-15px_rgba(208,188,255,0.5)]"
              >
                <Calendar className="h-6 w-6" />
                <span>Elegir un turno</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-3 rounded-[2rem] bg-white/5 px-10 py-6 text-base font-semibold text-white/30 ring-1 ring-white/10 backdrop-blur-md">
                Agenda temporalmente inactiva
              </span>
            )}

            <div className="mt-24 pt-12 border-t border-white/5 flex flex-wrap justify-center gap-8 w-full">
              <Link href={buildTenantPublicHref(shop.slug, routeContext.mode, 'jobs')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition">
                <Briefcase className="h-4 w-4" /> Empleo
              </Link>
              <Link href={buildTenantPublicHref(shop.slug, routeContext.mode, 'modelos')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition">
                <Users className="h-4 w-4" /> Modelos
              </Link>
              <Link href={buildTenantPublicHref(shop.slug, routeContext.mode, 'courses')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition">
                <BookOpen className="h-4 w-4" /> Cursos
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
