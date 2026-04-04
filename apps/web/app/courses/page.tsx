import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { CoursesClient } from '@/components/courses/courses-client';
import type { CourseItem } from '@/components/courses/courses-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cursos | Beardly Academy',
  description: 'Explora cursos y masterclasses de barbería profesional. Desde técnicas de fade hasta colorimetría avanzada.',
};

export default async function CoursesPage() {
  const supabase = createSupabaseAdminClient();

  const { data: rawCourses } = await supabase
    .from('courses')
    .select('id, title, description, price_cents, duration_hours, level, image_url, shop_id, shops(name, slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Fetch upcoming session counts per course
  const courseIds = (rawCourses || []).map((c) => c.id as string);

  let sessionCounts = new Map<string, number>();
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
    const shop = course.shops as unknown as { name: string; slug: string } | null;
    return {
      id: String(course.id),
      title: String(course.title),
      description: String(course.description || ''),
      price_cents: Number(course.price_cents || 0),
      duration_hours: Number(course.duration_hours || 0),
      level: String(course.level || ''),
      image_url: (typeof course.image_url === 'string' && course.image_url.trim()) || null,
      shop_name: shop?.name || '',
      shop_slug: shop?.slug || '',
      upcoming_sessions: sessionCounts.get(String(course.id)) || 0,
    };
  });

  return <CoursesClient courses={courses} />;
}
