import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { trackProductEvent } from '@/lib/product-analytics';
import { sanitizeText, sanitizeUnknownDeep } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const networkJobProfileSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  instagram: z.string().max(120).optional().nullable(),
  experience_years: z.number().min(0).max(60),
  availability: z.string().min(2).max(1000),
});

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const payloadRaw = sanitizeText(formData.get('payload'), { trim: true });
  const cv = formData.get('cv');

  if (!payloadRaw || !(cv instanceof File)) {
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

  const parsedPayload = networkJobProfileSchema.safeParse(sanitizeUnknownDeep(payload));
  if (!parsedPayload.success) {
    return new NextResponse(
      parsedPayload.error.flatten().formErrors.join(', ') || 'Datos de postulacion invalidos.',
      { status: 400 },
    );
  }

  const ext = cv.name.includes('.') ? cv.name.split('.').pop() : 'pdf';
  const safeName = sanitizeFilename(cv.name || `cv.${ext}`);
  const path = `network/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
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

  const { data: profile, error: profileError } = await supabase
    .from('marketplace_job_profiles')
    .insert({
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

  if (profileError || !profile) {
    await supabase.storage.from('cvs').remove([path]);
    return new NextResponse(profileError?.message || 'No se pudo guardar el perfil.', { status: 400 });
  }

  void trackProductEvent({
    eventName: 'jobs.network_profile_submitted',
    source: 'api',
    metadata: {
      profile_id: String(profile.id),
      experience_years: parsedPayload.data.experience_years,
    },
  });

  return NextResponse.json({ profile_id: profile.id });
}
