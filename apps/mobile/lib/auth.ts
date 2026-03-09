import { supabase } from './supabase';

export type AppRole = 'guest' | 'user' | 'staff' | 'admin';

export interface AuthContext {
  role: AppRole;
  userId: string | null;
  email: string | null;
  staffId: string | null;
  staffName: string | null;
}

export interface StaffContext {
  staffId: string;
  name: string;
  role: 'admin' | 'staff';
}

function guestAuthContext(): AuthContext {
  return {
    role: 'guest',
    userId: null,
    email: null,
    staffId: null,
    staffName: null,
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

    const { data: staffRows, error: staffError } = await supabase
      .from('staff')
      .select('id, name, role')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (staffError) {
      throw staffError;
    }

    const staff =
      (staffRows || []).find((item) => String((item as { role?: string } | null)?.role) === 'admin') ||
      (staffRows || [])[0] ||
      null;

    if (!staff) {
      return {
        role: 'user',
        userId: user.id,
        email: user.email || null,
        staffId: null,
        staffName: null,
      };
    }

    return {
      role: ((staff.role as 'admin' | 'staff') || 'staff') as AppRole,
      userId: user.id,
      email: user.email || null,
      staffId: String(staff.id),
      staffName: String(staff.name),
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

  return {
    staffId: ctx.staffId as string,
    name: ctx.staffName || 'Staff',
    role: ctx.role,
  };
}
