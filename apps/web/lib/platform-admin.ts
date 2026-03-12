import 'server-only';

import { createSupabaseAdminClient } from './supabase/admin';

export async function hasPlatformAdminAccess(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data: platformAdmin } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(platformAdmin?.user_id);
}

export async function assertPlatformAdminAccess(userId: string) {
  const allowed = await hasPlatformAdminAccess(userId);
  if (!allowed) {
    throw new Error('Acceso denegado.');
  }
}
