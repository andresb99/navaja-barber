import Link from 'next/link';
import { formatCurrency } from '@navaja/shared';
import { Button } from '@heroui/button';
import { CalendarClock, CircleAlert, NotebookPen, type LucideIcon } from 'lucide-react';
import { AdminAppointmentsFilters } from '@/components/admin/appointments-filters';
import { AdminAppointmentsPagination } from '@/components/admin/appointments-pagination';
import { AdminAppointmentsViewSwitcher } from '@/components/admin/appointments-view-switcher';
import { createManualAppointmentAction } from '@/app/admin/actions';
import { AdminSelect } from '@/components/heroui/admin-select';
import {
  ADMIN_APPOINTMENTS_DEFAULT_PAGE_SIZE,
  ADMIN_APPOINTMENTS_DEFAULT_SORT_BY,
  ADMIN_APPOINTMENTS_DEFAULT_SORT_DIR,
  ADMIN_APPOINTMENTS_PAGE_SIZE_OPTIONS,
  ADMIN_APPOINTMENTS_SORT_OPTIONS,
  buildAdminAppointmentsQueryString,
  isAdminAppointmentsSortDir,
  isAdminAppointmentsSortField,
  type AdminAppointmentsQueryState,
  type AdminAppointmentsSortDir,
  type AdminAppointmentsSortField,
} from '@/lib/admin-appointments';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Container } from '@/components/heroui/container';
import { SurfaceInput, SurfaceTextarea } from '@/components/heroui/surface-field';

interface AppointmentsPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    staff_id?: string;
    status?: string;
    shop?: string;
    view?: string;
    page?: string;
    page_size?: string;
    sort_by?: string;
    sort_dir?: string;
  }>;
}

interface AppointmentListItem {
  id: string | null;
  staff_id: string | null;
  start_at: string | null;
  status: string | null;
  payment_intent_id?: string | null;
  source_channel?: string | null;
  price_cents: number | null;
  notes: string | null;
  customer_name_snapshot?: string | null;
  customer_phone_snapshot?: string | null;
  customers: { name?: string | null; phone?: string | null } | null;
  services: { name?: string | null } | null;
  staff: { name?: string | null } | null;
}

interface PaymentIntentStatusItem {
  id: string | null;
  status: string | null;
}

interface AppointmentRow {
  id: string;
  startAtLabel: string;
  startAtValue: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  staffName: string;
  sourceChannelLabel: string;
  status: string;
  paymentStatus: string | null;
  priceLabel: string;
  priceCents: number;
}

interface OverviewCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}

const appointmentStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No asistio',
  done: 'Realizada',
};

function formatDateInput(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value || '1970';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';

  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string, timeZone: string) {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-UY', {
    timeZone,
    day: 'numeric',
    month: 'short',
  }).format(parsed);
}

function formatDateRangeLabel(from: string, to: string, timeZone: string) {
  return `${formatDateLabel(from, timeZone)} - ${formatDateLabel(to, timeZone)}`;
}

function resolveStatusLabel(value: string | undefined) {
  if (!value) {
    return null;
  }

  return appointmentStatusLabel[value] || value;
}

function resolveSortLabel(value: AdminAppointmentsSortField) {
  return (
    ADMIN_APPOINTMENTS_SORT_OPTIONS.find((option) => option.id === value)?.label ||
    'Fecha de la cita'
  );
}

function OverviewCard({ icon: Icon, label, value, detail }: OverviewCardProps) {
  return (
    <article className="data-card rounded-[1.65rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-ink dark:text-slate-100">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{detail}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] border border-white/70 bg-white/75 text-ink shadow-[0_18px_30px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function isMissingSourceChannelColumnError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || '')
    .trim()
    .toLowerCase();

  return (
    message.includes('source_channel') &&
    message.includes('appointments') &&
    (message.includes('schema cache') || message.includes('column'))
  );
}

function isMissingPaymentIntentColumnError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || '')
    .trim()
    .toLowerCase();

  return (
    message.includes('payment_intent_id') &&
    message.includes('appointments') &&
    (message.includes('schema cache') || message.includes('column'))
  );
}

function isMissingCustomerSnapshotColumnError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || '')
    .trim()
    .toLowerCase();

  return (
    (message.includes('customer_name_snapshot') || message.includes('customer_phone_snapshot')) &&
    message.includes('appointments') &&
    (message.includes('schema cache') || message.includes('column'))
  );
}

