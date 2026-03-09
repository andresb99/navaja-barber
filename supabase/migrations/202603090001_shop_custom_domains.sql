do $$
begin
  create type public.shop_domain_status as enum ('pending', 'verified', 'active', 'failed');
exception
  when duplicate_object then null;
end
$$;

create or replace function public.normalize_custom_domain(input_value text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      lower(
        trim(
          both '.'
          from split_part(
            split_part(
              regexp_replace(trim(coalesce(input_value, '')), '^https?://', '', 'i'),
              '/',
              1
            ),
            ':',
            1
          )
        )
      ),
      '^www\.',
      ''
    ),
    ''
  );
$$;

alter table public.shops
  add column if not exists custom_domain text,
  add column if not exists domain_status public.shop_domain_status,
  add column if not exists domain_verified_at timestamptz;

update public.shops
set custom_domain = public.normalize_custom_domain(custom_domain)
where custom_domain is not null;

create unique index if not exists shops_custom_domain_unique_idx
  on public.shops (public.normalize_custom_domain(custom_domain))
  where custom_domain is not null;

alter table public.shops
  drop constraint if exists shops_custom_domain_consistency_chk;

alter table public.shops
  add constraint shops_custom_domain_consistency_chk
  check (
    (
      custom_domain is null
      and domain_status is null
      and domain_verified_at is null
    )
    or (
      custom_domain is not null
      and domain_status is not null
      and (
        domain_verified_at is null
        or domain_status in ('verified', 'active')
      )
    )
  );

create or replace function public.resolve_public_shop_host(
  p_custom_domain text default null,
  p_slug text default null
)
returns table (
  shop_id uuid,
  shop_slug text,
  shop_status public.shop_status,
  custom_domain text,
  domain_status public.shop_domain_status,
  plan public.subscription_plan,
  subscription_status public.subscription_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sh.id as shop_id,
    sh.slug as shop_slug,
    sh.status as shop_status,
    sh.custom_domain,
    sh.domain_status,
    coalesce(sub.plan, 'free'::public.subscription_plan) as plan,
    coalesce(sub.status, 'active'::public.subscription_status) as subscription_status
  from public.shops sh
  left join public.subscriptions sub
    on sub.shop_id = sh.id
  where sh.status = 'active'
    and (
      (
        p_custom_domain is not null
        and public.normalize_custom_domain(sh.custom_domain) = public.normalize_custom_domain(p_custom_domain)
      )
      or (
        p_slug is not null
        and lower(sh.slug) = lower(p_slug)
      )
    )
  order by
    case
      when p_custom_domain is not null
        and public.normalize_custom_domain(sh.custom_domain) = public.normalize_custom_domain(p_custom_domain)
      then 0
      else 1
    end
  limit 1;
$$;

revoke all on function public.resolve_public_shop_host(text, text) from public;
grant execute on function public.resolve_public_shop_host(text, text) to anon, authenticated;
