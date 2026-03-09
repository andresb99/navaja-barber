-- Seed real operational data for metrics testing (last 2 months)
-- Target: all active shops today.
-- This script is idempotent for appointments/reviews because it replaces rows
-- tagged with notes prefix [SEED_REAL_METRICS_2M].

begin;

-- 1) Ensure test staff exists in every active shop.
with active_shops as (
  select sh.id
  from public.shops sh
  where sh.status::text = 'active'
),
target_staff as (
  select
    s.id as shop_id,
    t.name,
    t.phone
  from active_shops s
  cross join (
    values
      ('Francisco'::text, '+598-91-200-101'::text),
      ('Lucas'::text, '+598-91-200-102'::text),
      ('Facundo'::text, '+598-91-200-103'::text)
  ) as t(name, phone)
)
insert into public.staff (shop_id, name, role, phone, is_active)
select
  ts.shop_id,
  ts.name,
  'staff'::public.staff_role,
  ts.phone || '-' || right(replace(ts.shop_id::text, '-', ''), 4),
  true
from target_staff ts
where not exists (
  select 1
  from public.staff st
  where st.shop_id = ts.shop_id
    and lower(trim(st.name)) = lower(trim(ts.name))
);

create temporary table tmp_seed_staff on commit drop as
select
  st.id as staff_id,
  st.shop_id,
  st.name as staff_name,
  row_number() over (
    partition by st.shop_id
    order by
      case lower(st.name)
        when 'francisco' then 1
        when 'lucas' then 2
        when 'facundo' then 3
        else 99
      end,
      st.created_at,
      st.id
  ) as staff_order
from public.staff st
join public.shops sh on sh.id = st.shop_id
where sh.status::text = 'active'
  and st.is_active = true
  and lower(st.name) in ('francisco', 'lucas', 'facundo');

-- 2) Ensure working hours exist for seeded staff (Mon-Sat).
insert into public.working_hours (shop_id, staff_id, day_of_week, start_time, end_time)
select
  ss.shop_id,
  ss.staff_id,
  d.day_of_week,
  '09:00'::time,
  '18:00'::time
from tmp_seed_staff ss
cross join (values (1), (2), (3), (4), (5), (6)) as d(day_of_week)
where not exists (
  select 1
  from public.working_hours wh
  where wh.staff_id = ss.staff_id
    and wh.day_of_week = d.day_of_week
    and wh.start_time = '09:00'::time
    and wh.end_time = '18:00'::time
);

-- 3) Ensure each active shop has at least some active services.
with active_shops as (
  select sh.id
  from public.shops sh
  where sh.status::text = 'active'
),
service_seed as (
  select
    s.id as shop_id,
    sv.name,
    sv.price_cents,
    sv.duration_minutes
  from active_shops s
  cross join (
    values
      ('Corte Clasico'::text, 3000::int, 30::int),
      ('Skin Fade'::text, 4300::int, 45::int),
      ('Barba y Perfilado'::text, 2600::int, 25::int)
  ) as sv(name, price_cents, duration_minutes)
)
insert into public.services (shop_id, name, price_cents, duration_minutes, is_active)
select
  ss.shop_id,
  ss.name,
  ss.price_cents,
  ss.duration_minutes,
  true
from service_seed ss
where not exists (
  select 1
  from public.services svc
  where svc.shop_id = ss.shop_id
    and lower(trim(svc.name)) = lower(trim(ss.name))
);

create temporary table tmp_seed_services on commit drop as
select
  svc.shop_id,
  svc.id as service_id,
  svc.price_cents,
  svc.duration_minutes,
  row_number() over (
    partition by svc.shop_id
    order by svc.created_at, svc.id
  ) as rn,
  count(*) over (partition by svc.shop_id) as total
from public.services svc
join public.shops sh on sh.id = svc.shop_id
where sh.status::text = 'active'
  and svc.is_active = true;

-- 4) Ensure seeded customers exist.
with active_shops as (
  select sh.id
  from public.shops sh
  where sh.status::text = 'active'
),
customer_seed as (
  select
    s.id as shop_id,
    gs as idx,
    format('Cliente Seed %s', lpad(gs::text, 2, '0')) as name,
    format('+598-80-%s-%s', right(replace(s.id::text, '-', ''), 4), lpad(gs::text, 3, '0')) as phone,
    format('seed.metrics.%s.%s@example.local', replace(s.id::text, '-', ''), gs) as email
  from active_shops s
  cross join generate_series(1, 48) as gs
)
insert into public.customers (shop_id, name, phone, email)
select
  cs.shop_id,
  cs.name,
  cs.phone,
  cs.email
from customer_seed cs
where not exists (
  select 1
  from public.customers c
  where c.shop_id = cs.shop_id
    and lower(coalesce(c.email, '')) = lower(cs.email)
);

create temporary table tmp_seed_customers on commit drop as
select
  c.shop_id,
  c.id as customer_id,
  row_number() over (
    partition by c.shop_id
    order by c.created_at, c.id
  ) as rn,
  count(*) over (partition by c.shop_id) as total
from public.customers c
join public.shops sh on sh.id = c.shop_id
where sh.status::text = 'active'
  and lower(coalesce(c.email, '')) like 'seed.metrics.%@example.local';

-- 5) Remove previous seeded rows (for idempotency).
delete from public.appointment_reviews ar
using public.appointments a, public.shops sh
where ar.appointment_id = a.id
  and a.shop_id = sh.id
  and sh.status::text = 'active'
  and coalesce(a.notes, '') like '[SEED_REAL_METRICS_2M]%';

delete from public.appointments a
using public.shops sh
where a.shop_id = sh.id
  and sh.status::text = 'active'
  and coalesce(a.notes, '') like '[SEED_REAL_METRICS_2M]%';

