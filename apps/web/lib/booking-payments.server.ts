import 'server-only';

import { bookingInputSchema, type AppointmentSourceChannel } from '@navaja/shared';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function normalizeEmail(value: string | null | undefined) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return normalized || null;
}

function isMissingPaymentIntentColumnError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || '')
    .trim()
    .toLowerCase();

  return (
    message.includes('payment_intent_id') &&
    message.includes('appointments') &&
    (message.includes('schema cache') || message.includes('column'))
  );
}

function isMissingSourceChannelColumnError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || '')
    .trim()
    .toLowerCase();

  return (
    message.includes('source_channel') &&
    message.includes('appointments') &&
    (message.includes('schema cache') || message.includes('column'))
  );
}

function appendSourceChannelToNotes(
  currentNotes: string | null | undefined,
  sourceChannel: AppointmentSourceChannel,
) {
  const base = String(currentNotes || '').trim();
  const sourceLabel = `Canal: ${sourceChannel}`;
  if (!base) {
    return sourceLabel;
  }

  if (base.toLowerCase().includes(sourceLabel.toLowerCase())) {
    return base;
  }

  return `${base}\n${sourceLabel}`;
}

export interface BookingIntentPayload {
  shop_id: string;
  service_id: string;
  staff_id: string;
  start_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
}

export interface CreatedAppointmentResult {
  appointmentId: string;
  startAt: string;
  customerId: string;
}

function isMissingCustomerAuthLinksTableError(error: unknown) {
  const maybeError = error as { code?: string; message?: string } | null;
  const code = String(maybeError?.code || '').toUpperCase();
  const message = String(maybeError?.message || '').toLowerCase();

  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    (message.includes('customer_auth_links') &&
      (message.includes('does not exist') || message.includes('schema cache') || message.includes('not found')))
  );
}

