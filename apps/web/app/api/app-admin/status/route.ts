import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import { hasPlatformAdminAccess } from '@/lib/platform-admin';

export async function GET(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);
  if (!user?.id) {
    return NextResponse.json({ message: 'Debes iniciar sesion.' }, { status: 401 });
  }

  const isPlatformAdmin = await hasPlatformAdminAccess(user.id);
  return NextResponse.json({ is_platform_admin: isPlatformAdmin });
}
