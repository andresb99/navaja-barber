import {
  CalendarRange,
  Clock3,
  ShieldCheck,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react';
import { AdminStaffForms } from '@/components/admin/staff-forms';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const inviteStatusLabel: Record<string, string> = {
  invited: 'Pendiente',
  active: 'Activa',
  disabled: 'Deshabilitada',
};

const inviteStatusTone: Record<string, 'warning' | 'success' | 'danger' | undefined> = {
  invited: 'warning',
  active: 'success',
  disabled: 'danger',
};

interface StaffPageProps {
  searchParams: Promise<{ shop?: string }>;
}

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}

interface StaffMemberCardData {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  scheduleItems: Array<{
    id: string;
    dayLabel: string;
    startTime: string;
    endTime: string;
  }>;
  recentTimeOffCount: number;
}

function formatStaffDateTime(value: string, timeZone: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('es-UY', { timeZone });
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return 'ST';
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

function formatRoleLabel(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'admin') {
    return 'Administrador';
  }

  if (normalized === 'staff') {
    return 'Barbero';
  }

  return value || 'Personal';
}

function formatMembershipRoleLabel(value: string) {
  return formatRoleLabel(value);
}

function formatScheduleChip(dayLabel: string, startTime: string, endTime: string) {
  return `${dayLabel.slice(0, 3)} ${startTime}-${endTime}`;
}

