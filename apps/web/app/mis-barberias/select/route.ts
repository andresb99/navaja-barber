import { NextRequest, NextResponse } from 'next/server';
import {
  getAccessibleWorkspacesForCurrentUser,
  type WorkspaceSummary,
} from '@/lib/workspaces';
import {
  WORKSPACE_FAVORITE_COOKIE_NAME,
  WORKSPACE_COOKIE_MAX_AGE_SECONDS,
  WORKSPACE_COOKIE_NAME,
} from '@/lib/workspace-cookie';
import { getRequestOrigin } from '@/lib/request-origin';
import { sanitizeText } from '@/lib/sanitize';
import { buildTenantAdminHref, buildTenantStaffHref } from '@/lib/workspace-routes';

function resolveDestination(
  workspace: WorkspaceSummary,
  requestedTarget: string | null,
  requestOrigin: string,
) {
  if (requestedTarget === 'staff') {
    return workspace.staffId
      ? buildTenantStaffHref('/staff', workspace.shopSlug, undefined, { requestOrigin })
      : '/mis-barberias?error=Ese%20workspace%20no%20tiene%20vista%20de%20staff.';
  }

  if (requestedTarget === 'admin') {
    if (workspace.accessRole === 'staff') {
      return '/mis-barberias?error=Ese%20workspace%20solo%20tiene%20acceso%20de%20staff.';
    }

    return buildTenantAdminHref('/admin', workspace.shopSlug, undefined, { requestOrigin });
  }

  return workspace.accessRole === 'staff'
    ? buildTenantStaffHref('/staff', workspace.shopSlug, undefined, { requestOrigin })
    : buildTenantAdminHref('/admin', workspace.shopSlug, undefined, { requestOrigin });
}

function buildRedirectUrl(request: NextRequest, destination: string) {
  if (/^https?:\/\//i.test(destination)) {
    return new URL(destination);
  }

  const normalizedDestination = destination.startsWith('/') ? destination : `/${destination}`;
  const destinationUrl = new URL(normalizedDestination, 'http://localhost');
  const protocol =
    request.headers.get('x-forwarded-proto') ||
    request.nextUrl.protocol.replace(/:$/, '') ||
    'http';
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host ||
    'localhost:3000';

  return new URL(
    `${protocol}://${host}${destinationUrl.pathname}${destinationUrl.search}${destinationUrl.hash}`,
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const shopId = sanitizeText(url.searchParams.get('shop')) || '';
  const target = sanitizeText(url.searchParams.get('target'));
  const markAsFavorite = ['1', 'true', 'yes'].includes(
    sanitizeText(url.searchParams.get('favorite'), { lowercase: true }) || '',
  );
  const catalog = await getAccessibleWorkspacesForCurrentUser();

  if (!catalog) {
    return NextResponse.redirect(new URL('/login?next=/mis-barberias', request.url));
  }

  const workspace = catalog.workspaces.find((item) => item.shopId === shopId);
  if (!workspace) {
    return NextResponse.redirect(new URL('/mis-barberias?error=No%20pudimos%20seleccionar%20esa%20barberia.', request.url));
  }

  const destination = resolveDestination(workspace, target ?? null, getRequestOrigin(request));
  const response = NextResponse.redirect(buildRedirectUrl(request, destination));
  response.cookies.set(WORKSPACE_COOKIE_NAME, workspace.shopId, {
    path: '/',
    sameSite: 'lax',
    maxAge: WORKSPACE_COOKIE_MAX_AGE_SECONDS,
  });
  if (markAsFavorite) {
    response.cookies.set(WORKSPACE_FAVORITE_COOKIE_NAME, workspace.shopId, {
      path: '/',
      sameSite: 'lax',
      maxAge: WORKSPACE_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}
