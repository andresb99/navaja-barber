import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { readSanitizedJsonBody, sanitizeText } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const courseReviewCreateSchema = z.object({
  course_id: z.string().uuid('ID de curso invalido.'),
  reviewer_name: z.string().min(2, 'Ingresa tu nombre.').max(80),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(600).optional(),
});

export async function POST(request: NextRequest) {
  const body = await readSanitizedJsonBody(request);
  const parsed = courseReviewCreateSchema.safeParse(body);

  if (!parsed.success) {
    return new NextResponse(
      parsed.error.flatten().formErrors.join(', ') || 'Datos de resena invalidos.',
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data: course } = await supabase
    .from('courses')
    .select('id, shop_id, is_active')
    .eq('id', parsed.data.course_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!course?.id) {
    return new NextResponse('El curso no esta disponible.', { status: 404 });
  }

  const { error } = await supabase.from('course_reviews').insert({
    course_id: parsed.data.course_id,
    shop_id: String(course.shop_id),
    reviewer_name: sanitizeText(parsed.data.reviewer_name) || parsed.data.reviewer_name,
    rating: parsed.data.rating,
    comment: parsed.data.comment ? sanitizeText(parsed.data.comment) : null,
    status: 'published',
  });

  if (error) {
    return new NextResponse(error.message || 'No se pudo guardar la resena.', { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
