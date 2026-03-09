-- Consolidated security and data hardening migration
-- - adds MOBILE booking channel
-- - introduces customer_auth_links for account ownership binding
-- - updates account notification resolution to prefer explicit links
-- - adds explicit RLS policies for marketplace pools
-- - restricts CV uploads to expected path patterns
-- - creates product_events table for funnel instrumentation

-- Add MOBILE source channel if the enum exists and value is missing.
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'appointment_source_channel'
  ) and not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'appointment_source_channel'
      and e.enumlabel = 'MOBILE'
  ) then
    alter type public.appointment_source_channel add value 'MOBILE';
  end if;
end;
$$;

create table if not exists public.customer_auth_links (
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'system'
    check (source in ('system', 'email_backfill', 'authenticated_booking', 'authenticated_payment', 'manual')),
  verified_at timestamptz null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (customer_id, user_id)
);

create index if not exists customer_auth_links_user_idx
  on public.customer_auth_links (user_id, created_at desc);

create index if not exists customer_auth_links_customer_idx
  on public.customer_auth_links (customer_id);

alter table public.customer_auth_links enable row level security;

grant select on public.customer_auth_links to authenticated;

drop policy if exists "users_read_own_customer_auth_links" on public.customer_auth_links;
create policy "users_read_own_customer_auth_links"
on public.customer_auth_links
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_platform_admin()
);

-- Backfill existing links from known customer emails.
insert into public.customer_auth_links (
  customer_id,
  user_id,
  source,
  verified_at,
  last_seen_at
)
select
  c.id,
  u.id,
  'email_backfill',
  now(),
  now()
from public.customers c
join auth.users u
  on lower(u.email) = lower(c.email)
where c.email is not null
  and length(trim(c.email)) > 0
on conflict (customer_id, user_id) do update
set
  last_seen_at = excluded.last_seen_at,
  verified_at = coalesce(public.customer_auth_links.verified_at, excluded.verified_at);

