import { NextResponse, type NextRequest } from 'next/server';
import { modelRegistrationInputSchema } from '@navaja/shared';
import { trackProductEvent } from '@/lib/product-analytics';
import { readSanitizedJsonBody } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type ResolvedSessionContext = {
  sessionId: string | null;
  shopId: string | null;
};

async function resolveRegistrationContext(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: { shop_id?: string | undefined; session_id?: string | undefined },
): Promise<ResolvedSessionContext | null> {
  if (input.session_id) {
    const { data: session } = await supabase
      .from('course_sessions')
      .select('id, course_id, status')
      .eq('id', input.session_id)
      .eq('status', 'scheduled')
      .maybeSingle();

    if (!session) {
      return null;
    }

    const { data: course } = await supabase
      .from('courses')
      .select('id, shop_id, is_active')
      .eq('id', session.course_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!course) {
      return null;
    }

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('id', course.shop_id)
      .eq('status', 'active')
      .maybeSingle();

    if (!shop) {
      return null;
    }

    return {
      sessionId: String(session.id),
      shopId: String(shop.id),
    };
  }

  if (input.shop_id) {
    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('id', input.shop_id)
      .eq('status', 'active')
      .maybeSingle();

    if (!shop) {
      return null;
    }

    return {
      sessionId: null,
      shopId: String(shop.id),
    };
  }

  return {
    sessionId: null,
    shopId: null,
  };
}

async function findExistingMarketplaceModel(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  email: string | null | undefined,
  phone: string,
) {
  if (email) {
    const { data } = await supabase
      .from('marketplace_models')
      .select('id')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.id) {
      return String(data.id);
    }
  }

  const { data } = await supabase
    .from('marketplace_models')
    .select('id')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ? String(data.id) : null;
}

async function findExistingTenantModel(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  shopId: string,
  email: string | null | undefined,
  phone: string,
) {
  if (email) {
    const { data } = await supabase
      .from('models')
      .select('id')
      .eq('shop_id', shopId)
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.id) {
      return String(data.id);
    }
  }

  const { data } = await supabase
    .from('models')
    .select('id')
    .eq('shop_id', shopId)
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ? String(data.id) : null;
}

export async function POST(request: NextRequest) {
  const body = await readSanitizedJsonBody(request);
  const parsed = modelRegistrationInputSchema.safeParse(body);

  if (!parsed.success) {
    return new NextResponse('Datos invalidos para el registro.', { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const context = await resolveRegistrationContext(supabase, parsed.data);

  if (!context) {
    return new NextResponse('La barberia o la sesion seleccionada no esta disponible.', { status: 400 });
  }

  const attributes = {
    preferences: parsed.data.preferences,
    consent_photos_videos: parsed.data.consent_photos_videos,
  };

  const marketplaceModelPayload = {
    full_name: parsed.data.full_name,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    instagram: parsed.data.instagram || null,
    attributes,
    marketing_opt_in: parsed.data.marketing_opt_in,
  };

  const existingMarketplaceModelId = await findExistingMarketplaceModel(
    supabase,
    parsed.data.email,
    parsed.data.phone,
  );

  let marketplaceModelId: string | null = null;
  if (existingMarketplaceModelId) {
    const { data: updatedMarketplaceModel, error: marketplaceUpdateError } = await supabase
      .from('marketplace_models')
      .update(marketplaceModelPayload)
      .eq('id', existingMarketplaceModelId)
      .select('id')
      .single();

    if (marketplaceUpdateError || !updatedMarketplaceModel) {
      return new NextResponse(
        marketplaceUpdateError?.message || 'No se pudo actualizar el perfil global de modelo.',
        { status: 400 },
      );
    }

    marketplaceModelId = String(updatedMarketplaceModel.id);
  } else {
    const { data: createdMarketplaceModel, error: marketplaceCreateError } = await supabase
      .from('marketplace_models')
      .insert(marketplaceModelPayload)
      .select('id')
      .single();

    if (marketplaceCreateError || !createdMarketplaceModel) {
      return new NextResponse(
        marketplaceCreateError?.message || 'No se pudo registrar el perfil global de modelo.',
        { status: 400 },
      );
    }

    marketplaceModelId = String(createdMarketplaceModel.id);
  }

  let tenantModelId: string | null = null;
  if (context.shopId) {
    const tenantModelPayload = {
      shop_id: context.shopId,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      instagram: parsed.data.instagram || null,
      attributes,
      marketing_opt_in: parsed.data.marketing_opt_in,
    };

    const existingTenantModelId = await findExistingTenantModel(
      supabase,
      context.shopId,
      parsed.data.email,
      parsed.data.phone,
    );

    if (existingTenantModelId) {
      const { data: updatedTenantModel, error: tenantUpdateError } = await supabase
        .from('models')
        .update(tenantModelPayload)
        .eq('id', existingTenantModelId)
        .select('id')
        .single();

      if (tenantUpdateError || !updatedTenantModel) {
        return new NextResponse(
          tenantUpdateError?.message || 'No se pudo actualizar el perfil del tenant.',
          { status: 400 },
        );
      }

      tenantModelId = String(updatedTenantModel.id);
    } else {
      const { data: createdTenantModel, error: tenantCreateError } = await supabase
        .from('models')
        .insert(tenantModelPayload)
        .select('id')
        .single();

      if (tenantCreateError || !createdTenantModel) {
        return new NextResponse(
          tenantCreateError?.message || 'No se pudo registrar el perfil del tenant.',
          { status: 400 },
        );
      }

      tenantModelId = String(createdTenantModel.id);
    }
  }

  let applicationId: string | null = null;
  if (context.sessionId && tenantModelId) {
    const { data: existingApplication } = await supabase
      .from('model_applications')
      .select('id')
      .eq('session_id', context.sessionId)
      .eq('model_id', tenantModelId)
      .maybeSingle();

    if (existingApplication?.id) {
      applicationId = String(existingApplication.id);
    } else {
      const { data: application, error: applicationError } = await supabase
        .from('model_applications')
        .insert({
          session_id: context.sessionId,
          model_id: tenantModelId,
          status: 'applied',
        })
        .select('id')
        .single();

      if (applicationError || !application) {
        return new NextResponse(
          applicationError?.message || 'El perfil se guardo, pero no se pudo enviar la postulacion.',
          { status: 400 },
        );
      }

      applicationId = String(application.id);
    }

    if (parsed.data.consent_photos_videos) {
      await supabase.from('waivers').upsert(
        {
          session_id: context.sessionId,
          model_id: tenantModelId,
          waiver_version: 'v1',
          accepted_name: parsed.data.full_name,
        },
        { onConflict: 'session_id,model_id' },
      );
    }
  }

  void trackProductEvent({
    eventName: 'models.registration_submitted',
    shopId: context.shopId,
    source: 'api',
    metadata: {
      session_id: context.sessionId,
      marketplace_model_id: marketplaceModelId,
      model_id: tenantModelId,
      application_id: applicationId,
      marketing_opt_in: parsed.data.marketing_opt_in,
    },
  });

  return NextResponse.json({
    marketplace_model_id: marketplaceModelId,
    model_id: tenantModelId,
    application_id: applicationId,
  });
}
