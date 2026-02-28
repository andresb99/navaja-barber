-- Deterministic seed data for local/dev

insert into public.shops (id, name, timezone)
values ('11111111-1111-1111-1111-111111111111', 'Navaja Barber Downtown', 'America/New_York')
on conflict (id) do update
set name = excluded.name,
    timezone = excluded.timezone;

insert into public.staff (id, shop_id, auth_user_id, name, role, phone, is_active)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', null, 'Andre Owner', 'admin', '+1-555-0101', true),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', null, 'Luis Barber', 'staff', '+1-555-0102', true)
on conflict (id) do update
set name = excluded.name,
    role = excluded.role,
    phone = excluded.phone,
    is_active = excluded.is_active;

insert into public.services (id, shop_id, name, price_cents, duration_minutes, is_active)
values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'Classic Cut', 3000, 30, true),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'Skin Fade', 4200, 45, true),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'Beard Trim', 2200, 25, true),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111111', 'Cut + Beard Combo', 5200, 60, true),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111111', 'Hot Towel Shave', 3500, 40, true)
on conflict (id) do update
set name = excluded.name,
    price_cents = excluded.price_cents,
    duration_minutes = excluded.duration_minutes,
    is_active = excluded.is_active;

-- Default working hours: Monday-Friday 09:00-17:00 for both staff
insert into public.working_hours (shop_id, staff_id, day_of_week, start_time, end_time)
select
  '11111111-1111-1111-1111-111111111111',
  s.staff_id,
  d.day_of_week,
  '09:00'::time,
  '17:00'::time
from (values
  ('22222222-2222-2222-2222-222222222221'::uuid),
  ('22222222-2222-2222-2222-222222222222'::uuid)
) as s(staff_id)
cross join (values (1), (2), (3), (4), (5)) as d(day_of_week)
on conflict (staff_id, day_of_week, start_time, end_time) do nothing;

insert into public.courses (
  id,
  shop_id,
  title,
  description,
  price_cents,
  duration_hours,
  level,
  is_active
)
values (
  '44444444-4444-4444-4444-444444444401',
  '11111111-1111-1111-1111-111111111111',
  'Fundamentals of Modern Fades',
  'Hands-on training focused on sectioning, clipper control, blending, and consultation workflows for modern fade services.',
  15900,
  6,
  'Beginner / Intermediate',
  true
)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    duration_hours = excluded.duration_hours,
    level = excluded.level,
    is_active = excluded.is_active;

insert into public.course_sessions (
  id,
  course_id,
  start_at,
  capacity,
  location,
  status
)
values (
  '55555555-5555-5555-5555-555555555501',
  '44444444-4444-4444-4444-444444444401',
  now() + interval '14 days',
  12,
  'Navaja Barber Studio Classroom',
  'scheduled'
)
on conflict (id) do update
set start_at = excluded.start_at,
    capacity = excluded.capacity,
    location = excluded.location,
    status = excluded.status;

insert into public.model_requirements (
  id,
  session_id,
  requirements,
  compensation_type,
  compensation_value_cents,
  notes_public,
  is_open
)
values (
  '88888888-8888-8888-8888-888888888801',
  '55555555-5555-5555-5555-555555555501',
  jsonb_build_object(
    'models_needed', 3,
    'beard_required', false,
    'hair_length_category', 'indistinto'
  ),
  'descuento',
  3000,
  'Buscamos modelos para practica guiada. Te contactamos por WhatsApp.',
  true
)
on conflict (id) do update
set requirements = excluded.requirements,
    compensation_type = excluded.compensation_type,
    compensation_value_cents = excluded.compensation_value_cents,
    notes_public = excluded.notes_public,
    is_open = excluded.is_open;

-- Optional sample customer + appointment in pending state
insert into public.customers (id, shop_id, name, phone, email)
values (
  '66666666-6666-6666-6666-666666666601',
  '11111111-1111-1111-1111-111111111111',
  'Sample Customer',
  '+1-555-0103',
  'sample.customer@example.com'
)
on conflict (id) do update
set name = excluded.name,
    phone = excluded.phone,
    email = excluded.email;

insert into public.appointments (
  id,
  shop_id,
  staff_id,
  customer_id,
  service_id,
  start_at,
  status,
  notes
)
values (
  '77777777-7777-7777-7777-777777777701',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '66666666-6666-6666-6666-666666666601',
  '33333333-3333-3333-3333-333333333302',
  now() + interval '1 day',
  'pending',
  'Seeded example appointment'
)
on conflict (id) do update
set start_at = excluded.start_at,
    end_at = null,
    status = excluded.status,
    notes = excluded.notes;

