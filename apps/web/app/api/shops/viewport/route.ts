import { NextRequest, NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/sanitize';
import { listMarketplaceShopsInBounds } from '@/lib/shops';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const north = Number(sanitizeText(searchParams.get('north')));
  const south = Number(sanitizeText(searchParams.get('south')));
  const east = Number(sanitizeText(searchParams.get('east')));
  const west = Number(sanitizeText(searchParams.get('west')));
  const limitParam = sanitizeText(searchParams.get('limit'));
  const limit = typeof limitParam === 'string' && limitParam !== '' ? Number(limitParam) : undefined;

  if (![north, south, east, west].every((value) => Number.isFinite(value))) {
    return NextResponse.json(
      {
        message: 'Los bounds del viewport son invalidos.',
      },
      {
        status: 400,
      },
    );
  }

  const items = await listMarketplaceShopsInBounds({
    north,
    south,
    east,
    west,
    ...(Number.isFinite(limit) ? { limit: limit as number } : {}),
  });

  return NextResponse.json({
    items,
  });
}
