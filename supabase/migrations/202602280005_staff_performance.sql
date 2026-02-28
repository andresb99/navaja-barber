create extension if not exists pgcrypto;

do $$
begin
  create type public.appointment_cancelled_by as enum ('customer', 'staff', 'admin', 'system');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.review_status as enum ('published', 'hidden', 'flagged');
exception
  when duplicate_object then null;
end
$$;

alter table public.appointments
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by public.appointment_cancelled_by,
  add column if not exists cancellation_reason text,
  add column if not exists review_request_sent_at timestamptz;

create index if not exists appointments_shop_completed_idx
  on public.appointments (shop_id, completed_at desc)
  where completed_at is not null;

create index if not exists appointments_staff_completed_idx
  on public.appointments (staff_id, completed_at desc)
  where completed_at is not null;

create index if not exists appointments_shop_cancelled_idx
  on public.appointments (shop_id, cancelled_at desc)
  where cancelled_at is not null;

create index if not exists appointments_shop_cancelled_by_idx
  on public.appointments (shop_id, cancelled_by, start_at desc)
  where status = 'cancelled';

create index if not exists appointments_review_request_idx
  on public.appointments (shop_id, review_request_sent_at desc)
  where review_request_sent_at is not null;

create or replace function public.sync_appointment_lifecycle_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'done' then
    if new.completed_at is null then
      new.completed_at := now();
    end if;

    new.cancelled_at := null;
    new.cancelled_by := null;
    new.cancellation_reason := null;
  else
    new.completed_at := null;
  end if;

  if new.status = 'cancelled' then
    if new.cancelled_at is null then
      new.cancelled_at := now();
    end if;

    if new.cancelled_by is null and auth.uid() is not null then
      if public.is_admin(new.shop_id) then
        new.cancelled_by := 'admin';
      elsif new.staff_id = public.current_staff_id(new.shop_id) then
        new.cancelled_by := 'staff';
      end if;
    end if;

    if new.cancelled_by is null then
      raise exception 'cancelled_by is required when status is cancelled';
    end if;
  else
    new.cancelled_at := null;
    new.cancelled_by := null;
    new.cancellation_reason := null;
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_sync_lifecycle_fields on public.appointments;
create trigger appointments_sync_lifecycle_fields
before insert or update of status, completed_at, cancelled_at, cancelled_by, cancellation_reason
on public.appointments
for each row
execute function public.sync_appointment_lifecycle_fields();

create table if not exists public.appointment_reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text null,
  status public.review_status not null default 'published',
  is_verified boolean not null default true,
  submitted_at timestamptz not null default now(),
  published_at timestamptz null,
  ip_hash text null,
  user_agent_hash text null
);

create index if not exists appointment_reviews_shop_staff_submitted_idx
  on public.appointment_reviews (shop_id, staff_id, submitted_at desc);

create index if not exists appointment_reviews_staff_published_idx
  on public.appointment_reviews (staff_id, submitted_at desc)
  where status = 'published' and is_verified = true;

create index if not exists appointment_reviews_shop_rating_idx
  on public.appointment_reviews (shop_id, rating)
  where status = 'published' and is_verified = true;

create index if not exists appointment_reviews_customer_submitted_idx
  on public.appointment_reviews (customer_id, submitted_at desc);

