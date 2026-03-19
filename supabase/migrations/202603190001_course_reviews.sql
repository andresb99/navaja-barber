create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  enrollment_id uuid null references public.course_enrollments(id) on delete set null,
  reviewer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text null,
  status text not null default 'published' check (status in ('published', 'hidden', 'flagged')),
  submitted_at timestamptz not null default now()
);

create index if not exists course_reviews_course_status_idx
  on public.course_reviews (course_id, submitted_at desc)
  where status = 'published';

create index if not exists course_reviews_shop_idx
  on public.course_reviews (shop_id, submitted_at desc);

alter table public.course_reviews enable row level security;

create policy "Public can read published course reviews"
  on public.course_reviews for select
  using (status = 'published');

create policy "Anyone can submit a course review"
  on public.course_reviews for insert
  with check (status = 'published');
