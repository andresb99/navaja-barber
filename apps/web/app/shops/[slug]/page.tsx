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
  Star,
  Heart
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

  const staffMembers = (staff || []).map(s => ({
    ...s,
    displayName: String(s.name),
    avatarUrl: null, // Use initials fallback for now since avatar_url caused query failure
  }));

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
      <div className="relative w-full h-[70vh] sm:h-[85vh] min-h-[480px] flex items-end">
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* Subtle noise/grain texture for that premium editorial feel */}
          <div className="absolute inset-0 z-10 opacity-[0.15] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />

          <ShopImageCarousel images={shop.imageUrls ?? []} shopName={shop.name} />

          {/* Deep obsidian fade overlay - specifically tuned for Midnight Atelier */}
          <div className="absolute inset-0 z-20 bg-gradient-to-t from-[#131315] via-[#131315]/70 to-transparent" />
          <div className="absolute inset-0 z-20 bg-gradient-to-b from-[#131315]/40 via-transparent to-transparent opacity-60" />
        </div>

        <div className="absolute top-6 left-6 z-20">
          <AvailabilityBadge status={shop.todayAvailability as AvailabilityStatus | null} />
        </div>

        <div className="relative z-20 w-full px-4 sm:px-6 md:px-12 lg:px-20 pb-10 sm:pb-16 md:pb-24">
          <div className="max-w-4xl">
            {shop.isVerified && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/5 backdrop-blur-md ring-1 ring-white/10 px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#cbc3d7]">
                <CheckCircle2 className="h-4 w-4 text-[#a078ff]" />
                Tenant Verificado
              </div>
            )}

            <h1 className="font-[family-name:var(--font-heading)] text-4xl xs:text-5xl sm:text-6xl md:text-8xl font-bold tracking-tighter text-white drop-shadow-2xl leading-[0.9]">
              {shop.name.toUpperCase()}
            </h1>

            {locationLabel && (
              <p className="mt-8 text-sm sm:text-lg text-[#cbc3d7] font-medium tracking-wide flex items-center gap-3">
                <MapPin className="h-5 w-5 text-[#a078ff]" />
                {locationLabel}
              </p>
            )}

            <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
              {canBook && (
                <Link
                  href={buildTenantPublicHref(shop.slug, routeContext.mode, 'book')}
                  className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#d0bcff] px-6 sm:px-8 py-4 sm:py-5 text-xs sm:text-sm font-bold uppercase tracking-widest text-[#23005c] transition-all hover:bg-[#e9ddff] hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_-10px_rgba(208,188,255,0.4)]"
                >
                  <Scissors className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Reservar The Experience</span>
                </Link>
              )}
              {shop.phone && (
                <a
                  href={`tel:${shop.phone}`}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-md px-6 sm:px-8 py-4 sm:py-5 text-xs sm:text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10"
                >
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
                  Contacto
                </a>
              )}
            </div>
          </div>
        </div>
      </div>



      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 lg:px-20 py-10 sm:py-20 md:py-32 space-y-14 sm:space-y-28 md:space-y-40">

        {/* ── SERVICES (THE COLLECTION) ──────────────────────────────────────── */}
        <section id="services" className="scroll-mt-40">
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

        {/* ── THE ARTISANS (PREMIUM CIRCULAR) ─────────────────────────────────── */}
        {staffMembers.length > 0 && (
          <section id="equipo" className="scroll-mt-40">
            <div className="mb-20">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#a078ff]">Los Artesanos</p>
              <h2 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-white leading-none">
                BARBEROS
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-10 md:gap-16">
              {staffMembers.map((person) => (
                <div key={person.id} className="group flex flex-col items-center">
                  <div className="relative mb-6 transition-transform duration-500 group-hover:scale-110">
                    {/* Premium Purple Ring */}
                    <div className="absolute inset-0 rounded-full ring-[2px] ring-[#a078ff] ring-offset-[4px] sm:ring-offset-[6px] ring-offset-[#131315] transition-all duration-500 group-hover:ring-[4px] group-hover:ring-offset-[6px] sm:group-hover:ring-offset-[8px]" />

                    <div className="relative h-24 w-24 sm:h-36 sm:w-36 overflow-hidden rounded-full bg-[#1a1a1c] ring-1 ring-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                      {person.avatarUrl ? (
                        <img
                          src={person.avatarUrl}
                          alt={person.displayName}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2a2a2d] to-[#1a1a1c] text-3xl font-bold text-white/20">
                          {person.displayName.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                    </div>

                    {/* Heart Icon Badge */}
                    <div className="absolute bottom-0 right-0 sm:bottom-2 sm:right-2 rounded-full bg-[#a078ff] h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center text-[#23005c] shadow-[0_0_20px_rgba(160,120,255,0.4)] ring-[4px] sm:ring-[6px] ring-[#131315] transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-12">
                      <Heart className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight group-hover:text-[#a078ff] transition-colors">
                      {person.displayName}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-white/20 mt-2 sm:mt-3">
                      {isOwnerRole(String(person.role)) ? 'MASTER' : 'ARTESANO'}
                    </p>
                  </div>
                </div>
              ))}
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

        {/* ── SCHEDULE & HOURS (SUMMARIZED) ─────────────────────────────────────── */}
        {workingDays.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-start">
            <div className="lg:sticky lg:top-32">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#a078ff]">El Tiempo</p>
              <h2 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-white leading-none mb-10">
                HORARIOS
              </h2>
              <p className="text-[#cbc3d7] text-lg max-w-sm leading-relaxed">
                Nuestra firma se rige por la precisión. Encontrá el momento perfecto para tu próxima sesión.
              </p>
            </div>

            <div className="rounded-[2rem] sm:rounded-[2.5rem] bg-[#201f22] p-8 sm:p-10 md:p-12 shadow-2xl ring-1 ring-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-[#a078ff]/5 blur-3xl rounded-full" />

              <div className="space-y-12 relative z-10">
                {(() => {
                  // 1. Deduplicate slots per day to show shop ranges, not staff ranges
                  const uniqueHoursPerDay = new Map<number, string[]>();
                  workingDays.forEach(([day, slots]) => {
                    const uniqueSlots = Array.from(new Set(slots.map(s => `${formatTime(s.startTime)} — ${formatTime(s.endTime)}`))).sort();
                    uniqueHoursPerDay.set(day, uniqueSlots);
                  });

                  // 2. Group days with identical sets of unique slots
                  const summaries: { days: number[]; slots: string[] }[] = [];
                  Array.from(uniqueHoursPerDay.entries()).forEach(([day, slots]) => {
                    const slotsKey = JSON.stringify(slots);
                    const last = summaries[summaries.length - 1];
                    if (last && JSON.stringify(last.slots) === slotsKey) {
                      last.days.push(day);
                    } else {
                      summaries.push({ days: [day], slots });
                    }
                  });

                  return summaries.map((group, idx) => {
                    const firstDay = group.days[0] as number;
                    const lastDay = group.days[group.days.length - 1] as number;
                    const startLabel = DAY_LABELS[firstDay] ?? '';
                    const endLabel = group.days.length > 1 ? DAY_LABELS[lastDay] ?? '' : '';
                    const label = endLabel ? `${startLabel} a ${endLabel}` : startLabel;

                    return (
                      <div key={idx} className={idx < summaries.length - 1 ? "border-b border-white/5 pb-10" : ""}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#a078ff] mb-8">{label}</p>
                        <div className="space-y-6">
                          {group.slots.map((timeRange, ti) => (
                            <div key={ti} className="flex items-center gap-6">
                              <div className="h-[1px] flex-1 bg-gradient-to-r from-[#a078ff]/20 to-transparent" />
                              <span className="text-lg sm:text-2xl md:text-4xl font-bold text-white tracking-tighter whitespace-nowrap">
                                {timeRange}
                              </span>
                              <div className="h-[1px] flex-1 bg-gradient-to-l from-[#a078ff]/10 to-transparent" />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/20">
                  <Clock className="h-4 w-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest">Hora Local: Uruguay</span>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
