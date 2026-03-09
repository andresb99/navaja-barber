import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { bookingInputSchema } from '@navaja/shared';
import {
  ActionButton,
  Card,
  ErrorText,
  Field,
  HeroPanel,
  Label,
  MultilineField,
  MutedText,
  PillToggle,
  Screen,
  SurfaceCard,
} from '../../components/ui/primitives';
import { submitBookingViaApi } from '../../lib/api';
import { formatCurrency, formatTime } from '../../lib/format';
import {
  formatMarketplaceLocation,
  listMarketplaceServices,
  listMarketplaceShops,
  resolvePreferredMarketplaceShopId,
  saveMarketplaceShopId,
  type MarketplaceService,
  type MarketplaceShop,
} from '../../lib/marketplace';
import { openDirectionsToShop } from '../../lib/maps';
import { supabase } from '../../lib/supabase';
import { useNavajaTheme } from '../../lib/theme';

interface SlotOption {
  staff_id: string;
  staff_name: string;
  start_at: string;
  end_at: string;
}

const stepLabels = ['1. Servicio', '2. Barbero', '3. Horario', '4. Tus datos'] as const;

function getInitialBookingDate() {
  const today = new Date();
  const utcDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const dayOfWeek = utcDate.getUTCDay();

  if (dayOfWeek === 6) {
    utcDate.setUTCDate(utcDate.getUTCDate() + 2);
  } else if (dayOfWeek === 0) {
    utcDate.setUTCDate(utcDate.getUTCDate() + 1);
  }

  return utcDate.toISOString().slice(0, 10);
}

function normalizeEmail(value: string | null | undefined) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return normalized || null;
}

