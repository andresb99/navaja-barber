import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function requireAdminWorkspaceAccess(input: {
  userId: string;
  shopId: string;
}) {
  const admin = createSupabaseAdminClient();
  const normalizedShopId = String(input.shopId || '').trim();

  if (!normalizedShopId) {
    throw new Error('Falta shop_id.');
  }

  const [{ data: membership, error: membershipError }, { data: staff, error: staffError }] =
    await Promise.all([
      admin
        .from('shop_memberships')
        .select('id')
        .eq('shop_id', normalizedShopId)
        .eq('user_id', input.userId)
        .in('role', ['owner', 'admin'])
        .eq('membership_status', 'active')
        .maybeSingle(),
      admin
        .from('staff')
        .select('id')
        .eq('shop_id', normalizedShopId)
        .eq('auth_user_id', input.userId)
        .eq('role', 'admin')
        .eq('is_active', true)
        .maybeSingle(),
    ]);

  if (membershipError) {
    throw new Error(membershipError.message || 'No se pudo validar tu membresia.');
  }

  if (staffError) {
    throw new Error(staffError.message || 'No se pudo validar tu acceso de staff.');
  }

  if (!membership?.id && !staff?.id) {
    throw new Error('No tienes permisos de administracion para esta barberia.');
  }

  return {
    shopId: normalizedShopId,
  };
}
