-- RPC helpers for native mobile app flows
-- - Public availability calculation without exposing internal tables
-- - Authenticated user's own appointments by email

create or replace function public.get_public_availability(
  p_shop_id uuid,
  p_service_id uuid,
  p_date date,
  p_staff_id uuid default null
)
returns table (
  staff_id uuid,
  staff_name text,
  start_at timestamptz,
  end_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with svc as (
    select s.duration_minutes
    from public.services s
    where s.shop_id = p_shop_id
      and s.id = p_service_id
      and s.is_active = true
    limit 1
  ),
  selected_staff as (
    select st.id, st.name
    from public.staff st
    where st.shop_id = p_shop_id
      and st.is_active = true
      and (p_staff_id is null or st.id = p_staff_id)
  ),
  work_intervals as (
    select
      ss.id as staff_id,
      ss.name as staff_name,
      (p_date::text || ' ' || wh.start_time::text || '+00')::timestamptz as work_start,
      (p_date::text || ' ' || wh.end_time::text || '+00')::timestamptz as work_end
    from selected_staff ss
    join public.working_hours wh
      on wh.staff_id = ss.id
     and wh.shop_id = p_shop_id
    where wh.day_of_week = extract(dow from (p_date::text || ' 00:00:00+00')::timestamptz)::int
  ),
  candidate_slots as (
    select
      wi.staff_id,
      wi.staff_name,
      gs as start_at,
      gs + make_interval(mins => svc.duration_minutes) as end_at
    from work_intervals wi
    cross join svc
    cross join lateral generate_series(
      wi.work_start,
      wi.work_end - make_interval(mins => svc.duration_minutes),
      interval '15 minutes'
    ) gs
  )
  select
    cs.staff_id,
    cs.staff_name,
    cs.start_at,
    cs.end_at
  from candidate_slots cs
  where cs.start_at >= now()
    and not exists (
      select 1
      from public.appointments a
      where a.shop_id = p_shop_id
        and a.staff_id = cs.staff_id
        and a.status in ('pending', 'confirmed')
        and a.start_at < cs.end_at
        and coalesce(a.end_at, a.start_at + interval '1 minute') > cs.start_at
    )
    and not exists (
      select 1
      from public.time_off t
      where t.shop_id = p_shop_id
        and t.staff_id = cs.staff_id
        and t.start_at < cs.end_at
        and t.end_at > cs.start_at
    )
  order by cs.start_at, cs.staff_name;
$$;

grant execute on function public.get_public_availability(uuid, uuid, date, uuid) to anon, authenticated;

create or replace function public.get_my_appointments(p_shop_id uuid)
returns table (
  id uuid,
  start_at timestamptz,
  end_at timestamptz,
  status public.appointment_status,
  service_name text,
  staff_name text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with me as (
    select u.email
    from auth.users u
    where u.id = auth.uid()
    limit 1
  )
  select
    a.id,
    a.start_at,
    a.end_at,
    a.status,
    svc.name as service_name,
    st.name as staff_name
  from public.appointments a
  join public.customers c
    on c.id = a.customer_id
  join me
    on me.email is not null
   and c.email is not null
   and lower(c.email) = lower(me.email)
  left join public.services svc
    on svc.id = a.service_id
  left join public.staff st
    on st.id = a.staff_id
  where a.shop_id = p_shop_id
  order by a.start_at desc
  limit 100;
$$;

grant execute on function public.get_my_appointments(uuid) to authenticated;
