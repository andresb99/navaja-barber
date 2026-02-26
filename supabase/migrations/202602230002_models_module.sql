-- Gestion de modelos para cursos

create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text null,
  instagram text null,
  notes_internal text null,
  attributes jsonb null,
  photo_paths text[] null,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists models_shop_created_idx on public.models (shop_id, created_at desc);
create index if not exists models_shop_name_idx on public.models (shop_id, full_name);
create index if not exists models_shop_phone_idx on public.models (shop_id, phone);

create table if not exists public.model_requirements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions(id) on delete cascade,
  requirements jsonb null,
  compensation_type text not null check (compensation_type in ('gratis', 'descuento', 'pago')),
  compensation_value_cents integer null check (compensation_value_cents is null or compensation_value_cents >= 0),
  notes_public text null,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

create table if not exists public.model_applications (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions(id) on delete cascade,
  model_id uuid not null references public.models(id) on delete cascade,
  status text not null check (status in ('applied', 'confirmed', 'waitlist', 'rejected', 'no_show', 'attended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notes_internal text null,
  unique (session_id, model_id)
);

create index if not exists model_applications_session_status_idx
  on public.model_applications (session_id, status);
create index if not exists model_applications_model_idx
  on public.model_applications (model_id);

create table if not exists public.waivers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions(id) on delete cascade,
  model_id uuid not null references public.models(id) on delete cascade,
  waiver_version text not null,
  accepted_name text not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, model_id)
);

create index if not exists waivers_session_idx on public.waivers (session_id);
create index if not exists waivers_model_idx on public.waivers (model_id);

create or replace function public.set_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists model_requirements_set_updated_at on public.model_requirements;
create trigger model_requirements_set_updated_at
before update on public.model_requirements
for each row
execute function public.set_updated_at_column();

drop trigger if exists model_applications_set_updated_at on public.model_applications;
create trigger model_applications_set_updated_at
before update on public.model_applications
for each row
execute function public.set_updated_at_column();

alter table public.models enable row level security;
alter table public.model_requirements enable row level security;
alter table public.model_applications enable row level security;
alter table public.waivers enable row level security;

drop policy if exists "admin_manage_models" on public.models;
drop policy if exists "public_create_models" on public.models;
drop policy if exists "admin_manage_model_requirements" on public.model_requirements;
drop policy if exists "public_read_open_model_requirements" on public.model_requirements;
drop policy if exists "admin_manage_model_applications" on public.model_applications;
drop policy if exists "public_create_model_applications" on public.model_applications;
drop policy if exists "admin_manage_waivers" on public.waivers;
drop policy if exists "public_create_waivers" on public.waivers;

create policy "admin_manage_models"
on public.models
for all
to authenticated
using (public.is_admin(shop_id))
with check (public.is_admin(shop_id));

create policy "public_create_models"
on public.models
for insert
to anon, authenticated
with check (exists (select 1 from public.shops s where s.id = shop_id));

create policy "admin_manage_model_requirements"
on public.model_requirements
for all
to authenticated
using (
  exists (
    select 1
    from public.course_sessions cs
    join public.courses c on c.id = cs.course_id
    where cs.id = model_requirements.session_id
      and public.is_admin(c.shop_id)
  )
)
with check (
  exists (
    select 1
    from public.course_sessions cs
    join public.courses c on c.id = cs.course_id
    where cs.id = model_requirements.session_id
      and public.is_admin(c.shop_id)
  )
);

create policy "public_read_open_model_requirements"
on public.model_requirements
for select
to anon, authenticated
using (
  is_open = true
  and exists (
    select 1
    from public.course_sessions cs
    join public.courses c on c.id = cs.course_id
    where cs.id = model_requirements.session_id
      and cs.status = 'scheduled'
      and c.is_active = true
  )
);

create policy "admin_manage_model_applications"
on public.model_applications
for all
to authenticated
using (
  exists (
    select 1
    from public.course_sessions cs
    join public.courses c on c.id = cs.course_id
    where cs.id = model_applications.session_id
      and public.is_admin(c.shop_id)
  )
)
with check (
  exists (
    select 1
    from public.course_sessions cs
    join public.courses c on c.id = cs.course_id
    where cs.id = model_applications.session_id
      and public.is_admin(c.shop_id)
  )
);

create policy "public_create_model_applications"
on public.model_applications
for insert
to anon, authenticated
with check (
  status = 'applied'
  and exists (
    select 1
    from public.model_requirements mr
    where mr.session_id = model_applications.session_id
      and mr.is_open = true
  )
  and exists (
    select 1
    from public.models m
    join public.course_sessions cs on cs.id = model_applications.session_id
    join public.courses c on c.id = cs.course_id
    where m.id = model_applications.model_id
      and m.shop_id = c.shop_id
  )
);

create policy "admin_manage_waivers"
on public.waivers
for all
to authenticated
using (
  exists (
    select 1
    from public.course_sessions cs
    join public.courses c on c.id = cs.course_id
    where cs.id = waivers.session_id
      and public.is_admin(c.shop_id)
  )
)
with check (
  exists (
    select 1
    from public.course_sessions cs
    join public.courses c on c.id = cs.course_id
    where cs.id = waivers.session_id
      and public.is_admin(c.shop_id)
  )
);

create policy "public_create_waivers"
on public.waivers
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.model_applications ma
    where ma.session_id = waivers.session_id
      and ma.model_id = waivers.model_id
  )
);