-- Additional deterministic customers for metrics/testing
insert into public.customers (id, shop_id, name, phone, email)
values
  ('66666666-6666-6666-6666-666666666602', '11111111-1111-1111-1111-111111111111', 'Marcus Reed', '+1-555-0104', 'marcus.reed@example.com'),
  ('66666666-6666-6666-6666-666666666603', '11111111-1111-1111-1111-111111111111', 'Ethan Brooks', '+1-555-0105', 'ethan.brooks@example.com'),
  ('66666666-6666-6666-6666-666666666604', '11111111-1111-1111-1111-111111111111', 'Noah Carter', '+1-555-0106', 'noah.carter@example.com'),
  ('66666666-6666-6666-6666-666666666605', '11111111-1111-1111-1111-111111111111', 'Julian Perez', '+1-555-0107', 'julian.perez@example.com'),
  ('66666666-6666-6666-6666-666666666606', '11111111-1111-1111-1111-111111111111', 'Mateo Diaz', '+1-555-0108', 'mateo.diaz@example.com'),
  ('66666666-6666-6666-6666-666666666607', '11111111-1111-1111-1111-111111111111', 'Adrian Cole', '+1-555-0109', 'adrian.cole@example.com'),
  ('66666666-6666-6666-6666-666666666608', '11111111-1111-1111-1111-111111111111', 'Leo Sanchez', '+1-555-0110', 'leo.sanchez@example.com'),
  ('66666666-6666-6666-6666-666666666609', '11111111-1111-1111-1111-111111111111', 'David Miles', '+1-555-0111', 'david.miles@example.com'),
  ('66666666-6666-6666-6666-666666666610', '11111111-1111-1111-1111-111111111111', 'Owen Torres', '+1-555-0112', 'owen.torres@example.com')
on conflict (id) do update
set name = excluded.name,
    phone = excluded.phone,
    email = excluded.email;

-- Time off for one staff member to make occupancy more realistic
insert into public.time_off (id, shop_id, staff_id, start_at, end_at, reason)
values (
  '99999999-9999-9999-9999-999999999901',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  date_trunc('day', now()) - interval '2 days' + interval '13 hours',
  date_trunc('day', now()) - interval '2 days' + interval '15 hours',
  'Seeded personal block'
)
on conflict (id) do update
set start_at = excluded.start_at,
    end_at = excluded.end_at,
    reason = excluded.reason;

