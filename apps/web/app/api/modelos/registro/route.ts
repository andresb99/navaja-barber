import { NextResponse, type NextRequest } from 'next/server';
import { modelRegistrationInputSchema } from '@navaja/shared';
import { createSupabasePublicClient } from '@/lib/supabase/public';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = modelRegistrationInputSchema.safeParse(body);

  if (!parsed.success) {
    return new NextResponse('Datos invalidos para el registro.', { status: 400 });
  }

  const supabase = createSupabasePublicClient();
  const attributes = {
    preferences: parsed.data.preferences,
    consent_photos_videos: parsed.data.consent_photos_videos,
  };

  const { data: model, error: modelError } = await supabase
    .from('models')
    .insert({
      shop_id: parsed.data.shop_id,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      instagram: parsed.data.instagram || null,
      attributes,
      marketing_opt_in: parsed.data.marketing_opt_in,
    })
    .select('id')
    .single();

  if (modelError || !model) {
    return new NextResponse(modelError?.message || 'No se pudo registrar el modelo.', { status: 400 });
  }

  let applicationId: string | null = null;
  if (parsed.data.session_id) {
    const { data: application, error: applicationError } = await supabase
      .from('model_applications')
      .insert({
        session_id: parsed.data.session_id,
        model_id: model.id,
        status: 'applied',
      })
      .select('id')
      .single();

    if (applicationError || !application) {
      return new NextResponse(
        applicationError?.message || 'El registro se guardo, pero no se pudo enviar la postulacion.',
        { status: 400 },
      );
    }

    applicationId = String(application.id);

    if (parsed.data.consent_photos_videos) {
      await supabase.from('waivers').upsert(
        {
          session_id: parsed.data.session_id,
          model_id: model.id,
          waiver_version: 'v1',
          accepted_name: parsed.data.full_name,
        },
        { onConflict: 'session_id,model_id' },
      );
    }
  }

  // TODO: integrar notificaciones por WhatsApp/email cuando exista modulo de notificaciones.
  return NextResponse.json({
    model_id: model.id,
    application_id: applicationId,
  });
}
