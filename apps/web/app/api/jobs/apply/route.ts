import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { jobApplicationCreateSchema } from '@navaja/shared';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const payloadRaw = formData.get('payload');
  const cv = formData.get('cv');

  if (typeof payloadRaw !== 'string' || !(cv instanceof File)) {
    return new NextResponse('Solicitud multipart invalida.', { status: 400 });
  }

  if (cv.size > MAX_FILE_SIZE) {
    return new NextResponse('El archivo de CV supera los 5MB.', { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    return new NextResponse('Datos de postulacion invalidos.', { status: 400 });
  }

  const parsedPayload = jobApplicationCreateSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return new NextResponse(parsedPayload.error.flatten().formErrors.join(', ') || 'Datos de postulacion invalidos.', {
      status: 400,
    });
  }

  const ext = cv.name.includes('.') ? cv.name.split('.').pop() : 'pdf';
  const safeName = sanitizeFilename(cv.name || `cv.${ext}`);
  const path = `${parsedPayload.data.shop_id}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await cv.arrayBuffer());

  const supabase = createSupabaseAdminClient();

  const { error: uploadError } = await supabase.storage
    .from('cvs')
    .upload(path, buffer, {
      contentType: cv.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    return new NextResponse(uploadError.message, { status: 400 });
  }

  const { data: application, error: applicationError } = await supabase
    .from('job_applications')
    .insert({
      shop_id: parsedPayload.data.shop_id,
      name: parsedPayload.data.name,
      phone: parsedPayload.data.phone,
      email: parsedPayload.data.email,
      instagram: parsedPayload.data.instagram || null,
      experience_years: parsedPayload.data.experience_years,
      availability: parsedPayload.data.availability,
      cv_path: path,
      status: 'new',
    })
    .select('id')
    .single();

  if (applicationError || !application) {
    await supabase.storage.from('cvs').remove([path]);
    return new NextResponse(applicationError?.message || 'No se pudo guardar la postulacion.', { status: 400 });
  }

  return NextResponse.json({ application_id: application.id });
}

