import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env.server';

export function createSupabaseAdminClient() {
  return createClient(serverEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

