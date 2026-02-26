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
    status = excluded.status,
    notes = excluded.notes;
