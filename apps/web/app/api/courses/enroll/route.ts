import { NextResponse, type NextRequest } from 'next/server';
import { courseEnrollmentCreateSchema } from '@navaja/shared';
import { createSupabasePublicClient } from '@/lib/supabase/public';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = courseEnrollmentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return new NextResponse(parsed.error.flatten().formErrors.join(', ') || 'Datos de inscripcion invalidos.', {
      status: 400,
    });
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from('course_enrollments')
    .insert({
      session_id: parsed.data.session_id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) {
    return new NextResponse(error?.message || 'No se pudo registrar la inscripcion.', { status: 400 });
  }

  return NextResponse.json({ enrollment_id: data.id });
}