-- Richer appointment dataset for metrics pages
insert into public.appointments (
  id,
  shop_id,
  staff_id,
  customer_id,
  service_id,
  start_at,
  status,
  price_cents,
  notes,
  completed_at,
  cancelled_at,
  cancelled_by,
  cancellation_reason,
  review_request_sent_at
)
values
  (
    '77777777-7777-7777-7777-777777777702',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666602',
    '33333333-3333-3333-3333-333333333304',
    date_trunc('day', now()) - interval '6 days' + interval '10 hours',
    'done',
    5200,
    'High-value combo service',
    date_trunc('day', now()) - interval '6 days' + interval '11 hours',
    null,
    null,
    null,
    date_trunc('day', now()) - interval '6 days' + interval '11 hours 15 minutes'
  ),
  (
    '77777777-7777-7777-7777-777777777703',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666603',
    '33333333-3333-3333-3333-333333333302',
    date_trunc('day', now()) - interval '5 days' + interval '14 hours',
    'done',
    4300,
    'Premium fade',
    date_trunc('day', now()) - interval '5 days' + interval '14 hours 45 minutes',
    null,
    null,
    null,
    date_trunc('day', now()) - interval '5 days' + interval '15 hours'
  ),
  (
    '77777777-7777-7777-7777-777777777704',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666602',
    '33333333-3333-3333-3333-333333333301',
    date_trunc('day', now()) - interval '3 days' + interval '11 hours',
    'done',
    3000,
    'Repeat customer visit',
    date_trunc('day', now()) - interval '3 days' + interval '11 hours 30 minutes',
    null,
    null,
    null,
    date_trunc('day', now()) - interval '3 days' + interval '11 hours 45 minutes'
  ),
  (
    '77777777-7777-7777-7777-777777777705',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666604',
    '33333333-3333-3333-3333-333333333305',
    date_trunc('day', now()) - interval '1 day' + interval '15 hours',
    'done',
    3500,
    'Shave service',
    date_trunc('day', now()) - interval '1 day' + interval '15 hours 40 minutes',
    null,
    null,
    null,
    date_trunc('day', now()) - interval '1 day' + interval '15 hours 50 minutes'
  ),
  (
    '77777777-7777-7777-7777-777777777706',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666605',
    '33333333-3333-3333-3333-333333333301',
    date_trunc('day', now()) + interval '9 hours 30 minutes',
    'done',
    3000,
    'Same-day completed walk-in',
    date_trunc('day', now()) + interval '10 hours',
    null,
    null,
    null,
    date_trunc('day', now()) + interval '10 hours 10 minutes'
  ),
  (
    '77777777-7777-7777-7777-777777777707',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666606',
    '33333333-3333-3333-3333-333333333303',
    date_trunc('day', now()) + interval '13 hours',
    'confirmed',
    2200,
    'Confirmed for later today',
    null,
    null,
    null,
    null,
    null
  ),
  (
    '77777777-7777-7777-7777-777777777708',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666607',
    '33333333-3333-3333-3333-333333333302',
    date_trunc('day', now()) - interval '2 days' + interval '16 hours',
    'cancelled',
    4200,
    'Admin reschedule needed',
    null,
    date_trunc('day', now()) - interval '2 days' + interval '12 hours',
    'admin',
    'Schedule conflict',
    null
  ),
  (
    '77777777-7777-7777-7777-777777777709',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666608',
    '33333333-3333-3333-3333-333333333301',
    date_trunc('day', now()) - interval '12 days' + interval '10 hours',
    'done',
    3000,
    'Older monthly appointment',
    date_trunc('day', now()) - interval '12 days' + interval '10 hours 30 minutes',
    null,
    null,
    null,
    date_trunc('day', now()) - interval '12 days' + interval '10 hours 45 minutes'
  ),
  (
    '77777777-7777-7777-7777-777777777710',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666609',
    '33333333-3333-3333-3333-333333333302',
    date_trunc('day', now()) - interval '6 days' + interval '9 hours',
    'done',
    4200,
    'Strong start to the week',
    date_trunc('day', now()) - interval '6 days' + interval '9 hours 45 minutes',
    null,
    null,
    null,
    date_trunc('day', now()) - interval '6 days' + interval '10 hours'
  ),
  (
    '77777777-7777-7777-7777-777777777711',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666610',
    '33333333-3333-3333-3333-333333333304',
    date_trunc('day', now()) - interval '4 days' + interval '13 hours',
    'done',
    5200,
    'High-value repeat client',
    date_trunc('day', now()) - interval '4 days' + interval '14 hours',
    null,
    null,
    null,
    date_trunc('day', now()) - interval '4 days' + interval '14 hours 15 minutes'
  ),
  (
    '77777777-7777-7777-7777-777777777712',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666609',
    '33333333-3333-3333-3333-333333333303',
    date_trunc('day', now()) - interval '2 days' + interval '10 hours',
    'done',
    2200,
    'Repeat client beard maintenance',
    date_trunc('day', now()) - interval '2 days' + interval '10 hours 25 minutes',
    null,
    null,
    null,
    date_trunc('day', now()) - interval '2 days' + interval '10 hours 40 minutes'
  ),
  (
    '77777777-7777-7777-7777-777777777713',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666603',
    '33333333-3333-3333-3333-333333333301',
    date_trunc('day', now()) - interval '1 day' + interval '11 hours',
    'no_show',
    3000,
    'Client never arrived',
    null,
    null,
    null,
    null,
    null
  ),
  (
    '77777777-7777-7777-7777-777777777714',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666604',
    '33333333-3333-3333-3333-333333333305',
    date_trunc('day', now()) + interval '11 hours',
    'done',
    3500,
    'Same-day premium shave',
    date_trunc('day', now()) + interval '11 hours 40 minutes',
    null,
    null,
    null,
    date_trunc('day', now()) + interval '11 hours 55 minutes'
  ),
  (
    '77777777-7777-7777-7777-777777777715',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666605',
    '33333333-3333-3333-3333-333333333302',
    date_trunc('day', now()) + interval '14 hours',
    'confirmed',
    4200,
    'Booked for later today',
    null,
    null,
    null,
    null,
    null
  ),
  (
    '77777777-7777-7777-7777-777777777716',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666606',
    '33333333-3333-3333-3333-333333333301',
    date_trunc('day', now()) - interval '3 days' + interval '15 hours',
    'cancelled',
    3000,
    'Last-minute client cancel',
    null,
    date_trunc('day', now()) - interval '3 days' + interval '9 hours',
    'customer',
    'Customer rescheduled',
    null
  ),
  (
    '77777777-7777-7777-7777-777777777717',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666610',
    '33333333-3333-3333-3333-333333333304',
    date_trunc('day', now()) - interval '9 days' + interval '12 hours',
    'done',
    5200,
    'Older month data point',
    date_trunc('day', now()) - interval '9 days' + interval '13 hours',
    null,
    null,
    null,
    date_trunc('day', now()) - interval '9 days' + interval '13 hours 20 minutes'
  )