create table if not exists public.review_invites (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  token_hash text not null unique,
  sent_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists review_invites_active_expiry_idx
  on public.review_invites (expires_at asc)
  where used_at is null and revoked_at is null;

create index if not exists review_invites_customer_created_idx
  on public.review_invites (customer_id, created_at desc);

create table if not exists public.staff_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  metric_date date not null,
  available_minutes integer not null default 0 check (available_minutes >= 0),
  booked_minutes integer not null default 0 check (booked_minutes >= 0),
  service_minutes integer not null default 0 check (service_minutes >= 0),
  completed_appointments integer not null default 0 check (completed_appointments >= 0),
  staff_cancellations integer not null default 0 check (staff_cancellations >= 0),
  customer_cancellations integer not null default 0 check (customer_cancellations >= 0),
  admin_cancellations integer not null default 0 check (admin_cancellations >= 0),
  system_cancellations integer not null default 0 check (system_cancellations >= 0),
  no_shows integer not null default 0 check (no_shows >= 0),
  revenue_cents integer not null default 0 check (revenue_cents >= 0),
  unique_customers integer not null default 0 check (unique_customers >= 0),
  repeat_customers integer not null default 0 check (repeat_customers >= 0),
  review_count integer not null default 0 check (review_count >= 0),
  rating_sum integer not null default 0 check (rating_sum >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_daily_metrics_staff_date_unique unique (staff_id, metric_date)
);

create index if not exists staff_daily_metrics_shop_date_idx
  on public.staff_daily_metrics (shop_id, metric_date desc, staff_id);

create index if not exists staff_daily_metrics_staff_date_idx
  on public.staff_daily_metrics (staff_id, metric_date desc);

create or replace function public.touch_staff_daily_metrics_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists staff_daily_metrics_touch_updated_at on public.staff_daily_metrics;
create trigger staff_daily_metrics_touch_updated_at
before update on public.staff_daily_metrics
for each row
execute function public.touch_staff_daily_metrics_updated_at();

create or replace function public.get_review_invite_status(p_token text)
returns table (
  appointment_id uuid,
  staff_id uuid,
  staff_name text,
  service_name text,
  appointment_start_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_hash text;
begin
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  return query
  select
    a.id,
    a.staff_id,
    st.name,
    svc.name,
    a.start_at,
    ri.expires_at
  from public.review_invites ri
  join public.appointments a on a.id = ri.appointment_id
  join public.staff st on st.id = a.staff_id
  join public.services svc on svc.id = a.service_id
  where ri.token_hash = v_token_hash
    and ri.revoked_at is null
    and ri.used_at is null
    and ri.expires_at > now()
    and a.status = 'done'
    and a.completed_at is not null;
end;
$$;

create or replace function public.submit_appointment_review(
  p_token text,
  p_rating smallint,
  p_comment text default null,
  p_ip_hash text default null,
  p_user_agent_hash text default null
)
returns table (
  review_id uuid,
  appointment_id uuid,
  staff_id uuid,
  rating smallint,
  comment text,
  submitted_at timestamptz,
  status public.review_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_hash text;
  v_invite public.review_invites%rowtype;
  v_appointment public.appointments%rowtype;
  v_inserted public.appointment_reviews%rowtype;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  select *
    into v_invite
  from public.review_invites
  where token_hash = v_token_hash
  for update;

  if not found then
    raise exception 'Review invite not found';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'Review invite revoked';
  end if;

  if v_invite.used_at is not null then
    raise exception 'Review invite already used';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'Review invite expired';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = v_invite.appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found';
  end if;

  if v_appointment.status <> 'done' or v_appointment.completed_at is null then
    raise exception 'Appointment is not completed';
  end if;

  if exists (
    select 1
    from public.appointment_reviews ar
    where ar.appointment_id = v_appointment.id
  ) then
    raise exception 'Review already exists for this appointment';
  end if;

  insert into public.appointment_reviews (
    shop_id,
    appointment_id,
    staff_id,
    customer_id,
    rating,
    comment,
    status,
    is_verified,
    submitted_at,
    published_at,
    ip_hash,
    user_agent_hash
  )
  values (
    v_appointment.shop_id,
    v_appointment.id,
    v_appointment.staff_id,
    v_appointment.customer_id,
    p_rating,
    nullif(btrim(coalesce(p_comment, '')), ''),
    'published',
    true,
    now(),
    now(),
    p_ip_hash,
    p_user_agent_hash
  )
  returning *
    into v_inserted;

  update public.review_invites
  set used_at = now()
  where id = v_invite.id;

  return query
  select
    v_inserted.id,
    v_inserted.appointment_id,
    v_inserted.staff_id,
    v_inserted.rating,
    v_inserted.comment,
    v_inserted.submitted_at,
    v_inserted.status;
end;
$$;

create or replace function public.complete_appointment_and_create_review_invite(
  p_appointment_id uuid,
  p_price_cents integer,
  p_token_hash text,
  p_sent_at timestamptz,
  p_expires_at timestamptz
)
returns table (
  appointment_id uuid,
  customer_id uuid,
  review_invite_created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_has_review boolean;
begin
  if coalesce(length(p_token_hash), 0) < 32 then
    raise exception 'Token hash is invalid';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = p_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found';
  end if;

  update public.appointments
  set
    status = 'done',
    price_cents = coalesce(p_price_cents, price_cents),
    completed_at = coalesce(completed_at, now()),
    cancelled_at = null,
    cancelled_by = null,
    cancellation_reason = null,
    review_request_sent_at = p_sent_at
  where id = v_appointment.id;

  select exists (
    select 1
    from public.appointment_reviews ar
    where ar.appointment_id = v_appointment.id
  )
  into v_has_review;

  if v_has_review then
    return query
    select v_appointment.id, v_appointment.customer_id, false;
    return;
  end if;

  insert into public.review_invites (
    appointment_id,
    customer_id,
    token_hash,
    sent_at,
    expires_at,
    used_at,
    revoked_at
  )
  values (
    v_appointment.id,
    v_appointment.customer_id,
    p_token_hash,
    p_sent_at,
    p_expires_at,
    null,
    null
  )
  on conflict on constraint review_invites_appointment_id_key do update
  set
    token_hash = excluded.token_hash,
    sent_at = excluded.sent_at,
    expires_at = excluded.expires_at,
    used_at = null,
    revoked_at = null;

  return query
  select v_appointment.id, v_appointment.customer_id, true;
end;
$$;

create or replace function public.get_staff_performance_summary(
  p_shop_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_staff_ids uuid[] default null
)
returns table (
  staff_id uuid,
  staff_name text,
  total_revenue_cents bigint,
  completed_appointments integer,
  available_minutes integer,
  booked_minutes integer,
  service_minutes integer,
  revenue_per_available_hour numeric,
  occupancy_ratio double precision,
  staff_cancellations integer,
  customer_cancellations integer,
  admin_cancellations integer,
  system_cancellations integer,
  total_cancellations integer,
  no_show_appointments integer,
  unique_customers integer,
  repeat_customers integer,
  repeat_client_rate double precision,
  review_count integer,
  average_rating double precision,
  shop_average_rating double precision
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(p_shop_id) then
    raise exception 'Not authorized to read staff performance';
  end if;

  return query
  with staff_scope as (
    select
      s.id as staff_id,
      s.name as staff_name
    from public.staff s
    where s.shop_id = p_shop_id
      and (
        (p_staff_ids is null and s.is_active = true)
        or (p_staff_ids is not null and s.id = any(p_staff_ids))
      )
  ),
  range_days as (
    select generate_series(
      date_trunc('day', p_start),
      date_trunc('day', p_end - interval '1 second'),
      interval '1 day'
    ) as day_start
  ),
  availability_slots as (
    select
      scope.staff_id,
      greatest(days.day_start + wh.start_time, p_start) as slot_start,
      least(days.day_start + wh.end_time, p_end) as slot_end
    from staff_scope scope
    join public.working_hours wh on wh.staff_id = scope.staff_id
    join range_days days on extract(dow from days.day_start) = wh.day_of_week
    where greatest(days.day_start + wh.start_time, p_start) < least(days.day_start + wh.end_time, p_end)
  ),
  slot_time_off as (
    select
      slots.staff_id,
      slots.slot_start,
      slots.slot_end,
      coalesce(sum(
        greatest(
          0,
          round(
            extract(
              epoch from (
                least(slots.slot_end, t.end_at) - greatest(slots.slot_start, t.start_at)
              )
            ) / 60.0
          )
        )
      ), 0)::integer as blocked_minutes
    from availability_slots slots
    left join public.time_off t
      on t.staff_id = slots.staff_id
      and t.start_at < slots.slot_end
      and t.end_at > slots.slot_start
    group by slots.staff_id, slots.slot_start, slots.slot_end
  ),
  availability_rollup as (
    select
      slots.staff_id,
      sum(
        greatest(
          0,
          round(extract(epoch from (slots.slot_end - slots.slot_start)) / 60.0)::integer
          - coalesce(sto.blocked_minutes, 0)
        )
      )::integer as available_minutes
    from availability_slots slots
    left join slot_time_off sto
      on sto.staff_id = slots.staff_id
      and sto.slot_start = slots.slot_start
      and sto.slot_end = slots.slot_end
    group by slots.staff_id
  ),
  appointments_in_range as (
    select
      a.id,
      a.staff_id,
      a.customer_id,
      a.status,
      a.price_cents,
      a.cancelled_by,
      greatest(
        0,
        round(
          extract(
            epoch from (
              least(coalesce(a.end_at, a.start_at), p_end) - greatest(a.start_at, p_start)
            )
          ) / 60.0
        )
      )::integer as overlap_minutes
    from public.appointments a
    join staff_scope scope on scope.staff_id = a.staff_id
    where a.shop_id = p_shop_id
      and a.start_at < p_end
      and coalesce(a.end_at, a.start_at) > p_start
  ),
  appointment_rollup as (
    select
      a.staff_id,
      coalesce(sum(case when a.status = 'done' then coalesce(a.price_cents, 0) else 0 end), 0)::bigint
        as total_revenue_cents,
      count(*) filter (where a.status = 'done')::integer as completed_appointments,
      coalesce(sum(case when a.status = 'done' then a.overlap_minutes else 0 end), 0)::integer
        as service_minutes,
      coalesce(sum(case when a.status in ('pending', 'confirmed', 'done') then a.overlap_minutes else 0 end), 0)::integer
        as booked_minutes,
      count(*) filter (where a.status = 'cancelled' and a.cancelled_by = 'staff')::integer
        as staff_cancellations,
      count(*) filter (where a.status = 'cancelled' and a.cancelled_by = 'customer')::integer
        as customer_cancellations,
      count(*) filter (where a.status = 'cancelled' and a.cancelled_by = 'admin')::integer
        as admin_cancellations,
      count(*) filter (where a.status = 'cancelled' and a.cancelled_by = 'system')::integer
        as system_cancellations,
      count(*) filter (where a.status = 'cancelled')::integer as total_cancellations,
      count(*) filter (where a.status = 'no_show')::integer as no_show_appointments
    from appointments_in_range a
    group by a.staff_id
  ),
  repeat_customer_source as (
    select
      a.staff_id,
      a.customer_id,
      count(*)::integer as visit_count
    from appointments_in_range a
    where a.status = 'done'
    group by a.staff_id, a.customer_id
  ),
  repeat_customer_rollup as (
    select
      r.staff_id,
      count(*)::integer as unique_customers,
      count(*) filter (where r.visit_count >= 2)::integer as repeat_customers
    from repeat_customer_source r
    group by r.staff_id
  ),
  review_rollup as (
    select
      ar.staff_id,
      count(*)::integer as review_count,
      coalesce(avg(ar.rating::double precision), 0) as average_rating
    from public.appointment_reviews ar
    join public.appointments a on a.id = ar.appointment_id
    join staff_scope scope on scope.staff_id = ar.staff_id
    where ar.shop_id = p_shop_id
      and ar.status = 'published'
      and ar.is_verified = true
      and coalesce(a.completed_at, a.start_at) >= p_start
      and coalesce(a.completed_at, a.start_at) < p_end
    group by ar.staff_id
  ),
  shop_review_baseline as (
    select
      coalesce(avg(ar.rating::double precision), 0) as shop_average_rating
    from public.appointment_reviews ar
    join public.appointments a on a.id = ar.appointment_id
    where ar.shop_id = p_shop_id
      and ar.status = 'published'
      and ar.is_verified = true
      and coalesce(a.completed_at, a.start_at) >= p_start
      and coalesce(a.completed_at, a.start_at) < p_end
  )
  select
    scope.staff_id,
    scope.staff_name,
    coalesce(ap.total_revenue_cents, 0) as total_revenue_cents,
    coalesce(ap.completed_appointments, 0) as completed_appointments,
    coalesce(av.available_minutes, 0) as available_minutes,
    coalesce(ap.booked_minutes, 0) as booked_minutes,
    coalesce(ap.service_minutes, 0) as service_minutes,
    case
      when coalesce(av.available_minutes, 0) > 0
        then round(((coalesce(ap.total_revenue_cents, 0)::numeric * 60) / av.available_minutes), 2)
      else 0
    end as revenue_per_available_hour,
    case
      when coalesce(av.available_minutes, 0) > 0
        then coalesce(ap.booked_minutes, 0)::double precision / av.available_minutes::double precision
      else 0
    end as occupancy_ratio,
    coalesce(ap.staff_cancellations, 0) as staff_cancellations,
    coalesce(ap.customer_cancellations, 0) as customer_cancellations,
    coalesce(ap.admin_cancellations, 0) as admin_cancellations,
    coalesce(ap.system_cancellations, 0) as system_cancellations,
    coalesce(ap.total_cancellations, 0) as total_cancellations,
    coalesce(ap.no_show_appointments, 0) as no_show_appointments,
    coalesce(rc.unique_customers, 0) as unique_customers,
    coalesce(rc.repeat_customers, 0) as repeat_customers,
    case
      when coalesce(rc.unique_customers, 0) > 0
        then rc.repeat_customers::double precision / rc.unique_customers::double precision
      else 0
    end as repeat_client_rate,
    coalesce(rr.review_count, 0) as review_count,
    coalesce(rr.average_rating, 0) as average_rating,
    baseline.shop_average_rating
  from staff_scope scope
  left join availability_rollup av on av.staff_id = scope.staff_id
  left join appointment_rollup ap on ap.staff_id = scope.staff_id
  left join repeat_customer_rollup rc on rc.staff_id = scope.staff_id
  left join review_rollup rr on rr.staff_id = scope.staff_id
  cross join shop_review_baseline baseline
  order by coalesce(ap.total_revenue_cents, 0) desc, scope.staff_name asc;
end;
$$;

create or replace function public.get_staff_rating_trend(
  p_shop_id uuid,
  p_staff_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  period_start date,
  review_count integer,
  average_rating double precision
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(p_shop_id) then
    raise exception 'Not authorized to read rating trend';
  end if;

  return query
  with month_series as (
    select generate_series(
      date_trunc('month', p_start),
      date_trunc('month', p_end - interval '1 second'),
      interval '1 month'
    )::date as period_start
  ),
  reviews as (
    select
      date_trunc('month', coalesce(a.completed_at, a.start_at))::date as period_start,
      count(*)::integer as review_count,
      coalesce(avg(ar.rating::double precision), 0) as average_rating
    from public.appointment_reviews ar
    join public.appointments a on a.id = ar.appointment_id
    where ar.shop_id = p_shop_id
      and ar.staff_id = p_staff_id
      and ar.status = 'published'
      and ar.is_verified = true
      and coalesce(a.completed_at, a.start_at) >= p_start
      and coalesce(a.completed_at, a.start_at) < p_end
    group by 1
  )
  select
    months.period_start,
    coalesce(reviews.review_count, 0) as review_count,
    coalesce(reviews.average_rating, 0) as average_rating
  from month_series months
  left join reviews using (period_start)
  order by months.period_start;
end;
$$;

alter table public.appointment_reviews enable row level security;
alter table public.review_invites enable row level security;
alter table public.staff_daily_metrics enable row level security;

revoke all on public.appointment_reviews from anon, authenticated;
revoke all on public.review_invites from anon, authenticated;
revoke all on public.staff_daily_metrics from anon, authenticated;

grant select on public.appointment_reviews to authenticated;
grant select on public.review_invites to authenticated;
grant select on public.staff_daily_metrics to authenticated;

drop policy if exists "staff_update_own_appointments" on public.appointments;
create policy "staff_update_own_appointments"
on public.appointments
for update
to authenticated
using (
  public.is_staff_member(shop_id)
  and staff_id = public.current_staff_id(shop_id)
)
with check (
  public.is_staff_member(shop_id)
  and staff_id = public.current_staff_id(shop_id)
  and (
    status <> 'cancelled'
    or cancelled_by = 'staff'
  )
  and (
    status = 'cancelled'
    or cancelled_by is null
  )
);

drop policy if exists "admin_read_appointment_reviews" on public.appointment_reviews;
create policy "admin_read_appointment_reviews"
on public.appointment_reviews
for select
to authenticated
using (public.is_admin(shop_id));

drop policy if exists "admin_read_review_invites" on public.review_invites;
create policy "admin_read_review_invites"
on public.review_invites
for select
to authenticated
using (
  exists (
    select 1
    from public.appointments a
    where a.id = review_invites.appointment_id
      and public.is_admin(a.shop_id)
  )
);

drop policy if exists "admin_read_staff_daily_metrics" on public.staff_daily_metrics;
create policy "admin_read_staff_daily_metrics"
on public.staff_daily_metrics
for select
to authenticated
using (public.is_admin(shop_id));

revoke all on function public.get_review_invite_status(text) from public;
revoke all on function public.submit_appointment_review(text, smallint, text, text, text) from public;
revoke all on function public.complete_appointment_and_create_review_invite(uuid, integer, text, timestamptz, timestamptz) from public;
revoke all on function public.get_staff_performance_summary(uuid, timestamptz, timestamptz, uuid[]) from public;
revoke all on function public.get_staff_rating_trend(uuid, uuid, timestamptz, timestamptz) from public;

grant execute on function public.get_review_invite_status(text) to anon, authenticated;
grant execute on function public.submit_appointment_review(text, smallint, text, text, text) to anon, authenticated;
grant execute on function public.complete_appointment_and_create_review_invite(uuid, integer, text, timestamptz, timestamptz) to service_role;
grant execute on function public.get_staff_performance_summary(uuid, timestamptz, timestamptz, uuid[]) to authenticated;
grant execute on function public.get_staff_rating_trend(uuid, uuid, timestamptz, timestamptz) to authenticated;
