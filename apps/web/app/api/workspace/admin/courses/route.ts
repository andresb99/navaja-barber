import { NextRequest, NextResponse } from 'next/server';
import { courseSessionUpsertSchema, courseUpsertSchema } from '@navaja/shared';
import { z } from 'zod';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import { readSanitizedJsonBody } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdminWorkspaceAccess } from '@/lib/workspace-admin-api';

const coursesListQuerySchema = z.object({
  shop_id: z.string().uuid(),
});

const courseMutationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('course'),
    payload: courseUpsertSchema,
  }),
  z.object({
    action: z.literal('session'),
    shop_id: z.string().uuid(),
    payload: courseSessionUpsertSchema,
  }),
]);

export async function GET(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);
  if (!user?.id) {
    return NextResponse.json({ message: 'Debes iniciar sesion.' }, { status: 401 });
  }

  const parsed = coursesListQuerySchema.safeParse({
    shop_id: request.nextUrl.searchParams.get('shop_id'),
  });

  if (!parsed.success) {
    return NextResponse.json({ message: 'shop_id invalido.' }, { status: 400 });
  }

  try {
    await requireAdminWorkspaceAccess({
      userId: user.id,
      shopId: parsed.data.shop_id,
    });
  } catch (cause) {
    return NextResponse.json(
      { message: cause instanceof Error ? cause.message : 'Acceso denegado.' },
      { status: 403 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: courses, error: courseError } = await admin
    .from('courses')
    .select('id, title, level, price_cents, duration_hours, is_active')
    .eq('shop_id', parsed.data.shop_id)
    .order('title');

  if (courseError) {
    return NextResponse.json(
      { message: courseError.message || 'No se pudieron cargar los cursos.' },
      { status: 400 },
    );
  }

  const courseIds = (courses || []).map((item) => String(item.id));
  const { data: sessions } = courseIds.length
    ? await admin
        .from('course_sessions')
        .select('id, course_id, start_at, capacity, location, status')
        .in('course_id', courseIds)
        .order('start_at')
    : { data: [] as Array<Record<string, unknown>> };
  const sessionIds = (sessions || []).map((item) => String(item.id));
  const { data: enrollments } = sessionIds.length
    ? await admin
        .from('course_enrollments')
        .select('id, session_id, name, phone, email, status, created_at')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false })
    : { data: [] as Array<Record<string, unknown>> };

  return NextResponse.json({
    courses: (courses || []).map((item) => ({
      id: String(item.id),
      title: String(item.title),
      level: String(item.level || ''),
      price_cents: Number(item.price_cents || 0),
      duration_hours: Number(item.duration_hours || 0),
      is_active: Boolean(item.is_active),
    })),
    sessions: (sessions || []).map((item) => ({
      id: String(item.id),
      course_id: String(item.course_id),
      start_at: String(item.start_at),
      capacity: Number(item.capacity || 0),
      location: String(item.location || ''),
      status: String(item.status || ''),
    })),
    enrollments: (enrollments || []).map((item) => ({
      id: String(item.id),
      session_id: String(item.session_id),
      name: String(item.name || ''),
      phone: String(item.phone || ''),
      email: String(item.email || ''),
      status: String(item.status || ''),
      created_at: String(item.created_at || ''),
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);
  if (!user?.id) {
    return NextResponse.json({ message: 'Debes iniciar sesion.' }, { status: 401 });
  }

  const body = await readSanitizedJsonBody(request);
  const parsed = courseMutationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.flatten().formErrors.join(', ') || 'Datos invalidos.' },
      { status: 400 },
    );
  }

  try {
    await requireAdminWorkspaceAccess({
      userId: user.id,
      shopId: parsed.data.action === 'course' ? parsed.data.payload.shop_id : parsed.data.shop_id,
    });
  } catch (cause) {
    return NextResponse.json(
      { message: cause instanceof Error ? cause.message : 'Acceso denegado.' },
      { status: 403 },
    );
  }

  const admin = createSupabaseAdminClient();

  if (parsed.data.action === 'course') {
    const { data, error } = await admin
      .from('courses')
      .insert(parsed.data.payload)
      .select('id, title, level, price_cents, duration_hours, is_active')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: error?.message || 'No se pudo crear el curso.' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      item: {
        id: String(data.id),
        title: String(data.title),
        level: String(data.level || ''),
        price_cents: Number(data.price_cents || 0),
        duration_hours: Number(data.duration_hours || 0),
        is_active: Boolean(data.is_active),
      },
    });
  }

  const { data: scopedCourse } = await admin
    .from('courses')
    .select('id')
    .eq('id', parsed.data.payload.course_id)
    .eq('shop_id', parsed.data.shop_id)
    .maybeSingle();

  if (!scopedCourse?.id) {
    return NextResponse.json(
      { message: 'El curso seleccionado no pertenece a esta barberia.' },
      { status: 400 },
    );
  }

  const { data, error } = await admin
    .from('course_sessions')
    .insert(parsed.data.payload)
    .select('id, course_id, start_at, capacity, location, status')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: error?.message || 'No se pudo crear la sesion.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    item: {
      id: String(data.id),
      course_id: String(data.course_id),
      start_at: String(data.start_at),
      capacity: Number(data.capacity || 0),
      location: String(data.location || ''),
      status: String(data.status || ''),
    },
  });
}
