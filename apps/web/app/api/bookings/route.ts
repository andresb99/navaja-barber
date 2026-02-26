import { NextResponse, type NextRequest } from 'next/server';
import { bookingInputSchema } from '@navaja/shared';
import { createSupabasePublicClient } from '@/lib/supabase/public';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = bookingInputSchema.safeParse(body);

  if (!parsed.success) {
    return new NextResponse(parsed.error.flatten().formErrors.join(', ') || 'Datos de reserva invalidos.', {
      status: 400,
    });
  }

  if (!parsed.data.staff_id) {
    return new NextResponse('Selecciona un horario valido con barbero asignado.', { status: 400 });
  }

  const supabase = createSupabasePublicClient();

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      shop_id: parsed.data.shop_id,
      name: parsed.data.customer_name,
      phone: parsed.data.customer_phone,
      email: parsed.data.customer_email || null,
    })
    .select('id')
    .single();

  if (customerError || !customer) {
    return new NextResponse(customerError?.message || 'No se pudo crear el cliente.', { status: 400 });
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert({
      shop_id: parsed.data.shop_id,
      staff_id: parsed.data.staff_id,
      customer_id: customer.id,
      service_id: parsed.data.service_id,
      start_at: parsed.data.start_at,
      status: 'pending',
      notes: parsed.data.notes || null,
    })
    .select('id, start_at')
    .single();

  if (appointmentError || !appointment) {
    return new NextResponse(appointmentError?.message || 'No se pudo crear la cita.', { status: 400 });
  }

  return NextResponse.json({
    appointment_id: appointment.id,
    start_at: appointment.start_at,
  });
}

