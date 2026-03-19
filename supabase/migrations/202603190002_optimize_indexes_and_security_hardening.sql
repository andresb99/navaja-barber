-- ============================================================
-- PERFORMANCE: Missing FK indexes
-- ============================================================

-- services.shop_id (always queried by shop)
create index if not exists services_shop_id_idx
  on public.services (shop_id);

-- appointments.customer_id (cascade + customer history lookups)
create index if not exists appointments_customer_id_idx
  on public.appointments (customer_id);

-- appointments.service_id (cascade + service analytics)
create index if not exists appointments_service_id_idx
  on public.appointments (service_id);

-- courses.shop_id — partial index for active courses (the common query path)
create index if not exists courses_shop_active_idx
  on public.courses (shop_id, created_at desc)
  where is_active = true;

-- courses.shop_id — full index for admin queries
create index if not exists courses_shop_id_idx
  on public.courses (shop_id);

-- course_sessions: partial index on scheduled sessions (the only status ever queried publicly)
create index if not exists course_sessions_scheduled_idx
  on public.course_sessions (course_id, start_at)
  where status = 'scheduled';

-- shops.owner_user_id (ownership lookups)
create index if not exists shops_owner_user_id_idx
  on public.shops (owner_user_id)
  where owner_user_id is not null;

-- course_reviews.enrollment_id (FK cascade)
create index if not exists course_reviews_enrollment_id_idx
  on public.course_reviews (enrollment_id)
  where enrollment_id is not null;

-- payment_intents.created_by_user_id
create index if not exists payment_intents_created_by_user_idx
  on public.payment_intents (created_by_user_id)
  where created_by_user_id is not null;

-- product_events.customer_id and user_id
create index if not exists product_events_customer_id_idx
  on public.product_events (customer_id)
  where customer_id is not null;

create index if not exists product_events_user_id_idx
  on public.product_events (user_id)
  where user_id is not null;

-- customers: listing by shop ordered by date
create index if not exists customers_shop_created_idx
  on public.customers (shop_id, created_at desc);

-- ============================================================
-- SECURITY: Fix mutable search_path on all public functions
-- ============================================================

create or replace function public.normalize_custom_domain(input_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    regexp_replace(
      lower(
        trim(
          both '.'
          from split_part(
            split_part(
              regexp_replace(trim(coalesce(input_value, '')), '^https?://', '', 'i'),
              '/',
              1
            ),
            ':',
            1
          )
        )
      ),
      '^www\.',
      ''
    ),
    ''
  );
$$;

create or replace function public.normalize_shop_slug(input_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    trim(
      both '-'
      from regexp_replace(
        lower(coalesce(input_value, '')),
        '[^a-z0-9]+',
        '-',
        'g'
      )
    ),
    ''
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.touch_updated_at_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.touch_staff_daily_metrics_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.sync_appointment_end_at()
returns trigger
language plpgsql
set search_path = ''
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

create or replace function public.prevent_overlapping_staff_appointments()
returns trigger
language plpgsql
set search_path = ''
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

-- ============================================================
-- SECURITY: RLS policies for shop_payment_accounts
-- (was enabled with no policies — effectively blocking all access)
-- ============================================================

-- Shop members with owner/admin role can read their shop's payment accounts
create policy "Shop admins can read own payment accounts"
  on public.shop_payment_accounts for select
  using (
    exists (
      select 1 from public.shop_memberships m
      where m.shop_id = shop_payment_accounts.shop_id
        and m.user_id = auth.uid()
        and m.membership_status = 'active'
        and m.role in ('owner', 'admin')
    )
  );