export default function ReservasScreen() {
  const { colors } = useNavajaTheme();
  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [serviceId, setServiceId] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [date, setDate] = useState(getInitialBookingDate());
  const [allSlots, setAllSlots] = useState<SlotOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === selectedShopId) || shops[0] || null,
    [selectedShopId, shops],
  );
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

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        setLoadingShops(true);
        setError(null);

        const marketplaceShops = await listMarketplaceShops();
        if (!active) {
          return;
        }

        setShops(marketplaceShops);
        const preferredShopId = await resolvePreferredMarketplaceShopId(marketplaceShops);
        if (!active) {
          return;
        }

        setSelectedShopId(preferredShopId);
        setLoadingShops(false);
      })().catch(() => {
        if (!active) {
          return;
        }

        setLoadingShops(false);
        setError('No se pudo cargar el marketplace.');
      });

      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    if (!selectedShopId) {
      setServices([]);
      return;
    }

    let active = true;

    void (async () => {
      setLoadingServices(true);
      const items = await listMarketplaceServices(selectedShopId);
      if (!active) {
        return;
      }

      setServices(items);
      if (!items.find((item) => item.id === serviceId)) {
        setServiceId('');
      }
      setLoadingServices(false);
    })().catch(() => {
      if (!active) {
        return;
      }

      setServices([]);
      setLoadingServices(false);
      setError('No se pudieron cargar los servicios.');
    });

    return () => {
      active = false;
    };
  }, [selectedShopId, serviceId]);

  useEffect(() => {
    if (!selectedShopId || !serviceId || !date) {
      setAllSlots([]);
      setSelectedSlot(null);
      return;
    }

    let active = true;

    void (async () => {
      setLoadingSlots(true);
      setError(null);

      const { data, error: slotsError } = await supabase.rpc('get_public_availability', {
        p_shop_id: selectedShopId,
        p_service_id: serviceId,
        p_date: date,
        p_staff_id: null,
      });

      if (!active) {
        return;
      }

      if (slotsError) {
        setAllSlots([]);
        setSelectedSlot(null);
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
    })();

    return () => {
      active = false;
    };
  }, [date, serviceId, selectedShopId]);

  async function selectShop(shopId: string) {
    setSelectedShopId(shopId);
    setServiceId('');
    setStaffFilter('');
    setAllSlots([]);
    setSelectedSlot(null);
    await saveMarketplaceShopId(shopId);
  }

  async function submitBooking() {
    if (!selectedService || !selectedSlot || !selectedShopId) {
      setError('Selecciona servicio y horario antes de confirmar.');
      return;
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const resolvedCustomerEmail =
      normalizeEmail(customerEmail) ?? normalizeEmail(authUser?.email) ?? null;

    const parsed = bookingInputSchema.safeParse({
      shop_id: selectedShopId,
      service_id: selectedService.id,
      staff_id: selectedSlot.staff_id,
      start_at: selectedSlot.start_at,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: resolvedCustomerEmail,
      notes: notes || null,
    });

    if (!parsed.success) {
      setError('Revisa los datos del formulario de reserva.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const apiResult = await submitBookingViaApi({
        shop_id: parsed.data.shop_id,
        service_id: parsed.data.service_id,
        staff_id: selectedSlot.staff_id,
        start_at: parsed.data.start_at,
        source_channel: 'MOBILE',
        customer_name: parsed.data.customer_name,
        customer_phone: parsed.data.customer_phone,
        customer_email: parsed.data.customer_email || null,
        notes: parsed.data.notes || null,
      });

      if (!apiResult) {
        setError(
          'No hay API externa configurada en la app. Define EXPO_PUBLIC_API_BASE_URL para reservar.',
        );
        return;
      }

      if (apiResult.requires_payment) {
        await WebBrowser.openBrowserAsync(apiResult.checkout_url);
        setError(
          'Te abrimos el checkout de pago. Al finalizar, vuelve a la app para ver el estado de tu reserva.',
        );
        return;
      }

      if (apiResult.appointment_id) {
        router.push({
          pathname: '/book/success',
          params: {
            appointment: apiResult.appointment_id,
            start: selectedSlot.start_at,
            service: selectedService.name,
            staff: selectedSlot.staff_name,
          },
        });
        return;
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'No se pudo confirmar la cita.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      eyebrow="Reservas"
      title="Agenda como en la web, pero nativo"
      subtitle="Selecciona barberia, servicio, staff y horario. El flujo conserva la misma secuencia visual de la web responsive."
    >
      <HeroPanel
        eyebrow="Reserva publica"
        title={selectedShop ? selectedShop.name : 'Elige una barberia para reservar'}
        description={
          selectedShop
            ? formatMarketplaceLocation(selectedShop)
            : 'El contexto activo define que servicios y horarios ves.'
        }
      >
        <View style={styles.stepRow}>
          {stepLabels.map((label, index) => {
            const activeStep =
              index === 0
                ? Boolean(serviceId)
                : index === 1
                  ? Boolean(serviceId)
                  : index === 2
                    ? Boolean(selectedSlot)
                    : Boolean(customerName || customerPhone || customerEmail);

            return <PillToggle key={label} label={label} active={activeStep} compact />;
          })}
        </View>
        {selectedShop ? (
          <ActionButton
            label="Ver ubicacion en Google Maps"
            variant="secondary"
            onPress={() => {
              void openDirectionsToShop(selectedShop);
            }}
            style={styles.heroButton}
          />
        ) : null}
      </HeroPanel>

      <ErrorText message={error} />

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Servicio y barberia</Text>
        {loadingShops ? <MutedText>Cargando barberias...</MutedText> : null}
        {!loadingShops && !shops.length ? (
          <MutedText>No hay barberias activas publicadas.</MutedText>
        ) : null}

        <View style={styles.filterWrap}>
          {shops.map((shop) => (
            <PillToggle
              key={shop.id}
              label={shop.name}
              active={shop.id === (selectedShop?.id || '')}
              onPress={() => {
                void selectShop(shop.id);
              }}
            />
          ))}
        </View>

        {loadingServices ? <MutedText>Cargando servicios...</MutedText> : null}
        {!loadingServices && selectedShop && !services.length ? (
          <MutedText>No hay servicios activos en esta barberia.</MutedText>
        ) : null}

        <View style={styles.optionList}>
          {services.map((service) => (
            <SurfaceCard
              key={service.id}
              active={service.id === serviceId}
              style={styles.optionCard}
              onPress={() => {
                setServiceId(service.id);
                setStaffFilter('');
              }}
            >
              <Text style={[styles.optionTitle, { color: colors.text }]}>{service.name}</Text>
              <Text style={[styles.optionMeta, { color: colors.textMuted }]}>
                {formatCurrency(service.priceCents)} - {service.durationMinutes} min
              </Text>
            </SurfaceCard>
          ))}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Barbero y fecha</Text>
        <Label>Fecha</Label>
        <Field value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <View style={styles.inlineButtons}>
          <ActionButton
            label="Hoy"
            variant="secondary"
            onPress={() => setDate(new Date().toISOString().slice(0, 10))}
          />
          <ActionButton
            label="Manana"
            variant="secondary"
            onPress={() => {
              const next = new Date();
              next.setDate(next.getDate() + 1);
              setDate(next.toISOString().slice(0, 10));
            }}
          />
        </View>
        <Text style={[styles.helper, { color: colors.textMuted }]}>
          {selectedShop
            ? `Disponibilidad de ${selectedShop.name}.`
            : 'Selecciona una barberia y un servicio para cargar disponibilidad.'}
        </Text>

        <View style={styles.filterWrap}>
          <PillToggle
            label="Primero disponible"
            active={!staffFilter}
            onPress={() => setStaffFilter('')}
          />
          {staffChoices.map((staff) => (
            <PillToggle
              key={staff.id}
              label={staff.name}
              active={staffFilter === staff.id}
              onPress={() => setStaffFilter(staff.id)}
            />
          ))}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Horario</Text>
        {loadingSlots ? <MutedText>Cargando horarios...</MutedText> : null}
        {!loadingSlots && selectedService && !visibleSlots.length ? (
          <MutedText>No hay horarios disponibles para esa fecha.</MutedText>
        ) : null}
        {!selectedService ? <MutedText>Selecciona un servicio para ver la agenda.</MutedText> : null}

        <View style={styles.optionList}>
          {visibleSlots.map((slot) => {
            const selected =
              selectedSlot?.staff_id === slot.staff_id &&
              selectedSlot.start_at === slot.start_at;

            return (
              <SurfaceCard
                key={`${slot.staff_id}-${slot.start_at}`}
                active={selected}
                style={styles.optionCard}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  {formatTime(slot.start_at)}
                </Text>
                <Text style={[styles.optionMeta, { color: colors.textMuted }]}>
                  {slot.staff_name}
                </Text>
              </SurfaceCard>
            );
          })}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Tus datos</Text>
        <Label>Nombre y apellido</Label>
        <Field value={customerName} onChangeText={setCustomerName} />
        <Label>Telefono</Label>
        <Field value={customerPhone} onChangeText={setCustomerPhone} />
        <Label>Email (opcional)</Label>
        <Field
          value={customerEmail}
          onChangeText={setCustomerEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
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
  stepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroButton: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  helper: {
    fontSize: 12,
  },
  optionList: {
    gap: 8,
  },
  optionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    gap: 4,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionMeta: {
    fontSize: 12,
  },
  inlineButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