async function upsertCustomerAuthLink(options: {
  customerId: string;
  userId: string;
  source: 'authenticated_booking' | 'authenticated_payment';
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('customer_auth_links').upsert(
    {
      customer_id: options.customerId,
      user_id: options.userId,
      source: options.source,
      verified_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'customer_id,user_id' },
  );

  if (error && !isMissingCustomerAuthLinksTableError(error)) {
    throw new Error(error.message || 'No se pudo vincular la cuenta del cliente.');
  }
}

export async function createAppointmentFromBookingIntent(
  payload: BookingIntentPayload,
  options?: {
    paymentIntentId?: string | null;
    sourceChannel?: AppointmentSourceChannel;
    customerAuthUserId?: string | null;
    customerAuthUserEmail?: string | null;
  },
): Promise<CreatedAppointmentResult> {
  const parsed = bookingInputSchema.safeParse({
    ...payload,
    staff_id: payload.staff_id,
  });

  if (!parsed.success || !parsed.data.staff_id) {
    throw new Error('Payload de reserva invalido para generar la cita.');
  }

  const normalizedPaymentIntentId = String(options?.paymentIntentId || '').trim() || null;
  const sourceChannel = options?.sourceChannel || 'WEB';
  const customerAuthUserId = String(options?.customerAuthUserId || '').trim() || null;
  const customerAuthUserEmail = normalizeEmail(options?.customerAuthUserEmail);
  const resolvedCustomerEmail = normalizeEmail(payload.customer_email);
  const supabase = createSupabaseAdminClient();
  let canUsePaymentIntentColumn = true;
  let canUseSourceChannelColumn = true;

  if (normalizedPaymentIntentId) {
    const { data: existingAppointment, error: existingAppointmentError } = await supabase
      .from('appointments')
      .select('id, start_at, customer_id')
      .eq('payment_intent_id', normalizedPaymentIntentId)
      .maybeSingle();

    if (existingAppointmentError) {
      if (isMissingPaymentIntentColumnError(existingAppointmentError)) {
        canUsePaymentIntentColumn = false;
      } else {
        throw new Error(existingAppointmentError.message || 'No se pudo validar la cita existente.');
      }
    }

    if (existingAppointment?.id) {
      const existingCustomerId = String((existingAppointment as { customer_id?: string | null })?.customer_id || '').trim();
      if (
        existingCustomerId &&
        customerAuthUserId &&
        resolvedCustomerEmail &&
        customerAuthUserEmail &&
        resolvedCustomerEmail === customerAuthUserEmail
      ) {
        await upsertCustomerAuthLink({
          customerId: existingCustomerId,
          userId: customerAuthUserId,
          source: normalizedPaymentIntentId ? 'authenticated_payment' : 'authenticated_booking',
        });
      }

      return {
        appointmentId: String(existingAppointment.id),
        startAt: String(existingAppointment.start_at),
        customerId: existingCustomerId,
      };
    }
  }

  const [{ data: shop }, { data: service }, { data: staffMember }] = await Promise.all([
    supabase
      .from('shops')
      .select('id, status')
      .eq('id', payload.shop_id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('services')
      .select('id')
      .eq('id', payload.service_id)
      .eq('shop_id', payload.shop_id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('staff')
      .select('id')
      .eq('id', payload.staff_id)
      .eq('shop_id', payload.shop_id)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (!shop) {
    throw new Error('La barbershop seleccionada no esta disponible.');
  }

  if (!service) {
    throw new Error('El servicio seleccionado no esta disponible.');
  }

  if (!staffMember) {
    throw new Error('El barbero seleccionado no esta disponible.');
  }

  const { data: existingCustomer, error: existingCustomerError } = await supabase
    .from('customers')
    .select('id')
    .eq('shop_id', payload.shop_id)
    .eq('phone', payload.customer_phone)
    .maybeSingle();

  if (existingCustomerError) {
    throw new Error(existingCustomerError.message || 'No se pudo validar el cliente.');
  }

  let customerId = existingCustomer?.id as string | undefined;

  if (customerId) {
    const customerUpdatePayload: {
      name: string;
      email?: string | null;
    } = {
      name: payload.customer_name,
    };

    if (resolvedCustomerEmail) {
      customerUpdatePayload.email = resolvedCustomerEmail;
    }

    const { error: customerUpdateError } = await supabase
      .from('customers')
      .update(customerUpdatePayload)
      .eq('id', customerId)
      .eq('shop_id', payload.shop_id);

    if (customerUpdateError) {
      throw new Error(customerUpdateError.message || 'No se pudo actualizar el cliente.');
    }
  } else {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        shop_id: payload.shop_id,
        name: payload.customer_name,
        phone: payload.customer_phone,
        email: resolvedCustomerEmail,
      })
      .select('id')
      .single();

    if (customerError || !customer) {
      throw new Error(customerError?.message || 'No se pudo crear el cliente.');
    }

    customerId = customer.id as string;
  }

  if (
    customerId &&
    customerAuthUserId &&
    resolvedCustomerEmail &&
    customerAuthUserEmail &&
    resolvedCustomerEmail === customerAuthUserEmail
  ) {
    await upsertCustomerAuthLink({
      customerId,
      userId: customerAuthUserId,
      source: normalizedPaymentIntentId ? 'authenticated_payment' : 'authenticated_booking',
    });
  }

  const baseInsertPayload = {
    shop_id: payload.shop_id,
    staff_id: payload.staff_id,
    customer_id: customerId,
    service_id: payload.service_id,
    start_at: payload.start_at,
    status: 'pending' as const,
    notes: payload.notes || null,
  };
  let includePaymentIntent = Boolean(normalizedPaymentIntentId && canUsePaymentIntentColumn);
  let includeSourceChannel = canUseSourceChannelColumn;
  let mirrorSourceInNotes = false;
  let appointment: { id?: string | null; start_at?: string | null } | null = null;
  let appointmentError: { message?: string } | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const insertPayload = {
      ...baseInsertPayload,
      ...(includeSourceChannel
        ? {
            source_channel: sourceChannel,
          }
        : {}),
      ...(includePaymentIntent
        ? {
            payment_intent_id: normalizedPaymentIntentId,
          }
        : {}),
      ...(mirrorSourceInNotes
        ? {
            notes: appendSourceChannelToNotes(baseInsertPayload.notes, sourceChannel),
          }
        : {}),
    };

    const insertResult = await supabase
      .from('appointments')
      .insert(insertPayload)
      .select('id, start_at')
      .single();

    appointment = insertResult.data;
    appointmentError = insertResult.error;

    if (!appointmentError) {
      break;
    }

    if (includePaymentIntent && isMissingPaymentIntentColumnError(appointmentError)) {
      includePaymentIntent = false;
      continue;
    }

    if (includeSourceChannel && isMissingSourceChannelColumnError(appointmentError)) {
      includeSourceChannel = false;
      canUseSourceChannelColumn = false;
      mirrorSourceInNotes = sourceChannel !== 'WEB';
      continue;
    }

    break;
  }

  if (appointmentError || !appointment) {
    throw new Error(appointmentError?.message || 'No se pudo crear la cita.');
  }

  return {
    appointmentId: String(appointment.id),
    startAt: String(appointment.start_at),
    customerId: String(customerId),
  };
}
