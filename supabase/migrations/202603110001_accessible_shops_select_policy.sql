grant select on public.shops to authenticated;

drop policy if exists "authenticated_users_read_accessible_shops" on public.shops;
create policy "authenticated_users_read_accessible_shops"
on public.shops
for select
to authenticated
using (
  status = 'active'
  or owner_user_id = auth.uid()
  or exists (
    select 1
    from public.shop_memberships sm
    where sm.shop_id = shops.id
      and sm.user_id = auth.uid()
      and sm.membership_status = 'active'
  )
  or exists (
    select 1
    from public.staff s
    where s.shop_id = shops.id
      and s.auth_user_id = auth.uid()
      and s.is_active = true
  )
);
