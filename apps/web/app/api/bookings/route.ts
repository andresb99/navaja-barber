import { NextResponse, type NextRequest } from 'next/server';
import { bookingInputSchema } from '@navaja/shared';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

  if (parsed.data.shop_id !== SHOP_ID) {
    return new NextResponse('Shop invalido.', { status: 400 });
  }

  const sessionSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();

  const resolvedCustomerEmail = parsed.data.customer_email?.trim() || user?.email || null;

  const supabase = createSupabaseAdminClient();

  const [{ data: service }, { data: staffMember }] = await Promise.all([
    supabase
      .from('services')
      .select('id')
      .eq('id', parsed.data.service_id)
      .eq('shop_id', SHOP_ID)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('staff')
      .select('id')
      .eq('id', parsed.data.staff_id)
      .eq('shop_id', SHOP_ID)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (!service) {
    return new NextResponse('El servicio seleccionado no esta disponible.', { status: 400 });
  }

  if (!staffMember) {
    return new NextResponse('El barbero seleccionado no esta disponible.', { status: 400 });
  }

  const { data: existingCustomer, error: existingCustomerError } = await supabase
    .from('customers')
    .select('id')
    .eq('shop_id', SHOP_ID)
    .eq('phone', parsed.data.customer_phone)
    .maybeSingle();

  if (existingCustomerError) {
    return new NextResponse(existingCustomerError.message || 'No se pudo validar el cliente.', { status: 400 });
  }

  let customerId = existingCustomer?.id as string | undefined;

  if (customerId) {
    const customerUpdatePayload: {
      name: string;
      email?: string | null;
    } = {
      name: parsed.data.customer_name,
    };

    if (resolvedCustomerEmail) {
      customerUpdatePayload.email = resolvedCustomerEmail;
    }

    const { error: customerUpdateError } = await supabase
      .from('customers')
      .update(customerUpdatePayload)
      .eq('id', customerId);

    if (customerUpdateError) {
      return new NextResponse(customerUpdateError.message || 'No se pudo actualizar el cliente.', { status: 400 });
    }
  } else {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        shop_id: parsed.data.shop_id,
        name: parsed.data.customer_name,
        phone: parsed.data.customer_phone,
        email: resolvedCustomerEmail,
      })
      .select('id')
      .single();

    if (customerError || !customer) {
      return new NextResponse(customerError?.message || 'No se pudo crear el cliente.', { status: 400 });
    }

    customerId = customer.id as string;
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert({
      shop_id: parsed.data.shop_id,
      staff_id: parsed.data.staff_id,
      customer_id: customerId,
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

