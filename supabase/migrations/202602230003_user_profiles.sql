-- User profiles for authenticated public users

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text null,
  phone text null,
  avatar_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_created_idx
  on public.user_profiles (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

drop policy if exists "users_insert_own_profile" on public.user_profiles;
drop policy if exists "users_read_own_profile" on public.user_profiles;
drop policy if exists "users_update_own_profile" on public.user_profiles;
drop policy if exists "admins_read_profiles" on public.user_profiles;

create policy "users_insert_own_profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = auth_user_id);

create policy "users_read_own_profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = auth_user_id);

create policy "users_update_own_profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "admins_read_profiles"
on public.user_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.staff s
    where s.auth_user_id = auth.uid()
      and s.role = 'admin'
      and s.is_active = true
  )
);
