-- Navaja Barber initial schema + RLS

create extension if not exists pgcrypto;

-- Enums
create type public.staff_role as enum ('admin', 'staff');
create type public.appointment_status as enum ('pending', 'confirmed', 'cancelled', 'no_show', 'done');
create type public.course_session_status as enum ('scheduled', 'cancelled', 'completed');
create type public.enrollment_status as enum ('pending', 'confirmed', 'cancelled');
create type public.job_application_status as enum ('new', 'contacted', 'interview', 'rejected', 'hired');

-- Core tables
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  auth_user_id uuid null references auth.users(id) on delete set null,
  name text not null,
  role public.staff_role not null default 'staff',
  phone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index staff_shop_auth_user_unique
  on public.staff (shop_id, auth_user_id)
  where auth_user_id is not null;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  phone text not null,
  email text null,
  created_at timestamptz not null default now()
);

create index customers_shop_phone_idx on public.customers (shop_id, phone);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz null,
  status public.appointment_status not null default 'pending',
  price_cents integer null check (price_cents >= 0),
  notes text null,
  created_at timestamptz not null default now(),
  constraint appointments_start_before_end check (end_at is null or start_at < end_at)
);

create index appointments_shop_start_idx on public.appointments (shop_id, start_at);
create index appointments_staff_start_idx on public.appointments (staff_id, start_at);
create index appointments_shop_status_idx on public.appointments (shop_id, status);

create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  constraint working_hours_start_before_end check (start_time < end_time)
);

create unique index working_hours_staff_slot_uniq
  on public.working_hours (staff_id, day_of_week, start_time, end_time);

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text null,
  created_at timestamptz not null default now(),
  constraint time_off_start_before_end check (start_at < end_at)
);

create index time_off_staff_start_idx on public.time_off (staff_id, start_at);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  title text not null,
  description text not null,
  price_cents integer not null check (price_cents >= 0),
  duration_hours integer not null check (duration_hours > 0),
  level text not null,
  image_url text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  start_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  location text not null,
  status public.course_session_status not null default 'scheduled',
  created_at timestamptz not null default now()
);

create index course_sessions_course_start_idx on public.course_sessions (course_id, start_at);

create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions(id) on delete cascade,
  name text not null,
  phone text not null,
  email text not null,
  status public.enrollment_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index course_enrollments_session_idx on public.course_enrollments (session_id, status);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  phone text not null,
  email text not null,
  instagram text null,
  experience_years integer not null check (experience_years between 0 and 60),
  availability text not null,
  cv_path text not null,
  status public.job_application_status not null default 'new',
  notes text null,
  created_at timestamptz not null default now()
);

create index job_applications_shop_created_idx on public.job_applications (shop_id, created_at desc);

-- Auth helper functions
create or replace function public.current_staff_id(_shop_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.staff s
  where s.shop_id = _shop_id
    and s.auth_user_id = auth.uid()
    and s.is_active = true
  limit 1;
$$;

grant execute on function public.current_staff_id(uuid) to anon, authenticated;

create or replace function public.current_staff_role(_shop_id uuid)
returns public.staff_role
language sql
stable
security definer
set search_path = public
as $$
  select s.role
  from public.staff s
  where s.shop_id = _shop_id
    and s.auth_user_id = auth.uid()
    and s.is_active = true
  limit 1;
$$;

grant execute on function public.current_staff_role(uuid) to anon, authenticated;

create or replace function public.is_admin(_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff s
    where s.shop_id = _shop_id
      and s.auth_user_id = auth.uid()
      and s.role = 'admin'
      and s.is_active = true
  );
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated;

create or replace function public.is_staff_member(_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff s
    where s.shop_id = _shop_id
      and s.auth_user_id = auth.uid()
      and s.is_active = true
  );
$$;

grant execute on function public.is_staff_member(uuid) to anon, authenticated;

-- Appointment snapshot trigger (price + duration)
create or replace function public.set_appointment_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  svc record;
begin
  select s.shop_id, s.price_cents, s.duration_minutes
    into svc
  from public.services s
  where s.id = new.service_id;

  if svc is null then
    raise exception 'Service not found for appointment';
  end if;

  if new.shop_id is distinct from svc.shop_id then
    raise exception 'Service does not belong to shop';
  end if;

  if new.price_cents is null then
    new.price_cents := svc.price_cents;
  end if;

  if new.end_at is null then
    new.end_at := new.start_at + make_interval(mins => svc.duration_minutes);
  end if;

  if new.status is null then
    new.status := 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_set_snapshot on public.appointments;
create trigger appointments_set_snapshot
before insert or update of service_id, start_at on public.appointments
for each row
execute function public.set_appointment_snapshot();

-- Enable RLS
alter table public.shops enable row level security;
alter table public.staff enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.courses enable row level security;
alter table public.course_sessions enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.job_applications enable row level security;

-- Clear old policies for idempotent reruns
drop policy if exists "admin_manage_shops" on public.shops;
drop policy if exists "admin_manage_staff" on public.staff;
drop policy if exists "staff_self_read" on public.staff;
drop policy if exists "admin_manage_services" on public.services;
drop policy if exists "public_read_active_services" on public.services;
drop policy if exists "admin_manage_customers" on public.customers;
drop policy if exists "public_create_customers" on public.customers;
drop policy if exists "admin_manage_appointments" on public.appointments;
drop policy if exists "staff_read_own_appointments" on public.appointments;
drop policy if exists "staff_update_own_appointments" on public.appointments;
drop policy if exists "public_create_appointments" on public.appointments;
drop policy if exists "admin_manage_working_hours" on public.working_hours;
drop policy if exists "admin_manage_time_off" on public.time_off;
drop policy if exists "admin_manage_courses" on public.courses;
drop policy if exists "public_read_active_courses" on public.courses;
drop policy if exists "admin_manage_course_sessions" on public.course_sessions;
drop policy if exists "public_read_course_sessions" on public.course_sessions;
drop policy if exists "admin_manage_course_enrollments" on public.course_enrollments;
drop policy if exists "public_create_course_enrollments" on public.course_enrollments;
drop policy if exists "admin_manage_job_applications" on public.job_applications;
drop policy if exists "public_create_job_applications" on public.job_applications;

-- Shops
create policy "admin_manage_shops"
on public.shops
for all
to authenticated
using (public.is_admin(id))
with check (public.is_admin(id));

-- Staff
create policy "admin_manage_staff"
on public.staff
for all
to authenticated
using (public.is_admin(shop_id))
with check (public.is_admin(shop_id));

create policy "staff_self_read"
on public.staff
for select
to authenticated
using (auth.uid() = auth_user_id);

-- Services
create policy "admin_manage_services"
on public.services
for all
to authenticated
using (public.is_admin(shop_id))
with check (public.is_admin(shop_id));

create policy "public_read_active_services"
on public.services
for select
to anon, authenticated
using (is_active = true);

-- Customers
create policy "admin_manage_customers"
on public.customers
for all
to authenticated
using (public.is_admin(shop_id))
with check (public.is_admin(shop_id));

create policy "public_create_customers"
on public.customers
for insert
to anon, authenticated
with check (exists (select 1 from public.shops where id = shop_id));

-- Appointments
create policy "admin_manage_appointments"
on public.appointments
for all
to authenticated
using (public.is_admin(shop_id))
with check (public.is_admin(shop_id));

create policy "staff_read_own_appointments"
on public.appointments
for select
to authenticated
using (
  public.is_staff_member(shop_id)
  and staff_id = public.current_staff_id(shop_id)
);

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
);