function resolveSourceChannel(value: unknown, notes: unknown) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (normalized) {
    return normalized;
  }

  const noteText = String(notes || '');
  const matched = noteText.match(
    /\bCanal:\s*(WEB|WALK_IN|ADMIN_CREATED|WHATSAPP|INSTAGRAM|PHONE)\b/i,
  );
  return matched?.[1]?.toUpperCase() || 'WEB';
}

function sourceChannelLabel(channel: string) {
  const normalized = channel.trim().toUpperCase();

  if (normalized === 'WALK_IN') {
    return 'Presencial';
  }

  if (normalized === 'ADMIN_CREATED') {
    return 'Carga manual';
  }

  if (normalized === 'WHATSAPP') {
    return 'WhatsApp';
  }

  if (normalized === 'INSTAGRAM') {
    return 'Instagram';
  }

  if (normalized === 'PHONE') {
    return 'Telefono';
  }

  return 'Web';
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const appointmentStatusSortRank: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  done: 2,
  no_show: 3,
  cancelled: 4,
};

const paymentStatusSortRank: Record<string, number> = {
  pending: 0,
  processing: 1,
  approved: 2,
  refunded: 3,
  rejected: 4,
  cancelled: 5,
  expired: 6,
  none: 7,
};

function compareText(a: string, b: string) {
  return a.localeCompare(b, 'es-UY', { sensitivity: 'base', numeric: true });
}

