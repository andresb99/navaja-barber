import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { User } from '@supabase/supabase-js';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import { readSanitizedJsonBody, sanitizeText } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const payloadSchema = z.object({
  membership_id: z.string().uuid(),
  decision: z.enum(['accept', 'decline']),
});

function getUserDisplayName(user: User, profile: { full_name?: string | null } | null) {
  const profileName = sanitizeText(profile?.full_name) || '';
  if (profileName) {
    return profileName;
  }

  const metadata = (user.user_metadata as Record<string, unknown> | null | undefined) || null;
  const candidateKeys = ['full_name', 'name', 'display_name', 'nickname'] as const;
  for (const key of candidateKeys) {
    const value = sanitizeText(metadata?.[key]) || '';
    if (value) {
      return value;
    }
  }

  if (user.email) {
    const localPart = sanitizeText(user.email.split('@')[0]) || '';
    if (localPart) {
      return localPart;
    }
  }

  return 'Staff';
}

export async function POST(request: NextRequest) {
  const parsedPayload = payloadSchema.safeParse(await readSanitizedJsonBody(request));
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        message: 'No se pudo procesar la invitacion.',
      },
      { status: 400 },
    );
  }

  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      {
        message: 'Debes iniciar sesion para responder invitaciones.',
      },
      { status: 401 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: membership, error: membershipError } = await admin
    .from('shop_memberships')
    .select('id, shop_id, role, membership_status')
    .eq('id', parsedPayload.data.membership_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError || !membership?.id) {
    return NextResponse.json(
      {
        message: 'La invitacion ya no esta disponible.',
      },
      { status: 404 },
    );
  }

  if (String(membership.membership_status) !== 'invited') {
    return NextResponse.json({
      success: true,
      membership_status: String(membership.membership_status),
      message: 'La invitacion ya fue procesada.',
    });
  }

  if (parsedPayload.data.decision === 'decline') {
    const { error } = await admin
      .from('shop_memberships')
      .update({ membership_status: 'disabled' })
      .eq('id', membership.id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        {
          message: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      membership_status: 'disabled',
      message: 'Invitacion rechazada.',
    });
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('full_name, phone')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const resolvedName = sanitizeText(
    getUserDisplayName(user, profile as { full_name?: string | null } | null),
    { maxLength: 120 },
  ) || 'Staff';
  const resolvedPhone =
    sanitizeText((profile as { phone?: string | null } | null)?.phone, { maxLength: 40 }) ||
    'Pendiente';
  const staffRole = String(membership.role) === 'admin' ? 'admin' : 'staff';

  const { error: membershipUpdateError } = await admin
    .from('shop_memberships')
    .update({ membership_status: 'active' })
    .eq('id', membership.id)
    .eq('user_id', user.id);

  if (membershipUpdateError) {
    return NextResponse.json(
      {
        message: membershipUpdateError.message,
      },
      { status: 400 },
    );
  }

  const { data: existingStaff } = await admin
    .from('staff')
    .select('id, phone')
    .eq('shop_id', String(membership.shop_id))
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (existingStaff?.id) {
    const { error: updateError } = await admin
      .from('staff')
      .update({
        name: resolvedName,
        phone: String(existingStaff.phone || '').trim() || resolvedPhone,
        role: staffRole,
        is_active: true,
      })
      .eq('id', existingStaff.id)
      .eq('shop_id', String(membership.shop_id));

    if (updateError) {
      return NextResponse.json(
        {
          message: updateError.message,
        },
        { status: 400 },
      );
    }
  } else {
    const { error: insertError } = await admin.from('staff').insert({
      shop_id: String(membership.shop_id),
      auth_user_id: user.id,
      name: resolvedName,
      phone: resolvedPhone,
      role: staffRole,
      is_active: true,
    });

    if (insertError) {
      return NextResponse.json(
        {
          message: insertError.message,
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({
    success: true,
    membership_status: 'active',
    message: 'Invitacion aceptada.',
  });
}
