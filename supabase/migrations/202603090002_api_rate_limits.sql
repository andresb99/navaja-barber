create table if not exists public.api_rate_limit_counters (
  bucket_name text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (bucket_name, subject_hash, window_started_at)
);

create index if not exists api_rate_limit_counters_expires_at_idx
  on public.api_rate_limit_counters (expires_at);

create or replace function public.consume_api_rate_limit(
  p_bucket_name text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  limit_value integer,
  remaining integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_limit integer := greatest(coalesce(p_limit, 1), 1);
  v_window_seconds integer := greatest(coalesce(p_window_seconds, 60), 1);
  v_window_started_at timestamptz :=
    to_timestamp(floor(extract(epoch from v_now) / v_window_seconds) * v_window_seconds);
  v_reset_at timestamptz := v_window_started_at + make_interval(secs => v_window_seconds);
  v_request_count integer;
begin
  insert into public.api_rate_limit_counters (
    bucket_name,
    subject_hash,
    window_started_at,
    request_count,
    expires_at,
    created_at,
    updated_at
  )
  values (
    coalesce(nullif(trim(p_bucket_name), ''), 'api_default'),
    md5(coalesce(trim(p_subject), 'anonymous')),
    v_window_started_at,
    1,
    v_reset_at + interval '1 day',
    v_now,
    v_now
  )
  on conflict (bucket_name, subject_hash, window_started_at)
  do update
    set request_count = public.api_rate_limit_counters.request_count + 1,
        expires_at = excluded.expires_at,
        updated_at = v_now
  returning public.api_rate_limit_counters.request_count into v_request_count;

  delete from public.api_rate_limit_counters
  where expires_at < v_now;

  return query
  select
    v_request_count <= v_limit as allowed,
    v_limit as limit_value,
    greatest(v_limit - v_request_count, 0) as remaining,
    v_reset_at as reset_at,
    case
      when v_request_count <= v_limit then 0
      else greatest(1, ceil(extract(epoch from (v_reset_at - v_now)))::integer)
    end as retry_after_seconds;
end;
$$;

revoke all on table public.api_rate_limit_counters from public, anon, authenticated;
revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to anon, authenticated;