function sortAppointmentRows(
  rows: AppointmentRow[],
  sortBy: AdminAppointmentsSortField,
  sortDir: AdminAppointmentsSortDir,
) {
  const direction = sortDir === 'asc' ? 1 : -1;

  return [...rows].sort((left, right) => {
    let comparison = 0;

    switch (sortBy) {
      case 'customer':
        comparison = compareText(left.customerName, right.customerName);
        break;
      case 'service':
        comparison = compareText(left.serviceName, right.serviceName);
        break;
      case 'staff':
        comparison = compareText(left.staffName, right.staffName);
        break;
      case 'channel':
        comparison = compareText(left.sourceChannelLabel, right.sourceChannelLabel);
        break;
      case 'status':
        comparison =
          (appointmentStatusSortRank[left.status] ?? 99) -
          (appointmentStatusSortRank[right.status] ?? 99);
        break;
      case 'payment':
        comparison =
          (paymentStatusSortRank[left.paymentStatus || 'none'] ?? 99) -
          (paymentStatusSortRank[right.paymentStatus || 'none'] ?? 99);
        break;
      case 'price':
        comparison = left.priceCents - right.priceCents;
        break;
      case 'start_at':
      default:
        comparison = compareText(left.startAtValue, right.startAtValue);
        break;
    }

    if (comparison !== 0) {
      return comparison * direction;
    }

    return compareText(left.id, right.id) * direction;
  });
}

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const viewMode = params.view === 'cards' ? 'cards' : 'table';
  const supabase = await createSupabaseServerClient();
  const shopTimeZone = ctx.shopTimezone;

  const now = new Date();
  const defaultFrom = formatDateInput(now, shopTimeZone);
  const defaultToDate = new Date(now);
  defaultToDate.setDate(defaultToDate.getDate() + 28);
  const defaultTo = formatDateInput(defaultToDate, shopTimeZone);

  const selectedStaffId =
    params.staff_id && params.staff_id !== 'all' ? params.staff_id : undefined;
  const selectedStatus = params.status && params.status !== 'all' ? params.status : undefined;
  const from = params.from || defaultFrom;
  const to = params.to || (params.from ? params.from : defaultTo);
  const requestedSortBy = isAdminAppointmentsSortField(params.sort_by)
    ? params.sort_by
    : ADMIN_APPOINTMENTS_DEFAULT_SORT_BY;
  const requestedSortDir = isAdminAppointmentsSortDir(params.sort_dir)
    ? params.sort_dir
    : ADMIN_APPOINTMENTS_DEFAULT_SORT_DIR;
  const requestedPageSize = parsePositiveInt(
    params.page_size,
    ADMIN_APPOINTMENTS_DEFAULT_PAGE_SIZE,
  );
  const pageSize = ADMIN_APPOINTMENTS_PAGE_SIZE_OPTIONS.includes(
    requestedPageSize as (typeof ADMIN_APPOINTMENTS_PAGE_SIZE_OPTIONS)[number],
  )
    ? requestedPageSize
    : ADMIN_APPOINTMENTS_DEFAULT_PAGE_SIZE;

  const appointmentSelectWithSource =
    'id, staff_id, start_at, end_at, status, payment_intent_id, source_channel, price_cents, notes, customer_name_snapshot, customer_phone_snapshot, customers(name, phone), services(name), staff(name)';
  const appointmentSelectWithoutSource =
    'id, staff_id, start_at, end_at, status, payment_intent_id, price_cents, notes, customer_name_snapshot, customer_phone_snapshot, customers(name, phone), services(name), staff(name)';
  const appointmentSelectWithoutPaymentIntent =
    'id, staff_id, start_at, end_at, status, source_channel, price_cents, notes, customer_name_snapshot, customer_phone_snapshot, customers(name, phone), services(name), staff(name)';
  const appointmentSelectFallback =
    'id, staff_id, start_at, end_at, status, price_cents, notes, customers(name, phone), services(name), staff(name)';

  const [{ data: staff }, { data: services }, appointmentsResult] = await Promise.all([
    supabase
      .from('staff')
      .select('id, name')
      .eq('shop_id', ctx.shopId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('services')
      .select('id, name')
      .eq('shop_id', ctx.shopId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('appointments')
      .select(appointmentSelectWithSource)
      .eq('shop_id', ctx.shopId)
      .gte('start_at', `${from}T00:00:00.000Z`)
      .lte('start_at', `${to}T23:59:59.999Z`)
      .order('start_at'),
  ]);

  let appointments = (appointmentsResult.data || []) as AppointmentListItem[];
  let canReadPaymentIntentColumn = true;
  if (appointmentsResult.error) {
    const missingSourceColumn = isMissingSourceChannelColumnError(appointmentsResult.error);
    const missingPaymentColumn = isMissingPaymentIntentColumnError(appointmentsResult.error);
    const missingCustomerSnapshotColumn = isMissingCustomerSnapshotColumnError(
      appointmentsResult.error,
    );

    if (!missingSourceColumn && !missingPaymentColumn && !missingCustomerSnapshotColumn) {
      throw new Error(appointmentsResult.error.message || 'No se pudieron cargar las citas.');
    }

    canReadPaymentIntentColumn = !missingPaymentColumn;
    const fallbackSelect = missingCustomerSnapshotColumn
      ? missingSourceColumn
        ? missingPaymentColumn
          ? appointmentSelectFallback
          : 'id, staff_id, start_at, end_at, status, payment_intent_id, price_cents, notes, customers(name, phone), services(name), staff(name)'
        : missingPaymentColumn
          ? 'id, staff_id, start_at, end_at, status, source_channel, price_cents, notes, customers(name, phone), services(name), staff(name)'
          : 'id, staff_id, start_at, end_at, status, payment_intent_id, source_channel, price_cents, notes, customers(name, phone), services(name), staff(name)'
      : missingSourceColumn
        ? missingPaymentColumn
          ? appointmentSelectFallback
          : appointmentSelectWithoutSource
        : appointmentSelectWithoutPaymentIntent;

    const fallbackResult = await supabase
      .from('appointments')
      .select(fallbackSelect)
      .eq('shop_id', ctx.shopId)
      .gte('start_at', `${from}T00:00:00.000Z`)
      .lte('start_at', `${to}T23:59:59.999Z`)
      .order('start_at');

    if (fallbackResult.error) {
      throw new Error(fallbackResult.error.message || 'No se pudieron cargar las citas.');
    }

    appointments = (fallbackResult.data || []) as unknown as AppointmentListItem[];
  }

  if (selectedStaffId) {
    appointments = appointments.filter((item) => String(item.staff_id || '') === selectedStaffId);
  }

  if (selectedStatus) {
    appointments = appointments.filter((item) => item.status === selectedStatus);
  }

  const paymentIntentIds = canReadPaymentIntentColumn
    ? Array.from(
        new Set(
          appointments.map((item) => String(item.payment_intent_id || '').trim()).filter(Boolean),
        ),
      )
    : [];
  const paymentStatusByIntentId = new Map<string, string>();

  if (paymentIntentIds.length) {
    const { data: paymentIntents } = await supabase
      .from('payment_intents')
      .select('id, status')
      .in('id', paymentIntentIds);

    (paymentIntents || []).forEach((item) => {
      const row = item as PaymentIntentStatusItem;
      const intentId = String(row.id || '').trim();
      const status = String(row.status || '')
        .trim()
        .toLowerCase();
      if (intentId && status) {
        paymentStatusByIntentId.set(intentId, status);
      }
    });
  }

  const pendingCount = appointments.filter((item) => item.status === 'pending').length;
  const confirmedCount = appointments.filter((item) => item.status === 'confirmed').length;
  const doneCount = appointments.filter((item) => item.status === 'done').length;
  const attentionCount = appointments.filter(
    (item) => item.status === 'cancelled' || item.status === 'no_show',
  ).length;
  const hasManualBookingOptions = Boolean((staff || []).length && (services || []).length);
  const defaultManualStartAt = `${from}T09:00`;
  const staffOptions = (staff || []).map((item) => ({
    id: String(item.id),
    name: String(item.name),
  }));
  const serviceCount = (services || []).length;
  const allAppointmentRows: AppointmentRow[] = appointments.map((item) => ({
    paymentStatus: canReadPaymentIntentColumn
      ? paymentStatusByIntentId.get(String(item.payment_intent_id || '').trim()) || null
      : null,
    id: String(item.id),
    startAtValue: String(item.start_at || ''),
    startAtLabel: new Date(String(item.start_at)).toLocaleString('es-UY', {
      timeZone: shopTimeZone,
    }),
    customerName: String(
      (item as { customer_name_snapshot?: string | null }).customer_name_snapshot ||
        (item.customers as { name?: string } | null)?.name ||
        'Sin nombre',
    ),
    customerPhone: String(
      (item as { customer_phone_snapshot?: string | null }).customer_phone_snapshot ||
        (item.customers as { phone?: string } | null)?.phone ||
        '',
    ),
    serviceName: String((item.services as { name?: string } | null)?.name || 'Servicio'),
    staffName: String((item.staff as { name?: string } | null)?.name || 'Barbero'),
    sourceChannelLabel: sourceChannelLabel(
      resolveSourceChannel(
        (item as { source_channel?: string | null }).source_channel || null,
        item.notes,
      ),
    ),
    status: String(item.status),
    priceCents: Number(item.price_cents || 0),
    priceLabel: formatCurrency(Number(item.price_cents || 0)),
  }));
  const sortedAppointmentRows = sortAppointmentRows(
    allAppointmentRows,
    requestedSortBy,
    requestedSortDir,
  );
  const totalAppointments = sortedAppointmentRows.length;
  const totalPages = Math.max(1, Math.ceil(totalAppointments / pageSize));
  const currentPage = Math.min(parsePositiveInt(params.page, 1), totalPages);
  const currentQueryState: AdminAppointmentsQueryState = {
    shopSlug: ctx.shopSlug,
    from,
    to,
    selectedView: viewMode,
    ...(selectedStaffId ? { selectedStaffId } : {}),
    ...(selectedStatus ? { selectedStatus } : {}),
    page: currentPage,
    pageSize,
    sortBy: requestedSortBy,
    sortDir: requestedSortDir,
  };
  const paginatedAppointmentRows = sortedAppointmentRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pageStart = totalAppointments === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = totalAppointments === 0 ? 0 : Math.min(currentPage * pageSize, totalAppointments);
  const activeRangeLabel = formatDateRangeLabel(from, to, shopTimeZone);
  const selectedStaffLabel = selectedStaffId
    ? staffOptions.find((item) => item.id === selectedStaffId)?.name || 'Equipo filtrado'
    : null;
  const selectedStatusLabel = resolveStatusLabel(selectedStatus);
  const selectedSortLabel = resolveSortLabel(requestedSortBy);
  const activeFilterCount =
    Number(Boolean(selectedStaffId)) +
    Number(Boolean(selectedStatus)) +
    Number(from !== defaultFrom || to !== defaultTo);
  const clearFiltersHref = `/admin/appointments?${buildAdminAppointmentsQueryString({
    shopSlug: ctx.shopSlug,
    from: defaultFrom,
    to: defaultTo,
    selectedView: viewMode,
    page: 1,
    pageSize: ADMIN_APPOINTMENTS_DEFAULT_PAGE_SIZE,
    sortBy: ADMIN_APPOINTMENTS_DEFAULT_SORT_BY,
    sortDir: ADMIN_APPOINTMENTS_DEFAULT_SORT_DIR,
  })}`;
  const manualCount = allAppointmentRows.filter(
    (item) =>
      item.sourceChannelLabel === 'Presencial' || item.sourceChannelLabel === 'Carga manual',
  ).length;
  const visibleStaffCount = new Set(
    allAppointmentRows.map((item) => item.staffName).filter(Boolean),
  ).size;
  const nextUpcomingRow = [...allAppointmentRows]
    .filter((item) => {
      const timestamp = new Date(item.startAtValue).getTime();
      return Number.isFinite(timestamp) && timestamp >= now.getTime();
    })
    .sort((left, right) => compareText(left.startAtValue, right.startAtValue))[0];

  return (
    <section className="space-y-6">
      <Container variant="pageHeader" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
            <div>
              <p className="hero-eyebrow">Citas</p>
              <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
                Agenda operativa clara, sin ruido visual
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate/80 dark:text-slate-300">
                Revisa el rango activo, actualiza estados y carga reservas manuales sin que el panel
                compita con la tabla. La vista mantiene foco en lo operativo y deja el resto en un
                segundo plano.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="meta-chip">{activeRangeLabel}</span>
                <span className="meta-chip">{shopTimeZone}</span>
                {selectedStaffLabel ? (
                  <span className="meta-chip">Equipo: {selectedStaffLabel}</span>
                ) : null}
                {selectedStatusLabel ? (
                  <span className="meta-chip">Estado: {selectedStatusLabel}</span>
                ) : null}
                <span className="meta-chip">
                  Orden: {selectedSortLabel} {requestedSortDir === 'asc' ? 'asc' : 'desc'}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <OverviewCard
                icon={CalendarClock}
                label="Agenda filtrada"
                value={String(totalAppointments)}
                detail={`${pageStart || 0}-${pageEnd || 0} visibles en esta pagina`}
              />
              <OverviewCard
                icon={NotebookPen}
                label="Activas"
                value={String(pendingCount + confirmedCount)}
                detail={`${pendingCount} pendientes / ${confirmedCount} confirmadas`}
              />
              <OverviewCard
                icon={CircleAlert}
                label="Cierre"
                value={String(doneCount)}
                detail={`${attentionCount} canceladas o no show`}
              />
            </div>
          </div>
        </div>
      </Container>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
        <div className="space-y-5">
          <section className="surface-card rounded-[1.8rem] p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Filtros y orden
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                  Refina la agenda visible
                </h2>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Ajusta rango, equipo, estado y orden sin tocar la tabla principal. Si quieres
                  volver al flujo base, limpia los filtros y conservas la vista actual.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={clearFiltersHref}
                  className="action-secondary inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold"
                >
                  Limpiar filtros
                </Link>
                <a
                  href="#manual-booking"
                  className="action-primary inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold"
                >
                  Reserva manual
                </a>
              </div>
            </div>

            <div className="mt-5">
              <AdminAppointmentsFilters
                shopSlug={ctx.shopSlug}
                from={from}
                to={to}
                selectedView={viewMode}
                selectedStaffId={selectedStaffId}
                selectedStatus={selectedStatus}
                selectedPageSize={pageSize}
                selectedSortBy={requestedSortBy}
                selectedSortDir={requestedSortDir}
                staff={staffOptions}
              />
            </div>
          </section>

          <div id="appointments-results">
            <AdminAppointmentsViewSwitcher
              shopId={ctx.shopId}
              appointments={paginatedAppointmentRows}
              initialView={viewMode}
              queryState={currentQueryState}
              totalAppointments={totalAppointments}
              currentPageCount={paginatedAppointmentRows.length}
              pageLabel={`Pagina ${currentPage} de ${totalPages}`}
              activeFilterCount={activeFilterCount}
            />
          </div>

          <AdminAppointmentsPagination
            totalItems={totalAppointments}
            page={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            pageStart={pageStart}
            pageEnd={pageEnd}
            queryState={currentQueryState}
          />
        </div>

        <aside className="space-y-5">
          <section id="manual-booking" className="surface-card rounded-[1.8rem] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Reserva manual
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                  Carga walk-ins y pedidos fuera de la web
                </h2>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Este panel queda aparte para que la tabla siga siendo el centro de la pagina.
                </p>
              </div>

              <span className="meta-chip">
                {hasManualBookingOptions ? 'Disponible' : 'Requiere setup'}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.35rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Equipo listo
                </p>
                <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                  {staffOptions.length} barberos
                </p>
                <p className="mt-1 text-sm text-slate/75 dark:text-slate-400">
                  {serviceCount} servicios activos para asignar.
                </p>
              </div>

              <div className="rounded-[1.35rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Hora sugerida
                </p>
                <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                  {defaultManualStartAt.slice(11, 16)}
                </p>
                <p className="mt-1 text-sm text-slate/75 dark:text-slate-400">
                  Base inicial para el rango filtrado actual.
                </p>
              </div>
            </div>

            {!hasManualBookingOptions ? (
              <p className="mt-4 rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Necesitas al menos un barbero activo y un servicio activo para registrar reservas.
              </p>
            ) : null}

            <form action={createManualAppointmentAction} className="mt-5 grid gap-3">
              <input type="hidden" name="shop_id" value={ctx.shopId} />

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <AdminSelect
                  name="source_channel"
                  aria-label="Canal de reserva"
                  label="Canal"
                  labelPlacement="inside"
                  defaultSelectedKeys={['WALK_IN']}
                  isDisabled={!hasManualBookingOptions}
                  isRequired
                  disallowEmptySelection
                  options={[
                    { key: 'WALK_IN', label: 'Presencial' },
                    { key: 'ADMIN_CREATED', label: 'Carga manual' },
                  ]}
                />

                <SurfaceInput
                  name="start_at"
                  type="datetime-local"
                  label="Inicio"
                  labelPlacement="inside"
                  defaultValue={defaultManualStartAt}
                  isDisabled={!hasManualBookingOptions}
                  isRequired
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <AdminSelect
                  name="service_id"
                  aria-label="Servicio"
                  label="Servicio"
                  labelPlacement="inside"
                  placeholder="Selecciona un servicio"
                  isDisabled={!hasManualBookingOptions}
                  isRequired
                  options={(services || []).map((item) => ({
                    key: String(item.id),
                    label: String(item.name),
                  }))}
                />

                <AdminSelect
                  name="staff_id"
                  aria-label="Barbero"
                  label="Barbero"
                  labelPlacement="inside"
                  placeholder="Selecciona un barbero"
                  isDisabled={!hasManualBookingOptions}
                  isRequired
                  options={(staff || []).map((item) => ({
                    key: String(item.id),
                    label: String(item.name),
                  }))}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <SurfaceInput
                  name="customer_name"
                  type="text"
                  label="Cliente"
                  labelPlacement="inside"
                  placeholder="Nombre del cliente"
                  isDisabled={!hasManualBookingOptions}
                  isRequired
                />

                <SurfaceInput
                  name="customer_phone"
                  type="tel"
                  label="Telefono"
                  labelPlacement="inside"
                  placeholder="Telefono"
                  isDisabled={!hasManualBookingOptions}
                  isRequired
                />
              </div>

              <SurfaceInput
                name="customer_email"
                type="email"
                label="Email"
                labelPlacement="inside"
                placeholder="Email opcional"
                isDisabled={!hasManualBookingOptions}
              />

              <SurfaceTextarea
                name="notes"
                rows={3}
                label="Notas"
                labelPlacement="inside"
                placeholder="Notas internas u observaciones para el equipo"
                isDisabled={!hasManualBookingOptions}
              />

              <Button
                type="submit"
                isDisabled={!hasManualBookingOptions}
                className="action-primary inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Guardar reserva manual
              </Button>
            </form>
          </section>

          <section className="surface-card rounded-[1.8rem] p-5 md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Lectura rapida
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
              Lo importante del rango actual
            </h2>

            <div className="mt-5 space-y-3">
              <div className="rounded-[1.25rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Proxima cita
                </p>
                <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                  {nextUpcomingRow
                    ? nextUpcomingRow.startAtLabel
                    : 'Sin citas futuras en este rango'}
                </p>
                <p className="mt-1 text-sm text-slate/75 dark:text-slate-400">
                  {nextUpcomingRow
                    ? `${nextUpcomingRow.customerName} con ${nextUpcomingRow.staffName}`
                    : 'Amplia el rango o limpia filtros para revisar mas agenda.'}
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Canales de ingreso
                </p>
                <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                  {Math.max(totalAppointments - manualCount, 0)} web o redes
                </p>
                <p className="mt-1 text-sm text-slate/75 dark:text-slate-400">
                  {manualCount} presenciales o cargadas manualmente desde el panel.
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Cobertura y orden
                </p>
                <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                  {visibleStaffCount} barberos con citas visibles
                </p>
                <p className="mt-1 text-sm text-slate/75 dark:text-slate-400">
                  Orden actual: {selectedSortLabel}{' '}
                  {requestedSortDir === 'asc' ? 'ascendente' : 'descendente'}.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
