import { supabase } from './supabase';
import { env } from './env';

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

export async function getAuthContext(): Promise<AuthContext> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return {
        role: 'guest',
        userId: null,
        email: null,
        staffId: null,
        staffName: null,
      };
    }

    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name, role')
      .eq('shop_id', env.EXPO_PUBLIC_SHOP_ID)
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (staffError) {
      throw staffError;
    }

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
    console.warn('No se pudo resolver el contexto de auth en mobile:', cause);
    return {
      role: 'guest',
      userId: null,
      email: null,
      staffId: null,
      staffName: null,
    };
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