-- 6) Insert appointments for last 60 days.
with active_days as (
  select
    sh.id as shop_id,
    sh.timezone,
    dd::date as day_date
  from public.shops sh
  cross join generate_series(current_date - interval '59 days', current_date, interval '1 day') as dd
  where sh.status::text = 'active'
),
slots as (
  select *
  from (
    values
      (1::int, 9::int),
      (2::int, 11::int),
      (3::int, 14::int),
      (4::int, 16::int)
  ) as s(slot_no, hour_local)
),
base as (
  select
    d.shop_id,
    d.timezone,
    d.day_date,
    st.staff_id,
    st.staff_order,
    sl.slot_no,
    sl.hour_local,
    (extract(doy from d.day_date)::int + st.staff_order * 11 + sl.slot_no * 7) as pattern
  from active_days d
  join tmp_seed_staff st on st.shop_id = d.shop_id
  join slots sl on true
),
resolved as (
  select
    b.shop_id,
    b.staff_id,
    b.staff_order,
    b.day_date,
    b.slot_no,
    b.pattern,
    make_timestamptz(
      extract(year from b.day_date)::int,
      extract(month from b.day_date)::int,
      extract(day from b.day_date)::int,
      b.hour_local,
      0,
      0,
      b.timezone
    ) as start_at,
    case
      when b.day_date = current_date and b.slot_no = 4 then 'pending'::public.appointment_status
      when b.day_date = current_date and b.slot_no = 3 then 'confirmed'::public.appointment_status
      when b.pattern % 12 = 0 then 'cancelled'::public.appointment_status
      when b.pattern % 17 = 0 then 'no_show'::public.appointment_status
      else 'done'::public.appointment_status
    end as status,
    case (b.pattern % 6)
      when 0 then 'WEB'::public.appointment_source_channel
      when 1 then 'WALK_IN'::public.appointment_source_channel
      when 2 then 'ADMIN_CREATED'::public.appointment_source_channel
      when 3 then 'PHONE'::public.appointment_source_channel
      when 4 then 'WHATSAPP'::public.appointment_source_channel
      else 'INSTAGRAM'::public.appointment_source_channel
    end as source_channel
  from base b
)
insert into public.appointments (
  shop_id,
  staff_id,
  customer_id,
  service_id,
  start_at,
  end_at,
  status,
  price_cents,
  source_channel,
  notes,
  completed_at,
  cancelled_at,
  cancelled_by,
  cancellation_reason,
  review_request_sent_at
)
select
  r.shop_id,
  r.staff_id,
  cp.customer_id,
  sv.service_id,
  r.start_at,
  r.start_at + make_interval(mins => sv.duration_minutes),
  r.status,
  greatest(0, sv.price_cents + ((r.staff_order - 2) * 200) + ((r.slot_no - 2) * 60)),
  r.source_channel,
  format('[SEED_REAL_METRICS_2M] %s slot-%s', r.day_date::text, r.slot_no),
  case
    when r.status = 'done' then r.start_at + make_interval(mins => sv.duration_minutes)
    else null
  end as completed_at,
  case
    when r.status = 'cancelled' then r.start_at - interval '30 minutes'
    else null
  end as cancelled_at,
  case
    when r.status = 'cancelled' and r.pattern % 2 = 0 then 'staff'::public.appointment_cancelled_by
    when r.status = 'cancelled' then 'customer'::public.appointment_cancelled_by
    else null
  end as cancelled_by,
  case
    when r.status = 'cancelled' then 'Cancelacion generada para dataset de metricas'
    else null
  end as cancellation_reason,
  case
    when r.status = 'done' then r.start_at + make_interval(mins => sv.duration_minutes + 20)
    else null
  end as review_request_sent_at
from resolved r
join lateral (
  select
    s.service_id,
    s.price_cents,
    s.duration_minutes
  from tmp_seed_services s
  where s.shop_id = r.shop_id
    and s.rn = ((r.pattern % greatest(s.total, 1)) + 1)
  limit 1
) sv on true
join lateral (
  select
    c.customer_id
  from tmp_seed_customers c
  where c.shop_id = r.shop_id
    and c.rn = ((r.pattern % greatest(c.total, 1)) + 1)
  limit 1
) cp on true;

-- 7) Insert reviews for a subset of completed appointments.
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
  published_at
)
select
  a.shop_id,
  a.id as appointment_id,
  a.staff_id,
  a.customer_id,
  (1 + ((extract(doy from a.start_at)::int + extract(hour from a.start_at)::int) % 5))::smallint as rating,
  case
    when (1 + ((extract(doy from a.start_at)::int + extract(hour from a.start_at)::int) % 5)) >= 5
      then 'Excelente servicio, muy recomendable.'
    when (1 + ((extract(doy from a.start_at)::int + extract(hour from a.start_at)::int) % 5)) = 4
      then 'Muy buena atencion y resultado.'
    when (1 + ((extract(doy from a.start_at)::int + extract(hour from a.start_at)::int) % 5)) = 3
      then 'Buen servicio en general.'
    else 'Servicio correcto, podria mejorar.'
  end as comment,
  'published'::public.review_status,
  true,
  coalesce(a.completed_at, a.end_at, a.start_at) + interval '6 hours',
  coalesce(a.completed_at, a.end_at, a.start_at) + interval '6 hours'
from public.appointments a
join public.shops sh on sh.id = a.shop_id
where sh.status::text = 'active'
  and a.status = 'done'
  and coalesce(a.notes, '') like '[SEED_REAL_METRICS_2M]%'
  and ((extract(doy from a.start_at)::int + extract(hour from a.start_at)::int) % 4) <> 0
  and not exists (
    select 1
    from public.appointment_reviews ar
    where ar.appointment_id = a.id
  );

commit;
