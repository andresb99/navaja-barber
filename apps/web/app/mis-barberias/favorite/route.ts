import { NextRequest, NextResponse } from 'next/server';
import { getAccessibleWorkspacesForCurrentUser } from '@/lib/workspaces';
import {
  WORKSPACE_COOKIE_MAX_AGE_SECONDS,
  WORKSPACE_FAVORITE_COOKIE_NAME,
} from '@/lib/workspace-cookie';
import { readSanitizedJsonBody, sanitizeText } from '@/lib/sanitize';

interface FavoriteWorkspacePayload {
  shopId?: string;
  isFavorite?: boolean;
}

function parseShopId(payload: FavoriteWorkspacePayload | null | undefined) {
  return sanitizeText(payload?.shopId) || '';
}

export async function POST(request: NextRequest) {
  const payload = (await readSanitizedJsonBody(request)) as FavoriteWorkspacePayload | null;

  const shopId = parseShopId(payload);
  if (!shopId) {
    return NextResponse.json({ error: 'missing_shop_id' }, { status: 400 });
  }

  const catalog = await getAccessibleWorkspacesForCurrentUser();
  if (!catalog) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspace = catalog.workspaces.find((item) => item.shopId === shopId);
  if (!workspace) {
    return NextResponse.json({ error: 'workspace_not_found' }, { status: 404 });
  }

  const currentFavorite = sanitizeText(request.cookies.get(WORKSPACE_FAVORITE_COOKIE_NAME)?.value) || '';
  const requestedFavoriteState =
    typeof payload?.isFavorite === 'boolean' ? payload.isFavorite : null;
  const nextFavorite =
    requestedFavoriteState === null
      ? currentFavorite === shopId
        ? null
        : shopId
      : requestedFavoriteState
        ? shopId
        : null;
  const response = NextResponse.json({
    favoriteShopId: nextFavorite,
  });

  if (nextFavorite) {
    response.cookies.set(WORKSPACE_FAVORITE_COOKIE_NAME, nextFavorite, {
      path: '/',
      sameSite: 'lax',
      maxAge: WORKSPACE_COOKIE_MAX_AGE_SECONDS,
    });
  } else {
    response.cookies.set(WORKSPACE_FAVORITE_COOKIE_NAME, '', {
      path: '/',
      sameSite: 'lax',
      maxAge: 0,
    });
  }

  return response;
}
