'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bookingInputSchema, formatCurrency } from '@navaja/shared';
import { Button, Card, CardBody, Checkbox, Input, Select, SelectItem, Textarea } from '@heroui/react';

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
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  preferredPaymentMethod?: string | null;
  cancellationNoticeHours?: number;
  staffCancellationRefundMode?: 'automatic_full' | 'manual_review';
  cancellationPolicyText?: string | null;
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

function areAvailabilitySlotsEqual(left: AvailabilitySlot[], right: AvailabilitySlot[]) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (!leftItem || !rightItem) {
      return false;
    }

    if (
      leftItem.staff_id !== rightItem.staff_id ||
      leftItem.staff_name !== rightItem.staff_name ||
      leftItem.start_at !== rightItem.start_at ||
      leftItem.end_at !== rightItem.end_at
    ) {
      return false;
    }
  }

  return true;
}

export function BookingFlow({
  shopId,
  services,
  staff,
  initialCustomerEmail,
  initialCustomerName = '',
  initialCustomerPhone = '',
  preferredPaymentMethod = null,
  cancellationNoticeHours = 6,
  staffCancellationRefundMode = 'automatic_full',
  cancellationPolicyText = null,
}: BookingFlowProps) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string>('');
  const [staffId, setStaffId] = useState<string>('');
  const [date, setDate] = useState<string>(getInitialBookingDate);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail || '');
  const [notes, setNotes] = useState('');
  const [payInStore, setPayInStore] = useState(false);
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
  const renderedSlots = useMemo(
    () =>
      slots.map((slot) => {
        const isSelected =
          selectedSlot?.staff_id === slot.staff_id && selectedSlot.start_at === slot.start_at;
        return {
          key: `${slot.staff_id}-${slot.start_at}`,
          slot,
          isSelected,
          startTimeLabel: new Date(slot.start_at).toLocaleTimeString('es-UY', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
      }),
    [selectedSlot, slots],
  );
  const handleServiceSelectionChange = useCallback((keys: 'all' | Iterable<unknown>) => {
    const nextServiceId = getSingleSelectionValue(keys);
    setServiceId(nextServiceId);
    setStaffId('');
    setSelectedSlot(null);
    setStep((currentStep) => (nextServiceId ? Math.max(currentStep, 2) : 1));
  }, []);
  const handleStaffSelectionChange = useCallback((keys: 'all' | Iterable<unknown>) => {
    const nextStaffId = getSingleSelectionValue(keys);
    setStaffId(nextStaffId);
    setSelectedSlot(null);
    setStep((currentStep) => Math.max(currentStep, 3));
  }, []);
  const handleSelectSlot = useCallback((slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    setStep((currentStep) => Math.max(currentStep, 4));
  }, []);

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    const controller = new AbortController();
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

    fetch(`/api/availability?${query.toString()}`, {
      signal: controller.signal,
    })
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
        const nextSlots = payload.slots || [];
        setSlots((currentSlots) =>
          areAvailabilitySlotsEqual(currentSlots, nextSlots) ? currentSlots : nextSlots,
        );
        setSelectedSlot(null);
      })
      .catch((fetchError: unknown) => {
        if (!ignore) {
          if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
            return;
          }
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
      controller.abort();
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
      pay_in_store: payInStore,
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

      const payload = (await response.json()) as {
        appointment_id?: string;
        requires_payment?: boolean;
        payment_intent_id?: string;
        checkout_url?: string;
      };

      if (payload.requires_payment && payload.checkout_url) {
        window.location.assign(payload.checkout_url);
        return;
      }

      if (!payload.appointment_id) {
        setError('No se pudo iniciar la reserva.');
        return;
      }

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

        {error ? (
          <p className="status-banner error" role="alert" aria-live="assertive">
            {error}
          </p>
        ) : null}

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
                  ? `${selectedService.name} - ${formatCurrency(selectedService.price_cents)} (${selectedService.duration_minutes}m)`
                  : null
              }
              onSelectionChange={handleServiceSelectionChange}
            >
              {services.map((item) => (
                <SelectItem
                  key={item.id}
                  textValue={`${item.name} - ${formatCurrency(item.price_cents)} (${item.duration_minutes}m)`}
                >
                  {item.name} - {formatCurrency(item.price_cents)} ({item.duration_minutes}m)
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
              onSelectionChange={handleStaffSelectionChange}
              isDisabled={!serviceId}
            >
              {staff.map((item) => (
                <SelectItem key={item.id} textValue={item.name}>
                  {item.name}
                </SelectItem>
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
            {renderedSlots.map((item) => {
              const { slot, isSelected } = item;
              return (
                <button
                  type="button"
                  key={item.key}
                  className={`rounded-2xl border border-transparent px-3 py-3 text-left text-xs transition ${
                    isSelected
                      ? 'border-sky-400/38 bg-sky-500/[0.1] dark:border-sky-300/22 dark:bg-sky-400/[0.08]'
                      : 'bg-white/58 md:hover:bg-white/78 dark:bg-white/[0.03] dark:md:hover:bg-white/[0.05]'
                  }`}
                  onClick={() => handleSelectSlot(slot)}
                >
                  <p className="font-semibold text-ink dark:text-slate-100">{item.startTimeLabel}</p>
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
              label={payInStore ? 'Email (opcional)' : 'Email (requerido para pago online)'}
              labelPlacement="inside"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              required={!payInStore}
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
            <div className="md:col-span-2">
              <Checkbox
                isSelected={payInStore}
                onValueChange={setPayInStore}
              >
                Pagar en el local
              </Checkbox>
              <p className="mt-1 text-[11px] text-slate/70 dark:text-slate-400">
                Si no marcas esta opcion, te enviaremos al checkout online para completar la reserva.
              </p>
            </div>
          </div>
          {preferredPaymentMethod ? (
            <p className="mt-2 text-[11px] text-slate/70 dark:text-slate-400">
              Metodo guardado: {preferredPaymentMethod}
            </p>
          ) : null}
          <div className="mt-4 rounded-[1.4rem] border border-amber-300/40 bg-amber-50/80 p-4 text-sm text-slate-800 shadow-[0_18px_34px_-28px_rgba(146,64,14,0.28)] dark:border-amber-200/12 dark:bg-amber-300/[0.07] dark:text-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700/90 dark:text-amber-200/80">
              Politica de reserva
            </p>
            <p className="mt-2">
              {cancellationNoticeHours === 0
                ? 'Puedes cancelar sin friccion hasta el momento de la cita.'
                : `Puedes cancelar sin friccion hasta ${cancellationNoticeHours} horas antes de la cita.`}
            </p>
            <p className="mt-2">
              {staffCancellationRefundMode === 'automatic_full'
                ? 'Si la barberia cancela una cita pagada, el reembolso se procesa automaticamente al 100%.'
                : 'Si la barberia cancela una cita pagada, el reembolso queda marcado para revision manual del local.'}
            </p>
            {cancellationPolicyText ? <p className="mt-2">{cancellationPolicyText}</p> : null}
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
            isDisabled={
              !selectedSlot ||
              !customerName ||
              !customerPhone ||
              (!payInStore && !customerEmail) ||
              submitting
            }
            isLoading={submitting}
            className="action-primary px-5 text-sm font-semibold data-[disabled=true]:opacity-50"
          >
            {submitting
              ? 'Creando...'
              : !selectedSlot
                ? 'Elige horario'
                : payInStore
                  ? 'Confirmar reserva'
                  : 'Continuar al pago'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
