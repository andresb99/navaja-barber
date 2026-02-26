import { redirect } from 'next/navigation';
import { env } from './env';
import { createSupabaseServerClient } from './supabase/server';

export type AppRole = 'guest' | 'user' | 'staff' | 'admin';

export interface AuthContext {
  role: AppRole;
  userId: string | null;
  email: string | null;
  staffId: string | null;
}

export interface AuthStaffContext {
  userId: string;
  staffId: string;
  role: 'admin' | 'staff';
  email: string | null;
}

export async function getCurrentAuthContext(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      role: 'guest',
      userId: null,
      email: null,
      staffId: null,
    };
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('id, role')
    .eq('shop_id', env.NEXT_PUBLIC_SHOP_ID)
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (staff) {
    return {
      role: staff.role as 'admin' | 'staff',
      userId: user.id,
      email: user.email ?? null,
      staffId: String(staff.id),
    };
  }

  return {
    role: 'user',
    userId: user.id,
    email: user.email ?? null,
    staffId: null,
  };
}

export async function getCurrentStaff(): Promise<AuthStaffContext | null> {
  const ctx = await getCurrentAuthContext();

  if (ctx.role !== 'admin' && ctx.role !== 'staff') {
    return null;
  }

  return {
    userId: ctx.userId as string,
    staffId: ctx.staffId as string,
    role: ctx.role,
    email: ctx.email,
  };
}

export async function requireAuthenticated(nextPath = '/cuenta') {
  const ctx = await getCurrentAuthContext();

  if (ctx.role === 'guest') {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return ctx;
}

export async function requireAdmin() {
  const ctx = await getCurrentAuthContext();

  if (ctx.role === 'guest') {
    redirect('/login?next=/admin');
  }

  if (ctx.role !== 'admin') {
    if (ctx.role === 'staff') {
      redirect('/staff');
    }
    redirect('/cuenta');
  }

  return {
    userId: ctx.userId as string,
    staffId: ctx.staffId as string,
    role: 'admin' as const,
    email: ctx.email,
  };
}

export async function requireStaff() {
  const ctx = await getCurrentAuthContext();

  if (ctx.role === 'guest') {
    redirect('/login?next=/staff');
  }

  if (ctx.role !== 'staff' && ctx.role !== 'admin') {
    redirect('/cuenta');
  }

  return {
    userId: ctx.userId as string,
    staffId: ctx.staffId as string,
    role: ctx.role,
    email: ctx.email,
  };
}
