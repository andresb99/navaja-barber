import { CoursesClient } from '@/components/courses/courses-client';
import { fetchCourses, fetchCoursesMeta } from '@/lib/actions/courses';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cursos | Beardly Academy',
  description: 'Explora cursos y masterclasses de barbería profesional. Desde técnicas de fade hasta colorimetría avanzada.',
};

export default async function CoursesPage() {
  const [initialPage, meta] = await Promise.all([
    fetchCourses({}, 0),
    fetchCoursesMeta(),
  ]);

  return (
    <CoursesClient
      initialCourses={initialPage.courses}
      initialHasMore={initialPage.hasMore}
      initialTotal={initialPage.totalCount}
      meta={meta}
    />
  );
}
