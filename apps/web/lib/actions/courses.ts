'use server';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// ── Types ────────────────────────────────────────────────────────────────────
export interface CourseItem {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  duration_hours: number;
  level: string;
  image_url: string | null;
  shop_name: string;
  shop_slug: string;
  upcoming_sessions: number;
  enrollments_count: number;
  rating_avg: number;
  review_count: number;
}

export interface CourseFilters {
  level?: string | undefined;
  durationBucket?: string | undefined;
  priceMin?: number | undefined;
  priceMax?: number | undefined;
  onlyWithSessions?: boolean | undefined;
  sortBy?: 'newest' | 'popular' | 'rating' | undefined;
}

export interface CoursesPage {
  courses: CourseItem[];
  totalCount: number;
  hasMore: boolean;
}

// ── Level normalization (server-side mirror) ─────────────────────────────────
const LEVEL_REVERSE_MAP: Record<string, string[]> = {
  Principiante: ['beginner', 'beginner / intermediate', 'inicial'],
  Intermedio: ['intermediate', 'intermedio'],
  Avanzado: ['advanced', 'avanzado'],
  Profesional: ['professional', 'profesional'],
};

// ── Duration ranges ──────────────────────────────────────────────────────────
const DURATION_RANGES: Record<string, [number, number]> = {
  short: [0, 5],
  medium: [6, 10],
  long: [11, 9999],
};

const PAGE_SIZE = 15;

// ── Fetch paginated courses ──────────────────────────────────────────────────
export async function fetchCourses(
  filters: CourseFilters,
  page: number
): Promise<CoursesPage> {
  const supabase = createSupabaseAdminClient();
  const offset = page * PAGE_SIZE;

  // Build query from view
  let query = supabase
    .from('courses_with_stats')
    .select('*', { count: 'exact' });

  // Apply order
  switch (filters.sortBy) {
    case 'popular':
      query = query.order('enrollments_count', { ascending: false }).order('created_at', { ascending: false });
      break;
    case 'rating':
      query = query.order('rating_avg', { ascending: false }).order('review_count', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  // Apply filters
  if (filters.level && filters.level !== 'Todos') {
    const rawLevels = LEVEL_REVERSE_MAP[filters.level];
    if (rawLevels?.length) {
      query = query.in('level', rawLevels);
    }
  }

  if (filters.durationBucket && filters.durationBucket !== 'all') {
    const range = DURATION_RANGES[filters.durationBucket];
    if (range) {
      query = query.gte('duration_hours', range[0]).lte('duration_hours', range[1]);
    }
  }

  if (typeof filters.priceMin === 'number') {
    query = query.gte('price_cents', filters.priceMin);
  }
  if (typeof filters.priceMax === 'number') {
    query = query.lte('price_cents', filters.priceMax);
  }

  // Pagination
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: rawCourses, count } = await query;
  const totalCount = count ?? 0;

  // Fetch upcoming session counts (still need this from the original table join or separate query)
  const courseIds = (rawCourses || []).map((c) => c.id as string);
  const sessionCounts = new Map<string, number>();

  if (courseIds.length > 0) {
    const { data: sessions } = await supabase
      .from('course_sessions')
      .select('course_id')
      .in('course_id', courseIds)
      .eq('status', 'scheduled')
      .gte('start_at', new Date().toISOString());

    if (sessions) {
      for (const s of sessions) {
        const cid = s.course_id as string;
        sessionCounts.set(cid, (sessionCounts.get(cid) || 0) + 1);
      }
    }
  }

  const courses: CourseItem[] = (rawCourses || []).map((course) => {
    return {
      id: String(course.id),
      title: String(course.title),
      description: String(course.description || ''),
      price_cents: Number(course.price_cents || 0),
      duration_hours: Number(course.duration_hours || 0),
      level: String(course.level || ''),
      image_url: (typeof course.image_url === 'string' && course.image_url.trim()) || null,
      shop_name: String(course.shop_name || ''),
      shop_slug: String(course.shop_slug || ''),
      upcoming_sessions: sessionCounts.get(String(course.id)) || 0,
      enrollments_count: Number(course.enrollments_count || 0),
      rating_avg: Number(course.rating_avg || 0),
      review_count: Number(course.review_count || 0),
    };
  });

  // Filter by sessions client-side
  const filtered = filters.onlyWithSessions
    ? courses.filter((c) => c.upcoming_sessions > 0)
    : courses;

  return {
    courses: filtered,
    totalCount,
    hasMore: offset + PAGE_SIZE < totalCount,
  };
}

// ── Fetch metadata for filters (levels, price bounds) ────────────────────────
export interface CoursesMeta {
  levels: string[];
  priceMin: number;
  priceMax: number;
}

export async function fetchCoursesMeta(): Promise<CoursesMeta> {
  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from('courses')
    .select('level, price_cents')
    .eq('is_active', true);

  const rows = data || [];
  const normalizedLevels = new Set<string>();
  let min = Infinity;
  let max = -Infinity;

  for (const row of rows) {
    const raw = String(row.level || '').toLowerCase().trim();
    for (const [normalized, rawValues] of Object.entries(LEVEL_REVERSE_MAP)) {
      if (rawValues.includes(raw)) {
        normalizedLevels.add(normalized);
        break;
      }
    }
    const price = Number(row.price_cents || 0);
    if (price < min) min = price;
    if (price > max) max = price;
  }

  const order = ['Principiante', 'Intermedio', 'Avanzado', 'Profesional'];
  return {
    levels: order.filter((l) => normalizedLevels.has(l)),
    priceMin: min === Infinity ? 0 : min,
    priceMax: max === -Infinity ? 100000 : max,
  };
}