create policy "public_create_appointments"
on public.appointments
for insert
to anon, authenticated
with check (
  status in ('pending', 'confirmed')
  and exists (
    select 1
    from public.services s
    where s.id = service_id
      and s.shop_id = appointments.shop_id
      and s.is_active = true
  )
  and exists (
    select 1
    from public.staff st
    where st.id = staff_id
      and st.shop_id = appointments.shop_id
      and st.is_active = true
  )
);

-- Working hours / time off
create policy "admin_manage_working_hours"
on public.working_hours
for all
to authenticated
using (public.is_admin(shop_id))
with check (public.is_admin(shop_id));

create policy "admin_manage_time_off"
on public.time_off
for all
to authenticated
using (public.is_admin(shop_id))
with check (public.is_admin(shop_id));

-- Courses
create policy "admin_manage_courses"
on public.courses
for all
to authenticated
using (public.is_admin(shop_id))
with check (public.is_admin(shop_id));

create policy "public_read_active_courses"
on public.courses
for select
to anon, authenticated
using (is_active = true);

create policy "admin_manage_course_sessions"
on public.course_sessions
for all
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_id
      and public.is_admin(c.shop_id)
  )
)
with check (
  exists (
    select 1
    from public.courses c
    where c.id = course_id
      and public.is_admin(c.shop_id)
  )
);

create policy "public_read_course_sessions"
on public.course_sessions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.is_active = true
  )
);

create policy "admin_manage_course_enrollments"
on public.course_enrollments
for all
to authenticated
using (
  exists (
    select 1
    from public.course_sessions cs
    join public.courses c on c.id = cs.course_id
    where cs.id = session_id
      and public.is_admin(c.shop_id)
  )
)
with check (
  exists (
    select 1
    from public.course_sessions cs
    join public.courses c on c.id = cs.course_id
    where cs.id = session_id
      and public.is_admin(c.shop_id)
  )
);

create policy "public_create_course_enrollments"
on public.course_enrollments
for insert
to anon, authenticated
with check (
  status = 'pending'
  and exists (
    select 1
    from public.course_sessions cs
    where cs.id = session_id
      and cs.status = 'scheduled'
  )
);

-- Job applications
create policy "admin_manage_job_applications"
on public.job_applications
for all
to authenticated
using (public.is_admin(shop_id))
with check (public.is_admin(shop_id));

create policy "public_create_job_applications"
on public.job_applications
for insert
to anon, authenticated
with check (
  status = 'new'
  and exists (select 1 from public.shops where id = shop_id)
);

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cvs',
  'cvs',
  false,
  5242880,
  array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

-- Storage policies
alter table storage.objects enable row level security;

drop policy if exists "public_read_public_assets" on storage.objects;
drop policy if exists "admin_manage_public_assets" on storage.objects;
drop policy if exists "applicants_upload_cvs" on storage.objects;
drop policy if exists "admins_read_cvs" on storage.objects;
drop policy if exists "admins_manage_cvs" on storage.objects;

create policy "public_read_public_assets"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'public-assets');

create policy "admin_manage_public_assets"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'public-assets'
  and exists (
    select 1
    from public.staff s
    where s.auth_user_id = auth.uid()
      and s.role = 'admin'
      and s.is_active = true
  )
)
with check (
  bucket_id = 'public-assets'
  and exists (
    select 1
    from public.staff s
    where s.auth_user_id = auth.uid()
      and s.role = 'admin'
      and s.is_active = true
  )
);

create policy "applicants_upload_cvs"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'cvs');

create policy "admins_read_cvs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cvs'
  and exists (
    select 1
    from public.job_applications ja
    where ja.cv_path = name
      and public.is_admin(ja.shop_id)
  )
);

create policy "admins_manage_cvs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cvs'
  and exists (
    select 1
    from public.job_applications ja
    where ja.cv_path = name
      and public.is_admin(ja.shop_id)
  )
);
