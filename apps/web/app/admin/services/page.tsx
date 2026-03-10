import { formatCurrency } from '@navaja/shared';
import { upsertServiceAction } from '@/app/admin/actions';
import { AdminServicesWorkspace } from '@/components/admin/admin-services-workspace';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface ServicesPageProps {
  searchParams: Promise<{ shop?: string }>;
}

interface ServiceRow {
  id: string | null;
  name: string | null;
  price_cents: number | null;
  duration_minutes: number | null;
  is_active: boolean | null;
}

interface AppointmentUsageRow {
  service_id: string | null;
  start_at: string | null;
  status: string | null;
}

function compareServiceNames(left: string, right: string) {
  return left.localeCompare(right, 'es-UY', { sensitivity: 'base', numeric: true });
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const supabase = await createSupabaseServerClient();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [{ data: services }, { data: recentAppointments }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_cents, duration_minutes, is_active')
      .eq('shop_id', ctx.shopId)
      .order('name'),
    supabase
      .from('appointments')
      .select('service_id, start_at, status')
      .eq('shop_id', ctx.shopId)
      .not('service_id', 'is', null)
      .gte('start_at', ninetyDaysAgo.toISOString()),
  ]);

  const usageByServiceId = new Map<
    string,
    {
      bookings: number;
      completed: number;
      lastStartAt: string | null;
    }
  >();

  for (const entry of (recentAppointments || []) as AppointmentUsageRow[]) {
    const serviceId = String(entry.service_id || '').trim();
    if (!serviceId) {
      continue;
    }

    const existing = usageByServiceId.get(serviceId) || {
      bookings: 0,
      completed: 0,
      lastStartAt: null,
    };

    const nextLastStartAt =
      existing.lastStartAt &&
      entry.start_at &&
      new Date(existing.lastStartAt).getTime() > new Date(entry.start_at).getTime()
        ? existing.lastStartAt
        : (entry.start_at ?? existing.lastStartAt);

    usageByServiceId.set(serviceId, {
      bookings: existing.bookings + 1,
      completed: existing.completed + (String(entry.status || '') === 'done' ? 1 : 0),
      lastStartAt: nextLastStartAt,
    });
  }

  const serviceItems = ((services || []) as ServiceRow[])
    .map((item) => {
      const usage = usageByServiceId.get(String(item.id || '').trim());
      const lastBookedAtLabel = usage?.lastStartAt
        ? new Date(usage.lastStartAt).toLocaleDateString('es-UY', {
            timeZone: ctx.shopTimezone,
            day: 'numeric',
            month: 'short',
          })
        : null;

      return {
        id: String(item.id),
        name: String(item.name || 'Servicio'),
        priceCents: Number(item.price_cents || 0),
        durationMinutes: Number(item.duration_minutes || 0),
        isActive: Boolean(item.is_active),
        recentBookings: usage?.bookings || 0,
        recentCompleted: usage?.completed || 0,
        lastBookedAtLabel,
      };
    })
    .sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }

      if (right.recentBookings !== left.recentBookings) {
        return right.recentBookings - left.recentBookings;
      }

      return compareServiceNames(left.name, right.name);
    });

  const totalServices = serviceItems.length;
  const activeServicesCount = serviceItems.filter((item) => item.isActive).length;
  const inactiveServicesCount = Math.max(totalServices - activeServicesCount, 0);
  const servicesWithDemandCount = serviceItems.filter((item) => item.recentBookings > 0).length;

  const totalPriceCents = serviceItems.reduce((sum, item) => sum + item.priceCents, 0);
  const totalDurationMinutes = serviceItems.reduce((sum, item) => sum + item.durationMinutes, 0);
  const averagePriceCents = totalServices ? Math.round(totalPriceCents / totalServices) : 0;
  const averageDurationMinutes = totalServices
    ? Math.round(totalDurationMinutes / totalServices)
    : 0;
  const priceValues = serviceItems.map((item) => item.priceCents);
  const durationValues = serviceItems.map((item) => item.durationMinutes);
  const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;
  const minDuration = durationValues.length ? Math.min(...durationValues) : 0;
  const maxDuration = durationValues.length ? Math.max(...durationValues) : 0;
  const topDemandService = [...serviceItems]
    .sort((left, right) => {
      if (right.recentBookings !== left.recentBookings) {
        return right.recentBookings - left.recentBookings;
      }

      return compareServiceNames(left.name, right.name);
    })
    .find((item) => item.recentBookings > 0);

  return (
    <AdminServicesWorkspace
      formAction={upsertServiceAction}
      shopId={ctx.shopId}
      shopSlug={ctx.shopSlug}
      totalServices={totalServices}
      activeServicesCount={activeServicesCount}
      inactiveServicesCount={inactiveServicesCount}
      averagePriceLabel={totalServices ? formatCurrency(averagePriceCents) : 'Sin datos'}
      averageDurationLabel={totalServices ? `${averageDurationMinutes} min` : 'Sin datos'}
      priceRangeLabel={
        totalServices ? `${formatCurrency(minPrice)} a ${formatCurrency(maxPrice)}` : 'Sin datos'
      }
      durationSpreadLabel={totalServices ? `${minDuration} a ${maxDuration} min` : 'Sin datos'}
      topDemandServiceLabel={topDemandService ? topDemandService.name : 'Sin reservas recientes'}
      servicesWithDemandCount={servicesWithDemandCount}
      services={serviceItems}
    />
  );
}