function SummaryCard({ icon: Icon, label, value, detail }: SummaryCardProps) {
  return (
    <article className="data-card rounded-[1.7rem] p-5">
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

function StaffMemberCard({
  name,
  role,
  phone,
  isActive,
  scheduleItems,
  recentTimeOffCount,
}: StaffMemberCardData) {
  const visibleScheduleItems = scheduleItems.slice(0, 4);
  const remainingScheduleItems = Math.max(scheduleItems.length - visibleScheduleItems.length, 0);

  return (
    <article className="data-card rounded-[1.75rem] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] border border-white/65 bg-white/75 text-base font-semibold text-ink shadow-[0_18px_28px_-24px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100">
            {getInitials(name)}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink dark:text-slate-100">{name}</p>
            <p className="mt-1 text-sm text-slate/75 dark:text-slate-300">
              {phone || 'Sin telefono cargado'}
            </p>
          </div>
        </div>

        <span className="meta-chip" data-tone={isActive ? 'success' : undefined}>
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="meta-chip">{formatRoleLabel(role)}</span>
        <span className="meta-chip" data-tone={scheduleItems.length ? 'success' : undefined}>
          {scheduleItems.length ? `${scheduleItems.length} bloques semanales` : 'Sin horario'}
        </span>
        {recentTimeOffCount ? (
          <span className="meta-chip" data-tone="danger">
            {recentTimeOffCount} bloqueos recientes
          </span>
        ) : null}
      </div>

      <div className="mt-5 rounded-[1.35rem] border border-white/65 bg-white/50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
          Cobertura semanal
        </p>

        {scheduleItems.length ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleScheduleItems.map((entry) => (
                <span
                  key={entry.id}
                  className="rounded-full border border-white/65 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate/85 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
                >
                  {formatScheduleChip(entry.dayLabel, entry.startTime, entry.endTime)}
                </span>
              ))}
            </div>

            {remainingScheduleItems ? (
              <p className="mt-3 text-xs text-slate/70 dark:text-slate-400">
                +{remainingScheduleItems} bloques adicionales cargados.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-sm text-slate/75 dark:text-slate-400">
            Aun no tiene horarios laborales configurados.
          </p>
        )}
      </div>
    </article>
  );
}

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const supabase = await createSupabaseServerClient();
  const [{ data: staff }, { data: workingHours }, { data: timeOff }, { data: memberships }] =
    await Promise.all([
      supabase
        .from('staff')
        .select('id, name, role, phone, is_active')
        .eq('shop_id', ctx.shopId)
        .order('name'),
      supabase
        .from('working_hours')
        .select('id, staff_id, day_of_week, start_time, end_time, staff(name)')
        .eq('shop_id', ctx.shopId)
        .order('day_of_week'),
      supabase
        .from('time_off')
        .select('id, staff_id, start_at, end_at, reason, staff(name)')
        .eq('shop_id', ctx.shopId)
        .order('start_at', { ascending: false })
        .limit(20),
      supabase
        .from('shop_memberships')
        .select('id, user_id, role, membership_status, created_at')
        .eq('shop_id', ctx.shopId)
        .in('role', ['admin', 'staff'])
        .order('created_at', { ascending: false }),
    ]);

  const membershipUserIds = Array.from(
    new Set(
      (memberships || [])
        .map((item) => String(item.user_id || ''))
        .filter(Boolean),
    ),
  );
  const { data: membershipProfiles } = membershipUserIds.length
    ? await supabase
        .from('user_profiles')
        .select('auth_user_id, full_name')
        .in('auth_user_id', membershipUserIds)
    : { data: [] as Array<{ auth_user_id: string; full_name: string | null }> };
  const membershipProfilesByUserId = new Map(
    (membershipProfiles || []).map((item) => [
      String(item.auth_user_id),
      (typeof item.full_name === 'string' && item.full_name.trim()) || null,
    ]),
  );

  const activeStaffCount = (staff || []).filter((item) => item.is_active).length;
  const inactiveStaffCount = Math.max((staff || []).length - activeStaffCount, 0);
  const pendingInvitesCount = (memberships || []).filter(
    (item) => String(item.membership_status) === 'invited',
  ).length;
  const groupedWorkingHours = new Map<
    string,
    {
      staffId: string;
      staffName: string;
      items: Array<{
        id: string;
        dayLabel: string;
        startTime: string;
        endTime: string;
      }>;
    }
  >();
  const timeOffCountByStaffId = new Map<string, number>();

  for (const entry of workingHours || []) {
    const staffId = String(entry.staff_id || 'unknown');
    const staffName = String((entry.staff as { name?: string } | null)?.name || 'Personal');

    if (!groupedWorkingHours.has(staffId)) {
      groupedWorkingHours.set(staffId, {
        staffId,
        staffName,
        items: [],
      });
    }

    groupedWorkingHours.get(staffId)?.items.push({
      id: String(entry.id),
      dayLabel: weekdays[Number(entry.day_of_week || 0)] || 'Dia',
      startTime: String(entry.start_time),
      endTime: String(entry.end_time),
    });
  }

  for (const entry of timeOff || []) {
    const staffId = String(entry.staff_id || 'unknown');
    timeOffCountByStaffId.set(staffId, (timeOffCountByStaffId.get(staffId) || 0) + 1);
  }

  const staffCards: StaffMemberCardData[] = (staff || []).map((item) => {
    const staffId = String(item.id);
    const scheduleGroup = groupedWorkingHours.get(staffId);

    return {
      id: staffId,
      name: String(item.name),
      role: String(item.role || ''),
      phone: item.phone ? String(item.phone) : null,
      isActive: Boolean(item.is_active),
      scheduleItems: scheduleGroup?.items || [],
      recentTimeOffCount: timeOffCountByStaffId.get(staffId) || 0,
    };
  });

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
            <div>
              <p className="hero-eyebrow">Equipo</p>
              <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
                Gestion del staff con foco en personas y cobertura
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate/80 dark:text-slate-300">
                La ruta ahora separa operacion, roster y disponibilidad para que invitar personal,
                revisar cobertura y detectar bloqueos sea mas rapido de leer.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="meta-chip">{(staff || []).length} personas registradas</span>
                <span className="meta-chip">{groupedWorkingHours.size} con horarios cargados</span>
                <span className="meta-chip">{(timeOff || []).length} bloqueos recientes</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <SummaryCard
                icon={ShieldCheck}
                label="Equipo activo"
                value={String(activeStaffCount)}
                detail={`${inactiveStaffCount} inactivos en este momento`}
              />
              <SummaryCard
                icon={UserRoundPlus}
                label="Invitaciones"
                value={String((memberships || []).length)}
                detail={`${pendingInvitesCount} pendientes de aceptar`}
              />
              <SummaryCard
                icon={Clock3}
                label="Cobertura"
                value={String((workingHours || []).length)}
                detail={`${groupedWorkingHours.size} perfiles con bloques semanales`}
              />
              <SummaryCard
                icon={CalendarRange}
                label="Bloqueos"
                value={String((timeOff || []).length)}
                detail="Historial reciente de indisponibilidad"
              />
            </div>
          </div>
        </div>
      </div>

      <AdminStaffForms
        shopId={ctx.shopId}
        shopSlug={ctx.shopSlug}
        weekdays={weekdays}
        staff={(staff || []).map((item) => ({
          id: String(item.id),
          name: String(item.name),
        }))}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="surface-card rounded-[1.9rem] p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Staff
              </p>
              <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                Fichas del equipo
              </h2>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                Cada card muestra identidad, estado y una lectura corta de su cobertura semanal.
              </p>
            </div>
            <span className="meta-chip">{staffCards.length} perfiles</span>
          </div>

          {!staffCards.length ? (
            <div className="mt-5 rounded-[1.5rem] border border-white/65 bg-white/55 px-4 py-4 text-sm text-slate/75 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
              Todavia no hay personal creado para este workspace.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {staffCards.map((item) => (
                <StaffMemberCard key={item.id} {...item} />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-5">
          <section className="surface-card rounded-[1.9rem] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Invitaciones
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                  Estado de accesos
                </h2>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Aqui ves rapidamente si cada invitacion fue aceptada o sigue pendiente.
                </p>
              </div>
              <span className="meta-chip" data-tone={pendingInvitesCount > 0 ? 'warning' : undefined}>
                {pendingInvitesCount} pendientes
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {(memberships || []).length === 0 ? (
                <div className="rounded-[1.45rem] border border-white/65 bg-white/55 px-4 py-4 text-sm text-slate/75 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                  Todavia no hay invitaciones creadas para este workspace.
                </div>
              ) : null}

              {(memberships || []).map((item) => {
                const membershipStatus = String(item.membership_status || 'invited');
                const profileName =
                  membershipProfilesByUserId.get(String(item.user_id || '')) ||
                  `Usuario ${String(item.user_id || '').slice(0, 8)}`;

                return (
                  <article
                    key={String(item.id)}
                    className="rounded-[1.45rem] border border-white/65 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink dark:text-slate-100">
                          {profileName}
                        </p>
                        <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                          {formatMembershipRoleLabel(String(item.role))}
                        </p>
                        <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                          {formatStaffDateTime(String(item.created_at), ctx.shopTimezone)}
                        </p>
                      </div>
                      <span className="meta-chip" data-tone={inviteStatusTone[membershipStatus]}>
                        {inviteStatusLabel[membershipStatus] || membershipStatus}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="surface-card rounded-[1.9rem] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Bloqueos
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                  Indisponibilidad reciente
                </h2>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Historial compacto de ausencias, pausas y excepciones cargadas desde el panel.
                </p>
              </div>
              <span className="meta-chip" data-tone={(timeOff || []).length ? 'danger' : undefined}>
                {(timeOff || []).length} registros
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {(timeOff || []).length === 0 ? (
                <div className="rounded-[1.45rem] border border-white/65 bg-white/55 px-4 py-4 text-sm text-slate/75 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                  No hay bloqueos recientes registrados.
                </div>
              ) : null}

              {(timeOff || []).map((item) => (
                <article
                  key={String(item.id)}
                  className="rounded-[1.45rem] border border-white/65 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink dark:text-slate-100">
                        {String((item.staff as { name?: string } | null)?.name || 'Personal')}
                      </p>
                      <p className="mt-2 text-xs text-slate/70 dark:text-slate-400">
                        Inicio: {formatStaffDateTime(String(item.start_at), ctx.shopTimezone)}
                      </p>
                      <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                        Fin: {formatStaffDateTime(String(item.end_at), ctx.shopTimezone)}
                      </p>
                    </div>
                    <span className="meta-chip" data-tone="danger">
                      Bloqueado
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate/75 dark:text-slate-300">
                    {String(item.reason || 'Sin motivo')}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="surface-card rounded-[1.9rem] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Cobertura
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
              Horarios configurados por persona
            </h2>
            <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
              Lectura agrupada para validar rapidamente que dias y franjas tiene cada miembro.
            </p>
          </div>
          <span className="meta-chip">{groupedWorkingHours.size} con disponibilidad</span>
        </div>

        {groupedWorkingHours.size === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-white/65 bg-white/55 px-4 py-4 text-sm text-slate/75 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
            Aun no se cargaron horarios laborales para el equipo.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from(groupedWorkingHours.values()).map((group) => (
              <article key={group.staffId} className="data-card rounded-[1.6rem] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] border border-white/65 bg-white/72 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100">
                    {getInitials(group.staffName)}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-ink dark:text-slate-100">
                      {group.staffName}
                    </p>
                    <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                      {group.items.length} bloques semanales
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {group.items.map((entry) => (
                    <span
                      key={entry.id}
                      className="rounded-full border border-white/65 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate/85 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
                    >
                      {formatScheduleChip(entry.dayLabel, entry.startTime, entry.endTime)}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
