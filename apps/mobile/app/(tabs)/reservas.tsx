import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { bookingInputSchema } from '@navaja/shared';
import { ActionButton, Card, ErrorText, Field, Label, MultilineField, MutedText, Screen } from '../../components/ui/primitives';
import { env } from '../../lib/env';
import { formatCurrency, formatTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

interface ServiceOption {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
}

interface SlotOption {
  staff_id: string;
  staff_name: string;
  start_at: string;
  end_at: string;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReservasScreen() {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [serviceId, setServiceId] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [allSlots, setAllSlots] = useState<SlotOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((item) => item.id === serviceId) || null,
    [serviceId, services],
  );

  const staffChoices = useMemo(() => {
    const map = new Map<string, string>();
    allSlots.forEach((slot) => {
      map.set(slot.staff_id, slot.staff_name);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [allSlots]);

  const visibleSlots = useMemo(
    () => (staffFilter ? allSlots.filter((slot) => slot.staff_id === staffFilter) : allSlots),
    [allSlots, staffFilter],
  );

  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    const { data, error: fetchError } = await supabase
      .from('services')
      .select('id, name, price_cents, duration_minutes')
      .eq('shop_id', env.EXPO_PUBLIC_SHOP_ID)
      .eq('is_active', true)
      .order('name');

    if (fetchError) {
      setError(fetchError.message);
      setServices([]);
      setLoadingServices(false);
      return;
    }

    setServices(
      (data || []).map((item) => ({
        id: String(item.id),
        name: String(item.name),
        price_cents: Number(item.price_cents || 0),
        duration_minutes: Number(item.duration_minutes || 0),
      })),
    );
    setLoadingServices(false);
  }, []);

  const loadSlots = useCallback(async () => {
    if (!serviceId || !date) {
      setAllSlots([]);
      return;
    }

    setLoadingSlots(true);
    setError(null);

    const { data, error: slotsError } = await supabase.rpc('get_public_availability', {
      p_shop_id: env.EXPO_PUBLIC_SHOP_ID,
      p_service_id: serviceId,
      p_date: date,
      p_staff_id: null,
    });

    if (slotsError) {
      setAllSlots([]);
      setLoadingSlots(false);
      setError(slotsError.message);
      return;
    }

    setAllSlots(
      (data || []).map((item: Record<string, unknown>) => ({
        staff_id: String(item.staff_id),
        staff_name: String(item.staff_name || 'Staff'),
        start_at: String(item.start_at),
        end_at: String(item.end_at),
      })),
    );
    setSelectedSlot(null);
    setLoadingSlots(false);
  }, [date, serviceId]);

  useFocusEffect(
    useCallback(() => {
      void loadServices();
    }, [loadServices]),
  );

  useFocusEffect(
    useCallback(() => {
      void loadSlots();
    }, [loadSlots]),
  );

  async function submitBooking() {
    if (!selectedService || !selectedSlot) {
      setError('Selecciona un horario antes de confirmar.');
      return;
    }

    const parsed = bookingInputSchema.safeParse({
      shop_id: env.EXPO_PUBLIC_SHOP_ID,
      service_id: selectedService.id,
      staff_id: selectedSlot.staff_id,
      start_at: selectedSlot.start_at,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      notes: notes || null,
    });

    if (!parsed.success) {
      setError('Revisa los datos del formulario de reserva.');
      return;
    }

    setSubmitting(true);
    setError(null);

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
      setSubmitting(false);
      setError(customerError?.message || 'No se pudo crear el cliente.');
      return;
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
      .select('id')
      .single();

    if (appointmentError || !appointment) {
      setSubmitting(false);
      setError(appointmentError?.message || 'No se pudo crear la cita.');
      return;
    }

    setSubmitting(false);
    router.push({
      pathname: '/book/success',
      params: {
        appointment: String(appointment.id),
        start: selectedSlot.start_at,
        service: selectedService.name,
        staff: selectedSlot.staff_name,
      },
    });
  }

  return (
    <Screen title="Reservas" subtitle="Flujo público de agenda en 4 pasos">
      <ErrorText message={error} />

      <Card>
        <Text style={styles.stepTitle}>1. Servicio</Text>
        {loadingServices ? <MutedText>Cargando servicios...</MutedText> : null}
        <View style={styles.grid}>
          {services.map((service) => (
            <Pressable
              key={service.id}
              style={[styles.option, service.id === serviceId ? styles.optionActive : null]}
              onPress={() => setServiceId(service.id)}
            >
              <Text style={styles.optionTitle}>{service.name}</Text>
              <Text style={styles.optionMeta}>
                {formatCurrency(service.price_cents)} - {service.duration_minutes} min
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.stepTitle}>2. Barbero</Text>
        <Label>Fecha</Label>
        <Field value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <View style={styles.inlineButtons}>
          <ActionButton label="Hoy" variant="secondary" onPress={() => setDate(todayIsoDate())} />
          <ActionButton
            label="Mañana"
            variant="secondary"
            onPress={() => {
              const next = new Date();
              next.setDate(next.getDate() + 1);
              setDate(next.toISOString().slice(0, 10));
            }}
          />
        </View>
        <MutedText>{staffChoices.length ? 'Filtra por barbero o usa primero disponible.' : 'Selecciona servicio y fecha para cargar disponibilidad.'}</MutedText>
        <View style={styles.chipWrap}>
          <Pressable
            onPress={() => setStaffFilter('')}
            style={[styles.chip, !staffFilter ? styles.chipActive : null]}
          >
            <Text style={[styles.chipText, !staffFilter ? styles.chipTextActive : null]}>Primero disponible</Text>
          </Pressable>
          {staffChoices.map((staff) => (
            <Pressable
              key={staff.id}
              onPress={() => setStaffFilter(staff.id)}
              style={[styles.chip, staffFilter === staff.id ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, staffFilter === staff.id ? styles.chipTextActive : null]}>{staff.name}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.stepTitle}>3. Hora disponible</Text>
        {loadingSlots ? <MutedText>Cargando horarios...</MutedText> : null}
        {!loadingSlots && visibleSlots.length === 0 ? <MutedText>No hay horarios para esa fecha.</MutedText> : null}
        <View style={styles.grid}>
          {visibleSlots.map((slot) => {
            const selected = selectedSlot?.staff_id === slot.staff_id && selectedSlot.start_at === slot.start_at;
            return (
              <Pressable
                key={`${slot.staff_id}-${slot.start_at}`}
                style={[styles.option, selected ? styles.optionActive : null]}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text style={styles.optionTitle}>{formatTime(slot.start_at)}</Text>
                <Text style={styles.optionMeta}>{slot.staff_name}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={styles.stepTitle}>4. Tus datos</Text>
        <Label>Nombre y apellido</Label>
        <Field value={customerName} onChangeText={setCustomerName} />
        <Label>Teléfono</Label>
        <Field value={customerPhone} onChangeText={setCustomerPhone} />
        <Label>Email (opcional)</Label>
        <Field value={customerEmail} onChangeText={setCustomerEmail} keyboardType="email-address" />
        <Label>Notas (opcional)</Label>
        <MultilineField value={notes} onChangeText={setNotes} />
        <ActionButton
          label={submitting ? 'Creando reserva...' : 'Confirmar reserva'}
          onPress={submitBooking}
          disabled={!selectedSlot || !customerName || !customerPhone || submitting}
          loading={submitting}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  grid: {
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 2,
  },
  optionActive: {
    borderColor: palette.accent,
    backgroundColor: '#fff7e6',
  },
  optionTitle: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
  },
  optionMeta: {
    color: '#475569',
    fontSize: 12,
  },
  inlineButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  chipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
});
