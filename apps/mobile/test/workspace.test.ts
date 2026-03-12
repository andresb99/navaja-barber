import { describe, expect, it } from 'vitest';
import { buildAccessibleWorkspaces } from '../lib/workspace-catalog';

describe('mobile workspace catalog', () => {
  it('keeps membership-only admin access visible in mobile', () => {
    const workspaces = buildAccessibleWorkspaces({
      memberships: [{ shop_id: 'shop-owner', role: 'owner' }],
      staffRows: [],
      shops: [{ id: 'shop-owner', name: 'Owner Shop', slug: 'owner-shop' }],
    });

    expect(workspaces).toEqual([
      {
        staffId: null,
        staffName: 'Owner',
        role: 'admin',
        shopId: 'shop-owner',
        shopName: 'Owner Shop',
        shopSlug: 'owner-shop',
      },
    ]);
  });

  it('merges staff identity into the same workspace when membership and staff rows coexist', () => {
    const workspaces = buildAccessibleWorkspaces({
      memberships: [{ shop_id: 'shop-admin', role: 'admin' }],
      staffRows: [
        {
          id: 'staff-1',
          shop_id: 'shop-admin',
          name: 'Andrea',
          role: 'admin',
          created_at: '2026-03-11T00:00:00.000Z',
        },
      ],
      shops: [{ id: 'shop-admin', name: 'Admin Shop', slug: 'admin-shop' }],
    });

    expect(workspaces).toEqual([
      {
        staffId: 'staff-1',
        staffName: 'Andrea',
        role: 'admin',
        shopId: 'shop-admin',
        shopName: 'Admin Shop',
        shopSlug: 'admin-shop',
      },
    ]);
  });
});
