import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from './env';
import { supabase } from './supabase';

const ACTIVE_WORKSPACE_KEY_PREFIX = '@navaja/active-workspace';

type StaffRole = 'admin' | 'staff';

interface StaffWorkspaceRow {
  id: string;
  shop_id: string;
  name: string | null;
  role: StaffRole | null;
  created_at: string | null;
}

interface ShopWorkspaceRow {
  id: string;
  name: string | null;
  slug: string | null;
}

export interface StaffWorkspace {
  staffId: string;
  staffName: string;
  role: StaffRole;
  shopId: string;
  shopName: string;
  shopSlug: string | null;
}

function storageKey(userId: string) {
  return `${ACTIVE_WORKSPACE_KEY_PREFIX}:${userId}`;
}

function normalizeRole(value: unknown): StaffRole {
  return String(value || '').trim().toLowerCase() === 'admin' ? 'admin' : 'staff';
}

async function getSavedActiveWorkspaceStaffId(userId: string) {
  if (!userId) {
    return '';
  }

  return (await AsyncStorage.getItem(storageKey(userId))) || '';
}

async function clearSavedActiveWorkspaceStaffId(userId: string) {
  if (!userId) {
    return;
  }

  await AsyncStorage.removeItem(storageKey(userId));
}

export async function saveActiveWorkspaceStaffId(userId: string, staffId: string) {
  if (!userId || !staffId) {
    await clearSavedActiveWorkspaceStaffId(userId);
    return;
  }

  await AsyncStorage.setItem(storageKey(userId), staffId);
}

export async function listStaffWorkspacesForUser(userId: string): Promise<StaffWorkspace[]> {
  if (!userId) {
    return [];
  }

  const { data: staffRows, error: staffError } = await supabase
    .from('staff')
    .select('id, shop_id, name, role, created_at')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (staffError || !staffRows?.length) {
    return [];
  }

  const shopIds = [...new Set((staffRows as StaffWorkspaceRow[]).map((item) => String(item.shop_id || '')))]
    .filter(Boolean);

  const { data: shopRows } = shopIds.length
    ? await supabase
        .from('shops')
        .select('id, name, slug')
        .in('id', shopIds)
    : { data: [] as ShopWorkspaceRow[] };

  const shopsById = new Map(
    ((shopRows || []) as ShopWorkspaceRow[]).map((item) => [
      String(item.id),
      {
        name: String(item.name || 'Barberia'),
        slug: item.slug ? String(item.slug) : null,
      },
    ]),
  );

  const workspaces = (staffRows as StaffWorkspaceRow[])
    .map((item) => {
      const shopId = String(item.shop_id || '').trim();
      const shop = shopsById.get(shopId);
      if (!shopId || !shop) {
        return null;
      }

      return {
        staffId: String(item.id),
        staffName: String(item.name || 'Staff'),
        role: normalizeRole(item.role),
        shopId,
        shopName: shop.name,
        shopSlug: shop.slug,
      } satisfies StaffWorkspace;
    })
    .filter((item): item is StaffWorkspace => Boolean(item))
    .sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === 'admin' ? -1 : 1;
      }
      return left.shopName.localeCompare(right.shopName, 'es');
    });

  return workspaces;
}

export async function resolveActiveWorkspaceForUser(userId: string): Promise<{
  activeWorkspace: StaffWorkspace | null;
  workspaces: StaffWorkspace[];
}> {
  const workspaces = await listStaffWorkspacesForUser(userId);
  if (!workspaces.length) {
    await clearSavedActiveWorkspaceStaffId(userId);
    return {
      activeWorkspace: null,
      workspaces,
    };
  }

  const savedStaffId = await getSavedActiveWorkspaceStaffId(userId);
  const bySaved = workspaces.find((item) => item.staffId === savedStaffId) || null;
  if (bySaved) {
    return {
      activeWorkspace: bySaved,
      workspaces,
    };
  }

  const byEnvShopId = env.EXPO_PUBLIC_SHOP_ID
    ? workspaces.find((item) => item.shopId === env.EXPO_PUBLIC_SHOP_ID) || null
    : null;
  const fallback =
    byEnvShopId ||
    workspaces.find((item) => item.role === 'admin') ||
    workspaces[0] ||
    null;

  if (fallback) {
    await saveActiveWorkspaceStaffId(userId, fallback.staffId);
  }

  return {
    activeWorkspace: fallback,
    workspaces,
  };
}
