import { NextRequest, NextResponse } from 'next/server';
import { resolveSafeNextPath } from '@/lib/navigation';
import { getRequestOrigin } from '@/lib/request-origin';
import { sanitizeText } from '@/lib/sanitize';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const redirectPath = resolveSafeNextPath(
    sanitizeText(request.nextUrl.searchParams.get('next')),
    '/shops',
  );
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL(redirectPath, getRequestOrigin(request)));
}
