/**
 * Pure workspace resolution logic shared across web and mobile.
 *
 * Given raw membership rows, staff rows, and shop rows from Supabase,
 * builds a consolidated list of workspaces a user can access with their
 * highest-priority role in each shop.
 *
 * Platform-specific concerns (storage of active workspace, Supabase client)
 * remain in each app — this module only handles the pure computation.
 */

export type WorkspaceAccessRole = 'owner' | 'admin' | 'staff';
export type WorkspaceRole = 'admin' | 'staff';

export interface WorkspaceMembershipRow {
  shop_id: string | null;
  role: WorkspaceAccessRole | null;
}

export interface WorkspaceStaffRow {
  id: string;
  shop_id: string;
  name: string | null;
  role: WorkspaceRole | null;
  created_at: string | null;
}

export interface WorkspaceShopRow {
  id: string;
  name: string | null;
  slug: string | null;
}

export interface StaffWorkspace {
  staffId: string | null;
  staffName: string;
  role: WorkspaceRole;
  shopId: string;
  shopName: string;
  shopSlug: string | null;
}

interface MutableWorkspace {
  accessRole: WorkspaceAccessRole;
  staffId: string | null;
  staffName: string;
  shopId: string;
  shopName: string;
  shopSlug: string | null;
}

function getRolePriority(role: WorkspaceAccessRole) {
  if (role === 'owner') {
    return 3;
  }

  if (role === 'admin') {
    return 2;
  }

  return 1;
}

function toWorkspaceAccessRole(value: unknown): WorkspaceAccessRole | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'owner' || normalized === 'admin' || normalized === 'staff') {
    return normalized;
  }

  return null;
}

function normalizeRole(role: WorkspaceAccessRole): WorkspaceRole {
  return role === 'staff' ? 'staff' : 'admin';
}

function getDefaultWorkspaceActorLabel(role: WorkspaceAccessRole) {
  if (role === 'owner') {
    return 'Owner';
  }

  if (role === 'admin') {
    return 'Admin';
  }

  return 'Staff';
}

function mergeWorkspaceAccess(
  current: MutableWorkspace | undefined,
  next: Pick<MutableWorkspace, 'accessRole' | 'staffId' | 'staffName'>,
) {
  if (!current) {
    return next;
  }

  const currentPriority = getRolePriority(current.accessRole);
  const nextPriority = getRolePriority(next.accessRole);
  const mergedStaffId = next.staffId || current.staffId;
  const mergedStaffName = next.staffId ? next.staffName : current.staffName || next.staffName;

  if (nextPriority > currentPriority) {
    return {
      accessRole: next.accessRole,
      staffId: mergedStaffId,
      staffName: mergedStaffName,
    };
  }

  return {
    accessRole: current.accessRole,
    staffId: mergedStaffId,
    staffName: mergedStaffName,
  };
}

export function buildAccessibleWorkspaces(options: {
  memberships: WorkspaceMembershipRow[];
  staffRows: WorkspaceStaffRow[];
  shops: WorkspaceShopRow[];
}): StaffWorkspace[] {
  const shopsById = new Map(
    (options.shops || []).map((item) => [
      String(item.id),
      {
        name: String(item.name || 'Barberia'),
        slug: item.slug ? String(item.slug) : null,
      },
    ]),
  );
  const workspaceMap = new Map<string, MutableWorkspace>();

  for (const membership of options.memberships || []) {
    const shopId = String(membership.shop_id || '').trim();
    const shop = shopsById.get(shopId);
    const accessRole = toWorkspaceAccessRole(membership.role);
    if (!shopId || !shop || !accessRole) {
      continue;
    }

    const existing = workspaceMap.get(shopId);
    const merged = mergeWorkspaceAccess(existing, {
      accessRole,
      staffId: existing?.staffId || null,
      staffName: existing?.staffName || getDefaultWorkspaceActorLabel(accessRole),
    });

    workspaceMap.set(shopId, {
      accessRole: merged.accessRole,
      staffId: merged.staffId,
      staffName: merged.staffName,
      shopId,
      shopName: shop.name,
      shopSlug: shop.slug,
    });
  }

  for (const staffRow of options.staffRows || []) {
    const shopId = String(staffRow.shop_id || '').trim();
    const shop = shopsById.get(shopId);
    const accessRole = toWorkspaceAccessRole(staffRow.role);
    if (!shopId || !shop || !accessRole) {
      continue;
    }

    const existing = workspaceMap.get(shopId);
    const merged = mergeWorkspaceAccess(existing, {
      accessRole,
      staffId: staffRow.id ? String(staffRow.id) : null,
      staffName: String(staffRow.name || 'Staff'),
    });

    workspaceMap.set(shopId, {
      accessRole: merged.accessRole,
      staffId: merged.staffId,
      staffName: merged.staffName,
      shopId,
      shopName: shop.name,
      shopSlug: shop.slug,
    });
  }

  return [...workspaceMap.values()]
    .sort((left, right) => {
      const priorityDiff = getRolePriority(right.accessRole) - getRolePriority(left.accessRole);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return left.shopName.localeCompare(right.shopName, 'es');
    })
    .map((workspace) => ({
      staffId: workspace.staffId,
      staffName: workspace.staffName,
      role: normalizeRole(workspace.accessRole),
      shopId: workspace.shopId,
      shopName: workspace.shopName,
      shopSlug: workspace.shopSlug,
    }));
}
