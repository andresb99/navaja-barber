import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildAccessibleWorkspaces,
  type StaffWorkspace,
  type WorkspaceMembershipRow,
  type WorkspaceShopRow,
  type WorkspaceStaffRow,
} from '@navaja/shared';
import { env } from './env';
import { supabase } from './supabase';

export type {
  StaffWorkspace,
  WorkspaceMembershipRow,
  WorkspaceShopRow,
  WorkspaceStaffRow,
} from '@navaja/shared';

const ACTIVE_WORKSPACE_KEY_PREFIX = '@navaja/active-workspace';

function storageKey(userId: string) {
  return `${ACTIVE_WORKSPACE_KEY_PREFIX}:${userId}`;
}

async function getSavedActiveWorkspaceShopId(userId: string) {
  if (!userId) {
    return '';
  }

  return (await AsyncStorage.getItem(storageKey(userId))) || '';
}

async function clearSavedActiveWorkspaceShopId(userId: string) {
  if (!userId) {
    return;
  }

  await AsyncStorage.removeItem(storageKey(userId));
}

export async function saveActiveWorkspaceShopId(userId: string, shopId: string) {
  if (!userId || !shopId) {
    await clearSavedActiveWorkspaceShopId(userId);
    return;
  }

  await AsyncStorage.setItem(storageKey(userId), shopId);
}

export async function listAccessibleWorkspacesForUser(userId: string): Promise<StaffWorkspace[]> {
  if (!userId) {
    return [];
  }

  const [membershipResult, staffResult] = await Promise.all([
    supabase
      .from('shop_memberships')
      .select('shop_id, role')
      .eq('user_id', userId)
      .eq('membership_status', 'active'),
    supabase
      .from('staff')
      .select('id, shop_id, name, role, created_at')
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
  ]);

  if (membershipResult.error) {
    throw membershipResult.error;
  }

  if (staffResult.error) {
    throw staffResult.error;
  }

  const memberships = (membershipResult.data || []) as WorkspaceMembershipRow[];
  const staffRows = (staffResult.data || []) as WorkspaceStaffRow[];
  const shopIds = Array.from(
    new Set(
      [...memberships.map((item) => String(item.shop_id || '')), ...staffRows.map((item) => String(item.shop_id || ''))]
        .filter(Boolean),
    ),
  );

  if (!shopIds.length) {
    return [];
  }

  const { data: shopRows, error: shopError } = await supabase
    .from('shops')
    .select('id, name, slug')
    .in('id', shopIds);

  if (shopError) {
    throw shopError;
  }

  return buildAccessibleWorkspaces({
    memberships,
    staffRows,
    shops: (shopRows || []) as WorkspaceShopRow[],
  });
}

export async function resolveActiveWorkspaceForUser(userId: string): Promise<{
  activeWorkspace: StaffWorkspace | null;
  workspaces: StaffWorkspace[];
}> {
  const workspaces = await listAccessibleWorkspacesForUser(userId);
  if (!workspaces.length) {
    await clearSavedActiveWorkspaceShopId(userId);
    return {
      activeWorkspace: null,
      workspaces,
    };
  }

  const savedShopId = await getSavedActiveWorkspaceShopId(userId);
  const bySaved = workspaces.find((item) => item.shopId === savedShopId) || null;
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
    await saveActiveWorkspaceShopId(userId, fallback.shopId);
  }

  return {
    activeWorkspace: fallback,
    workspaces,
  };
}
