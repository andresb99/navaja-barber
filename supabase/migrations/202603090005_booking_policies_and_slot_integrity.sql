alter table public.shops
  add column if not exists booking_cancellation_notice_hours integer not null default 6,
  add column if not exists booking_staff_cancellation_refund_mode text not null default 'automatic_full',
  add column if not exists booking_cancellation_policy_text text;

alter table public.shops
  drop constraint if exists shops_booking_cancellation_notice_hours_check,
  add constraint shops_booking_cancellation_notice_hours_check
    check (
      booking_cancellation_notice_hours >= 0
      and booking_cancellation_notice_hours <= 168
    ),
  drop constraint if exists shops_booking_staff_cancellation_refund_mode_check,
  add constraint shops_booking_staff_cancellation_refund_mode_check
    check (booking_staff_cancellation_refund_mode in ('automatic_full', 'manual_review'));

update public.shops
set
  booking_cancellation_notice_hours = coalesce(booking_cancellation_notice_hours, 6),
  booking_staff_cancellation_refund_mode = coalesce(booking_staff_cancellation_refund_mode, 'automatic_full')
where booking_cancellation_notice_hours is null
   or booking_staff_cancellation_refund_mode is null;

create or replace function public.sync_appointment_end_at()
returns trigger
language plpgsql
as $$
declare
  service_duration_minutes integer;
begin
  if new.start_at is null or new.service_id is null then
    return new;
  end if;

  select s.duration_minutes
  into service_duration_minutes
  from public.services s
  where s.id = new.service_id
    and s.shop_id = new.shop_id;

  if service_duration_minutes is null or service_duration_minutes <= 0 then
    raise exception 'No se pudo calcular la duracion del servicio para esta cita.';
  end if;

  new.end_at := new.start_at + make_interval(mins => service_duration_minutes);
  return new;
end;
$$;

drop trigger if exists appointments_sync_end_at on public.appointments;
create trigger appointments_sync_end_at
before insert or update of shop_id, service_id, start_at, end_at
on public.appointments
for each row
execute function public.sync_appointment_end_at();

create or replace function public.prevent_overlapping_staff_appointments()
returns trigger
language plpgsql
as $$
begin
  if new.staff_id is null or new.start_at is null or new.end_at is null then
    return new;
  end if;

  if new.status not in ('pending', 'confirmed') then
    return new;
  end if;

  if exists (
    select 1
    from public.appointments existing
    where existing.shop_id = new.shop_id
      and existing.staff_id = new.staff_id
      and existing.id <> new.id
      and existing.status in ('pending', 'confirmed')
      and tstzrange(existing.start_at, existing.end_at, '[)') && tstzrange(new.start_at, new.end_at, '[)')
  ) then
    raise exception 'El horario seleccionado ya no esta disponible.';
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_prevent_overlap on public.appointments;
create trigger appointments_prevent_overlap
before insert or update of staff_id, start_at, end_at, status
on public.appointments
for each row
execute function public.prevent_overlapping_staff_appointments();

update public.appointments appointment
set end_at = appointment.start_at + make_interval(mins => service.duration_minutes)
from public.services service
where appointment.service_id = service.id
  and appointment.end_at is null;

create index if not exists appointments_active_staff_schedule_idx
  on public.appointments (shop_id, staff_id, start_at, end_at)
  where status in ('pending', 'confirmed');