on conflict (id) do update
set staff_id = excluded.staff_id,
    customer_id = excluded.customer_id,
    service_id = excluded.service_id,
    start_at = excluded.start_at,
    end_at = null,
    status = excluded.status,
    price_cents = excluded.price_cents,
    notes = excluded.notes,
    completed_at = excluded.completed_at,
    cancelled_at = excluded.cancelled_at,
    cancelled_by = excluded.cancelled_by,
    cancellation_reason = excluded.cancellation_reason,
    review_request_sent_at = excluded.review_request_sent_at;

-- Verified appointment reviews to feed rating metrics
insert into public.appointment_reviews (
  id,
  shop_id,
  appointment_id,
  staff_id,
  customer_id,
  rating,
  comment,
  status,
  is_verified,
  submitted_at,
  published_at
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777702',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666602',
    5,
    'Fast service and clean finish.',
    'published',
    true,
    date_trunc('day', now()) - interval '6 days' + interval '12 hours',
    date_trunc('day', now()) - interval '6 days' + interval '12 hours'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777704',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666602',
    4,
    'Consistent work, would book again.',
    'published',
    true,
    date_trunc('day', now()) - interval '3 days' + interval '12 hours',
    date_trunc('day', now()) - interval '3 days' + interval '12 hours'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777705',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666604',
    5,
    'Great shave and attention to detail.',
    'published',
    true,
    date_trunc('day', now()) - interval '1 day' + interval '17 hours',
    date_trunc('day', now()) - interval '1 day' + interval '17 hours'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777710',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666609',
    5,
    'Excellent fade, very sharp.',
    'published',
    true,
    date_trunc('day', now()) - interval '6 days' + interval '11 hours',
    date_trunc('day', now()) - interval '6 days' + interval '11 hours'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777712',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666609',
    4,
    'Solid beard trim, quick visit.',
    'published',
    true,
    date_trunc('day', now()) - interval '2 days' + interval '12 hours',
    date_trunc('day', now()) - interval '2 days' + interval '12 hours'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
    '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777714',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666604',
    5,
    'Very clean shave and great experience.',
    'published',
    true,
    date_trunc('day', now()) + interval '13 hours',
    date_trunc('day', now()) + interval '13 hours'
  )
on conflict (appointment_id) do update
set rating = excluded.rating,
    comment = excluded.comment,
    status = excluded.status,
    is_verified = excluded.is_verified,
    submitted_at = excluded.submitted_at,
    published_at = excluded.published_at;

-- A few pending/unused review invites for testing link generation states
insert into public.review_invites (
  id,
  appointment_id,
  customer_id,
  token_hash,
  sent_at,
  expires_at,
  used_at,
  revoked_at
)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '77777777-7777-7777-7777-777777777703',
    '66666666-6666-6666-6666-666666666603',
    repeat('a', 64),
    date_trunc('day', now()) - interval '5 days' + interval '15 hours',
    date_trunc('day', now()) + interval '9 days',
    null,
    null
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    '77777777-7777-7777-7777-777777777711',
    '66666666-6666-6666-6666-666666666610',
    repeat('b', 64),
    date_trunc('day', now()) - interval '4 days' + interval '15 hours',
    date_trunc('day', now()) + interval '10 days',
    null,
    null
  )
on conflict (appointment_id) do update
set token_hash = excluded.token_hash,
    sent_at = excluded.sent_at,
    expires_at = excluded.expires_at,
    used_at = excluded.used_at,
    revoked_at = excluded.revoked_at;
