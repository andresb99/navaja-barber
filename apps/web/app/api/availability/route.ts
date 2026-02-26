import { NextResponse, type NextRequest } from 'next/server';
import { availabilityInputSchema } from '@navaja/shared';
import { getAvailabilityForDate } from '@/lib/availability';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const parsed = availabilityInputSchema.safeParse({
    shop_id: searchParams.get('shop_id'),
    service_id: searchParams.get('service_id'),
    staff_id: searchParams.get('staff_id') || undefined,
    date: searchParams.get('date'),
  });

  if (!parsed.success) {
    return new NextResponse(parsed.error.flatten().formErrors.join(', ') || 'Consulta de disponibilidad invalida.', {
      status: 400,
    });
  }

  const slots = await getAvailabilityForDate({
    shopId: parsed.data.shop_id,
    serviceId: parsed.data.service_id,
    date: parsed.data.date,
    ...(parsed.data.staff_id ? { staffId: parsed.data.staff_id } : {}),
  });

  return NextResponse.json({ slots });
}

