drop policy if exists "public_create_customers" on public.customers;
drop policy if exists "public_create_appointments" on public.appointments;

drop policy if exists "admin_manage_appointments" on public.appointments;
create policy "admin_read_appointments"
on public.appointments
for select
to authenticated
using (public.is_admin(shop_id));

drop policy if exists "staff_update_own_appointments" on public.appointments;