create or replace function public.resolve_customer_auth_user_id(p_customer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_customer_phone text;
  v_normalized_customer_phone text;
  v_phone_match_count integer;
  v_phone_user_id uuid;
begin
  select cal.user_id
    into v_user_id
  from public.customer_auth_links cal
  where cal.customer_id = p_customer_id
  order by cal.verified_at desc nulls last, cal.created_at asc
  limit 1;

  if v_user_id is not null then
    update public.customer_auth_links
    set last_seen_at = now()
    where customer_id = p_customer_id
      and user_id = v_user_id;

    return v_user_id;
  end if;

  select
    lower(trim(c.email)),
    nullif(trim(c.phone), '')
    into v_email, v_customer_phone
  from public.customers c
  where c.id = p_customer_id
  limit 1;

  if v_email is not null and v_email <> '' then
    select u.id
      into v_user_id
    from auth.users u
    where lower(u.email) = v_email
    order by u.created_at asc
    limit 1;
  end if;

  if v_user_id is null and v_customer_phone is not null then
    v_normalized_customer_phone := nullif(regexp_replace(v_customer_phone, '\D', '', 'g'), '');

    if v_normalized_customer_phone is not null then
      select count(*)::integer, max(up.auth_user_id)
        into v_phone_match_count, v_phone_user_id
      from public.user_profiles up
      where up.auth_user_id is not null
        and regexp_replace(coalesce(up.phone, ''), '\D', '', 'g') = v_normalized_customer_phone;

      if v_phone_match_count = 1 then
        v_user_id := v_phone_user_id;
      end if;
    end if;
  end if;

  if v_user_id is null then
    return null;
  end if;

  insert into public.customer_auth_links (
    customer_id,
    user_id,
    source,
    verified_at,
    last_seen_at
  )
  values (
    p_customer_id,
    v_user_id,
    'email_backfill',
    now(),
    now()
  )
  on conflict (customer_id, user_id) do update
  set
    last_seen_at = excluded.last_seen_at,
    verified_at = coalesce(public.customer_auth_links.verified_at, excluded.verified_at);

  return v_user_id;
end;
$$;

grant execute on function public.resolve_customer_auth_user_id(uuid) to anon, authenticated;

create or replace function public.notify_customer_on_appointment_changes()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_shop_name text;
  v_shop_timezone text;
  v_service_name text;
  v_staff_name text;
  v_start_label text;
  v_status_type text;
  v_status_title text;
  v_status_message text;
begin
  v_user_id := public.resolve_customer_auth_user_id(new.customer_id);

  if v_user_id is null then
    return new;
  end if;

  select
    coalesce(sh.name, 'Barberia'),
    coalesce(sh.timezone, 'UTC'),
    coalesce(sv.name, 'servicio'),
    coalesce(st.name, 'tu barbero')
    into v_shop_name, v_shop_timezone, v_service_name, v_staff_name
  from public.shops sh
  left join public.services sv
    on sv.id = new.service_id
  left join public.staff st
    on st.id = new.staff_id
  where sh.id = new.shop_id
  limit 1;

  v_start_label := to_char(new.start_at at time zone v_shop_timezone, 'DD/MM/YYYY HH24:MI');

  if new.status is distinct from old.status then
    if new.status = 'confirmed' then
      v_status_type := 'appointment_confirmed';
      v_status_title := 'Tu cita fue confirmada';
      v_status_message := format(
        '%s confirmo tu %s para %s con %s.',
        v_shop_name,
        v_service_name,
        v_start_label,
        v_staff_name
      );
    elsif new.status = 'cancelled' then
      v_status_type := 'appointment_cancelled';
      v_status_title := 'Tu cita fue cancelada';
      v_status_message := format(
        '%s marco como cancelada tu cita de %s (%s).',
        v_shop_name,
        v_service_name,
        v_start_label
      );
    elsif new.status = 'done' then
      v_status_type := 'appointment_completed';
      v_status_title := 'Tu cita fue finalizada';
      v_status_message := format(
        'Tu cita de %s en %s (%s) se marco como realizada.',
        v_service_name,
        v_shop_name,
        v_start_label
      );
    elsif new.status = 'no_show' then
      v_status_type := 'appointment_no_show';
      v_status_title := 'Tu cita fue marcada como no asistida';
      v_status_message := format(
        '%s marco tu cita de %s (%s) como no asistida.',
        v_shop_name,
        v_service_name,
        v_start_label
      );
    end if;

    if v_status_type is not null then
      insert into public.account_notifications (
        user_id,
        shop_id,
        appointment_id,
        notification_type,
        title,
        message,
        action_url,
        metadata
      )
      values (
        v_user_id,
        new.shop_id,
        new.id,
        v_status_type,
        v_status_title,
        v_status_message,
        '/cuenta',
        jsonb_build_object(
          'shop_name', v_shop_name,
          'service_name', v_service_name,
          'staff_name', v_staff_name,
          'start_at', new.start_at,
          'status', new.status
        )
      )
      on conflict (user_id, appointment_id, notification_type) do nothing;
    end if;
  end if;

  if (
    (new.status = 'done' and old.status is distinct from 'done')
    or (old.review_request_sent_at is null and new.review_request_sent_at is not null)
  ) then
    insert into public.account_notifications (
      user_id,
      shop_id,
      appointment_id,
      notification_type,
      title,
      message,
      action_url,
      metadata
    )
    values (
      v_user_id,
      new.shop_id,
      new.id,
      'review_requested',
      'Dejanos tu resena',
      format(
        'Contanos como te fue en %s con %s (%s).',
        v_shop_name,
        v_staff_name,
        v_start_label
      ),
      format('/cuenta/resenas/%s', new.id),
      jsonb_build_object(
        'shop_name', v_shop_name,
        'service_name', v_service_name,
        'staff_name', v_staff_name,
        'start_at', new.start_at,
        'status', new.status
      )
    )
    on conflict (user_id, appointment_id, notification_type) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_notify_customer_changes on public.appointments;
create trigger appointments_notify_customer_changes
after update of status, review_request_sent_at on public.appointments
for each row
execute function public.notify_customer_on_appointment_changes();

-- Explicit platform-admin-only RLS policies for marketplace talent pools.
alter table public.marketplace_job_profiles enable row level security;
alter table public.marketplace_models enable row level security;

grant select, insert, update, delete on public.marketplace_job_profiles to authenticated;
grant select, insert, update, delete on public.marketplace_models to authenticated;

drop policy if exists "platform_admins_manage_marketplace_job_profiles" on public.marketplace_job_profiles;
create policy "platform_admins_manage_marketplace_job_profiles"
on public.marketplace_job_profiles
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists "platform_admins_manage_marketplace_models" on public.marketplace_models;
create policy "platform_admins_manage_marketplace_models"
on public.marketplace_models
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- Tighten CV uploads to expected key shapes used by API routes.
drop policy if exists "applicants_upload_cvs" on storage.objects;
create policy "applicants_upload_cvs"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'cvs'
  and (
    name ~ '^network/[0-9]{4}-[0-9]{2}-[0-9]{2}/'
    or name ~ '^[0-9a-fA-F-]{36}/[0-9]{4}-[0-9]{2}-[0-9]{2}/'
  )
);

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (char_length(trim(event_name)) between 3 and 120),
  shop_id uuid null references public.shops(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  customer_id uuid null references public.customers(id) on delete set null,
  source text not null default 'api' check (source in ('web', 'mobile', 'api', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_events_created_idx
  on public.product_events (created_at desc);

create index if not exists product_events_name_created_idx
  on public.product_events (event_name, created_at desc);

create index if not exists product_events_shop_created_idx
  on public.product_events (shop_id, created_at desc);

alter table public.product_events enable row level security;

grant select on public.product_events to authenticated;

drop policy if exists "users_read_own_product_events" on public.product_events;
create policy "users_read_own_product_events"
on public.product_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "shop_admins_read_shop_product_events" on public.product_events;
create policy "shop_admins_read_shop_product_events"
on public.product_events
for select
to authenticated
using (
  shop_id is not null
  and public.is_shop_admin(shop_id)
);

drop policy if exists "platform_admins_manage_product_events" on public.product_events;
create policy "platform_admins_manage_product_events"
on public.product_events
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());
