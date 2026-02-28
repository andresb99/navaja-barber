'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bookingInputSchema } from '@navaja/shared';
import { Button, Card, CardBody, Input, Select, SelectItem, Textarea } from '@heroui/react';

interface ServiceOption {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
}

interface StaffOption {
  id: string;
  name: string;
}

interface AvailabilitySlot {
  staff_id: string;
  staff_name: string;
  start_at: string;
  end_at: string;
}

interface BookingFlowProps {
  shopId: string;
  services: ServiceOption[];
  staff: StaffOption[];
  initialCustomerEmail?: string;
}

const stepLabels = [
  { id: 1, label: 'Servicio' },
  { id: 2, label: 'Barbero' },
  { id: 3, label: 'Horario' },
  { id: 4, label: 'Tus datos' },
] as const;

function getSingleSelectionValue(keys: 'all' | Iterable<unknown>) {
  if (keys === 'all') {
    return '';
  }

  const first = Array.from(keys)[0];
  if (typeof first === 'string' || typeof first === 'number') {
    return String(first);
  }

  return '';
}

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

export function BookingFlow({ shopId, services, staff, initialCustomerEmail }: BookingFlowProps) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string>('');
  const [staffId, setStaffId] = useState<string>('');
  const [date, setDate] = useState<string>(getInitialBookingDate);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail || '');
  const [notes, setNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((item) => item.id === serviceId) || null,
    [serviceId, services],
  );
  const selectedStaff = useMemo(
    () => staff.find((item) => item.id === staffId) || null,
    [staff, staffId],
  );

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    let ignore = false;
    setLoadingSlots(true);
    setError(null);

    const query = new URLSearchParams({
      shop_id: shopId,
      service_id: serviceId,
      date,
    });

    if (staffId) {
      query.set('staff_id', staffId);
    }

    fetch(`/api/availability?${query.toString()}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await response.text());
        }
        return response.json();
      })
      .then((payload: { slots: AvailabilitySlot[] }) => {
        if (ignore) {
          return;
        }
        setSlots(payload.slots || []);
        setSelectedSlot(null);
      })
      .catch((fetchError: unknown) => {
        if (!ignore) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'No se pudo cargar la disponibilidad.',
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoadingSlots(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [date, serviceId, shopId, staffId]);

  async function submitBooking() {
    if (!selectedSlot || !selectedService) {
      setError('Elegi un horario antes de confirmar.');
      return;
    }

    const parsed = bookingInputSchema.safeParse({
      shop_id: shopId,
      service_id: selectedService.id,
      staff_id: selectedSlot.staff_id,
      start_at: selectedSlot.start_at,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      notes: notes || null,
    });

    if (!parsed.success) {
      setError(parsed.error.flatten().formErrors.join(', ') || 'Datos de reserva invalidos.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        setError(await response.text());
        return;
      }

      const payload = (await response.json()) as { appointment_id: string };
      router.push(
        `/book/success?appointment=${payload.appointment_id}&start=${encodeURIComponent(selectedSlot.start_at)}&service=${encodeURIComponent(selectedService.name)}&staff=${encodeURIComponent(selectedSlot.staff_name)}`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'No se pudo confirmar la cita.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="soft-panel overflow-hidden rounded-[2rem] border-0 shadow-none">
      <CardBody className="space-y-6 px-5 py-5 md:px-6 md:py-6">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {stepLabels.map((item) => (
            <span
              key={item.id}
              className="pill-toggle justify-start sm:justify-center"
              data-active={String(step >= item.id)}
              aria-current={step === item.id ? 'step' : undefined}
            >
              {item.id}. {item.label}
            </span>
          ))}
        </div>

        {error ? <p className="status-banner error">{error}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className={`surface-card spotlight-card ${step >= 1 ? '' : 'opacity-60'}`}>
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">1. Servicio</h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Elegi que quieres hacerte hoy.
            </p>
            <Select
              aria-label="Servicio"
              label="Servicio"
              labelPlacement="inside"
              className="mt-2"
              selectedKeys={serviceId ? [serviceId] : []}
              disallowEmptySelection={false}
              placeholder="Selecciona un servicio"
              classNames={{
                label: 'text-slate/55 dark:text-slate-400',
                value: 'text-ink dark:text-slate-100',
              }}
              renderValue={() =>
                selectedService
                  ? `${selectedService.name} - $${(selectedService.price_cents / 100).toFixed(2)} (${selectedService.duration_minutes}m)`
                  : null
              }
              onSelectionChange={(keys) => {
                const nextServiceId = getSingleSelectionValue(keys);
                setServiceId(nextServiceId);
                setStaffId('');
                setSelectedSlot(null);
                setStep(nextServiceId ? Math.max(step, 2) : 1);
              }}
            >
              {services.map((item) => (
                <SelectItem key={item.id}>
                  {item.name} - ${(item.price_cents / 100).toFixed(2)} ({item.duration_minutes}m)
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className={`surface-card spotlight-card ${step >= 2 ? '' : 'opacity-60'}`}>
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">2. Barbero</h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Selecciona un barbero o te asignamos el primero disponible.
            </p>
            <Select
              aria-label="Barbero"
              label="Barbero"
              labelPlacement="inside"
              className="mt-2"
              selectedKeys={staffId ? [staffId] : []}
              disallowEmptySelection={false}
              placeholder="Primero disponible"
              classNames={{
                label: 'text-slate/55 dark:text-slate-400',
                value: 'text-ink dark:text-slate-100',
              }}
              renderValue={() => (selectedStaff ? selectedStaff.name : null)}
              onSelectionChange={(keys) => {
                const nextStaffId = getSingleSelectionValue(keys);
                setStaffId(nextStaffId);
                setSelectedSlot(null);
                setStep(Math.max(step, 3));
              }}
              isDisabled={!serviceId}
            >
              {staff.map((item) => (
                <SelectItem key={item.id}>{item.name}</SelectItem>
              ))}
            </Select>
          </div>
        </div>

        <div className={`surface-card spotlight-card ${step >= 3 ? '' : 'opacity-60'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
                3. Fecha y hora
              </h3>
              <p className="text-sm text-slate/80 dark:text-slate-300">
                La disponibilidad se actualiza en franjas de 15 minutos.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <Input
                id="booking-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                isDisabled={!serviceId}
                label="Fecha"
                labelPlacement="inside"
                classNames={{
                  input: 'temporal-placeholder-hidden',
                }}
              />
            </div>
          </div>

          <div className="mt-4 grid max-h-72 gap-2 overflow-auto md:grid-cols-3">
            {loadingSlots ? <p className="text-sm text-slate/70">Cargando horarios...</p> : null}
            {!loadingSlots && slots.length === 0 ? (
              <p className="text-sm text-slate/70">No hay horarios disponibles para esta fecha.</p>
            ) : null}
            {slots.map((slot) => {
              const isSelected =
                selectedSlot?.staff_id === slot.staff_id && selectedSlot.start_at === slot.start_at;
              return (
                <button
                  type="button"
                  key={`${slot.staff_id}-${slot.start_at}`}
                  className={`rounded-2xl border px-3 py-3 text-left text-xs transition ${
                    isSelected
                      ? 'border-sky-400/28 bg-sky-500/[0.09] shadow-[0_16px_24px_-22px_rgba(14,165,233,0.55)]'
                      : 'border-white/70 bg-white/62 hover:-translate-y-px hover:border-white/90 hover:bg-white/82 dark:border-white/8 dark:bg-white/[0.03] dark:hover:border-white/12 dark:hover:bg-white/[0.05]'
                  }`}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setStep(Math.max(step, 4));
                  }}
                >
                  <p className="font-semibold text-ink dark:text-slate-100">
                    {new Date(slot.start_at).toLocaleTimeString('es-UY', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="mt-1 text-slate/70 dark:text-slate-400">{slot.staff_name}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`surface-card spotlight-card ${step >= 4 ? '' : 'opacity-60'}`}>
          <h3 className="text-xl font-semibold text-ink dark:text-slate-100">4. Tus datos</h3>
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Usamos esta informacion para confirmar tu cita.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Input
              id="customerName"
              label="Nombre y apellido"
              labelPlacement="inside"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
            <Input
              id="customerPhone"
              label="Telefono"
              labelPlacement="inside"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
            />
            <Input
              id="customerEmail"
              type="email"
              label="Email (opcional)"
              labelPlacement="inside"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
            />
            <Textarea
              id="notes"
              className="md:col-span-2"
              rows={3}
              label="Notas (opcional)"
              labelPlacement="inside"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/55 pt-4 dark:border-white/8">
          <p className="text-sm text-slate/80 dark:text-slate-300">
            {selectedService
              ? `Seleccionado: ${selectedService.name}`
              : 'Elige un servicio para comenzar'}
          </p>
          <Button
            onClick={submitBooking}
            isDisabled={!selectedSlot || !customerName || !customerPhone || submitting}
            isLoading={submitting}
            className="action-primary px-5 text-sm font-semibold data-[disabled=true]:opacity-50"
          >
            {submitting ? 'Creando...' : !selectedSlot ? 'Elige horario' : 'Confirmar reserva'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
