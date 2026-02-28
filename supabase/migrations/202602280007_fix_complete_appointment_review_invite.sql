create or replace function public.complete_appointment_and_create_review_invite(
  p_appointment_id uuid,
  p_price_cents integer,
  p_token_hash text,
  p_sent_at timestamptz,
  p_expires_at timestamptz
)
returns table (
  appointment_id uuid,
  customer_id uuid,
  review_invite_created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_has_review boolean;
begin
  if coalesce(length(p_token_hash), 0) < 32 then
    raise exception 'Token hash is invalid';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = p_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found';
  end if;

  update public.appointments
  set
    status = 'done',
    price_cents = coalesce(p_price_cents, price_cents),
    completed_at = coalesce(completed_at, now()),
    cancelled_at = null,
    cancelled_by = null,
    cancellation_reason = null,
    review_request_sent_at = p_sent_at
  where id = v_appointment.id;

  select exists (
    select 1
    from public.appointment_reviews ar
    where ar.appointment_id = v_appointment.id
  )
  into v_has_review;

  if v_has_review then
    return query
    select v_appointment.id, v_appointment.customer_id, false;
    return;
  end if;

  insert into public.review_invites (
    appointment_id,
    customer_id,
    token_hash,
    sent_at,
    expires_at,
    used_at,
    revoked_at
  )
  values (
    v_appointment.id,
    v_appointment.customer_id,
    p_token_hash,
    p_sent_at,
    p_expires_at,
    null,
    null
  )
  on conflict on constraint review_invites_appointment_id_key do update
  set
    token_hash = excluded.token_hash,
    sent_at = excluded.sent_at,
    expires_at = excluded.expires_at,
    used_at = null,
    revoked_at = null;

  return query
  select v_appointment.id, v_appointment.customer_id, true;
end;
$$;
