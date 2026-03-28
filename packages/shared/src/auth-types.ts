/**
 * Shared authentication and authorization types used across web and mobile apps.
 *
 * These types define the shape of auth contexts independently of the platform.
 * Each app resolves its own context (e.g., via Supabase session + AsyncStorage on mobile,
 * via cookies on web), but the resulting shape is always one of these types.
 */

import type { StaffWorkspace } from './workspace-catalog';

export type AppRole = 'guest' | 'user' | 'staff' | 'admin';

export interface AuthContext {
  role: AppRole;
  userId: string | null;
  email: string | null;
  staffId: string | null;
  staffName: string | null;
  shopId: string | null;
  shopName: string | null;
  shopSlug: string | null;
  workspaces: StaffWorkspace[];
}

export interface StaffContext {
  staffId: string | null;
  name: string;
  role: 'admin' | 'staff';
  shopId: string;
  shopName: string;
  shopSlug: string | null;
}
