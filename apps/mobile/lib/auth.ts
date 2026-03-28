import type { AppRole, AuthContext, StaffContext } from '@navaja/shared';
import type { StaffWorkspace } from '@navaja/shared';
import { supabase } from './supabase';
import { resolveActiveWorkspaceForUser } from './workspace';

export type { AppRole, AuthContext, StaffContext } from '@navaja/shared';

function guestAuthContext(): AuthContext {
  return {
    role: 'guest',
    userId: null,
    email: null,
    staffId: null,
    staffName: null,
    shopId: null,
    shopName: null,
    shopSlug: null,
    workspaces: [],
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : '';
}

function isAuthSessionMissing(error: unknown) {
  return getErrorMessage(error).toLowerCase().includes('auth session missing');
}

function isInvalidRefreshToken(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found')
  );
}

async function clearBrokenSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // If local cleanup fails, we still continue in guest mode.
  }
}

export async function getAuthContext(): Promise<AuthContext> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      if (isInvalidRefreshToken(sessionError)) {
        await clearBrokenSession();
        return guestAuthContext();
      }

      if (isAuthSessionMissing(sessionError)) {
        return guestAuthContext();
      }

      throw sessionError;
    }

    const user = session?.user || null;
    if (!user) {
      return guestAuthContext();
    }

    let workspaces: StaffWorkspace[] = [];
    let activeWorkspace: StaffWorkspace | null = null;

    try {
      const resolved = await resolveActiveWorkspaceForUser(user.id);
      workspaces = resolved.workspaces;
      activeWorkspace = resolved.activeWorkspace;
    } catch (workspaceError) {
      console.warn('No se pudo resolver el workspace activo en mobile:', workspaceError);
    }

    if (!activeWorkspace) {
      return {
        role: 'user',
        userId: user.id,
        email: user.email || null,
        staffId: null,
        staffName: null,
        shopId: null,
        shopName: null,
        shopSlug: null,
        workspaces,
      };
    }

    return {
      role: activeWorkspace.role as AppRole,
      userId: user.id,
      email: user.email || null,
      staffId: activeWorkspace.staffId,
      staffName: activeWorkspace.staffName,
      shopId: activeWorkspace.shopId,
      shopName: activeWorkspace.shopName,
      shopSlug: activeWorkspace.shopSlug,
      workspaces,
    };
  } catch (cause) {
    if (isInvalidRefreshToken(cause)) {
      await clearBrokenSession();
      return guestAuthContext();
    }

    if (isAuthSessionMissing(cause)) {
      return guestAuthContext();
    }

    console.warn('No se pudo resolver el contexto de auth en mobile:', cause);
    return guestAuthContext();
  }
}

export async function getStaffContext(): Promise<StaffContext | null> {
  const ctx = await getAuthContext();
  if (ctx.role !== 'staff' && ctx.role !== 'admin') {
    return null;
  }

  if (!ctx.shopId) {
    return null;
  }

  if (ctx.role === 'staff' && !ctx.staffId) {
    return null;
  }

  return {
    staffId: ctx.staffId,
    name: ctx.staffName || 'Staff',
    role: ctx.role,
    shopId: ctx.shopId,
    shopName: ctx.shopName || 'Barberia',
    shopSlug: ctx.shopSlug || null,
  };
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      return null;
    }

    return session.access_token;
  } catch {
    return null;
  }
}
