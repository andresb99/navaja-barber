create or replace function public.shop_exists(_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shops s
    where s.id = _shop_id
  );
$$;

grant execute on function public.shop_exists(uuid) to anon, authenticated;

create or replace function public.active_service_in_shop(_service_id uuid, _shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.services s
    where s.id = _service_id
      and s.shop_id = _shop_id
      and s.is_active = true
  );
$$;

grant execute on function public.active_service_in_shop(uuid, uuid) to anon, authenticated;

create or replace function public.active_staff_in_shop(_staff_id uuid, _shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff s
    where s.id = _staff_id
      and s.shop_id = _shop_id
      and s.is_active = true
  );
$$;

grant execute on function public.active_staff_in_shop(uuid, uuid) to anon, authenticated;

drop policy if exists "public_create_customers" on public.customers;
create policy "public_create_customers"
on public.customers
for insert
to anon, authenticated
with check (public.shop_exists(shop_id));

drop policy if exists "public_create_appointments" on public.appointments;
create policy "public_create_appointments"
on public.appointments
for insert
to anon, authenticated
with check (
  status in ('pending', 'confirmed')
  and public.shop_exists(shop_id)
  and public.active_service_in_shop(service_id, shop_id)
  and public.active_staff_in_shop(staff_id, shop_id)
);
