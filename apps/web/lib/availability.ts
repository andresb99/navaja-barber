import { generateAvailabilitySlots } from '@navaja/shared';
import { createSupabaseAdminClient } from './supabase/admin';

interface AvailabilityParams {
  shopId: string;
  serviceId: string;
  date: string;
  staffId?: string;
}

export interface StaffSlot {
  staff_id: string;
  staff_name: string;
  start_at: string;
  end_at: string;
}

export async function getAvailabilityForDate(params: AvailabilityParams): Promise<StaffSlot[]> {
  const { shopId, serviceId, date, staffId } = params;
  const supabase = createSupabaseAdminClient();

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, duration_minutes')
    .eq('shop_id', shopId)
    .eq('id', serviceId)
    .eq('is_active', true)
    .single();

  if (serviceError || !service) {
    return [];
  }

  let staffQuery = supabase
    .from('staff')
    .select('id, name')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .order('name');

  if (staffId) {
    staffQuery = staffQuery.eq('id', staffId);
  }

  const { data: staffRows, error: staffError } = await staffQuery;
  if (staffError || !staffRows?.length) {
    return [];
  }

  const staffIds = staffRows.map((item) => item.id as string);
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;
  const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();

  const [{ data: workingHours }, { data: appointments }, { data: timeOff }] = await Promise.all([
    supabase
      .from('working_hours')
      .select('staff_id, day_of_week, start_time, end_time')
      .eq('shop_id', shopId)
      .in('staff_id', staffIds)
      .eq('day_of_week', dayOfWeek),
    supabase
      .from('appointments')
      .select('staff_id, start_at, end_at, status')
      .eq('shop_id', shopId)
      .in('staff_id', staffIds)
      .lt('start_at', dayEnd)
      .gt('end_at', dayStart),
    supabase
      .from('time_off')
      .select('staff_id, start_at, end_at')
      .eq('shop_id', shopId)
      .in('staff_id', staffIds)
      .lt('start_at', dayEnd)
      .gt('end_at', dayStart),
  ]);

  const slots: StaffSlot[] = [];

  for (const staff of staffRows) {
    const scopedWorkingHours = (workingHours || []).filter((item) => item.staff_id === staff.id);
    const scopedAppointments = (appointments || []).filter((item) => item.staff_id === staff.id);
    const scopedTimeOff = (timeOff || []).filter((item) => item.staff_id === staff.id);

    const generated = generateAvailabilitySlots({
      date,
      serviceDurationMinutes: service.duration_minutes as number,
      slotMinutes: 15,
      workingHours: scopedWorkingHours.map((item) => ({
        day_of_week: item.day_of_week as number,
        start_time: item.start_time as string,
        end_time: item.end_time as string,
      })),
      appointments: scopedAppointments.map((item) => ({
        start_at: item.start_at as string,
        end_at: item.end_at as string,
        status: item.status as string,
      })),
      timeOff: scopedTimeOff.map((item) => ({
        start_at: item.start_at as string,
        end_at: item.end_at as string,
      })),
    });

    generated.forEach((slot) => {
      slots.push({
        staff_id: staff.id as string,
        staff_name: staff.name as string,
        start_at: slot.start_at,
        end_at: slot.end_at,
      });
    });
  }

  return slots.sort((a, b) => (a.start_at < b.start_at ? -1 : 1));
}

