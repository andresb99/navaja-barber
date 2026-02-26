'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bookingInputSchema } from '@navaja/shared';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
}

const stepLabels = [
  { id: 1, label: 'Servicio' },
  { id: 2, label: 'Barbero' },
  { id: 3, label: 'Horario' },
  { id: 4, label: 'Tus datos' },
] as const;

export function BookingFlow({ shopId, services, staff }: BookingFlowProps) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string>('');
  const [staffId, setStaffId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((item) => item.id === serviceId) || null,
    [serviceId, services],
  );

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }

    let ignore = false;
    setLoadingSlots(true);

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
          setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar la disponibilidad.');
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

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(parsed.data),
    });

    if (!response.ok) {
      setSubmitting(false);
      setError(await response.text());
      return;
    }

    const payload = (await response.json()) as { appointment_id: string };
    router.push(
      `/book/success?appointment=${payload.appointment_id}&start=${encodeURIComponent(selectedSlot.start_at)}&service=${encodeURIComponent(selectedService.name)}&staff=${encodeURIComponent(selectedSlot.staff_name)}`,
    );
  }

  return (
    <Card className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {stepLabels.map((item) => (
          <span
            key={item.id}
            className="pill-toggle"
            data-active={String(step >= item.id)}
            aria-current={step === item.id ? 'step' : undefined}
          >
            {item.id}. {item.label}
          </span>
        ))}
      </div>

      {error ? <p className="status-banner error">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className={`surface-card ${step >= 1 ? '' : 'opacity-60'}`}>
          <CardTitle>1. Servicio</CardTitle>
          <CardDescription>Elegi que queres hacerte hoy.</CardDescription>
          <Select
            className="mt-2"
            value={serviceId}
            onChange={(event) => {
              setServiceId(event.target.value);
              setStep(Math.max(step, 2));
            }}
          >
            <option value="">Selecciona un servicio</option>
            {services.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - ${(item.price_cents / 100).toFixed(2)} ({item.duration_minutes}m)
              </option>
            ))}
          </Select>
        </div>

        <div className={`surface-card ${step >= 2 ? '' : 'opacity-60'}`}>
          <CardTitle>2. Barbero</CardTitle>
          <CardDescription>Selecciona un barbero o te asignamos el primero disponible.</CardDescription>
          <Select
            className="mt-2"
            value={staffId}
            onChange={(event) => {
              setStaffId(event.target.value);
              setStep(Math.max(step, 3));
            }}
            disabled={!serviceId}
          >
            <option value="">Primero disponible</option>
            {staff.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className={`surface-card ${step >= 3 ? '' : 'opacity-60'}`}>
        <CardTitle>3. Fecha y hora</CardTitle>
        <CardDescription>La disponibilidad se actualiza en franjas de 15 minutos.</CardDescription>
        <div className="mt-2 max-w-xs">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={!serviceId} />
        </div>

        <div className="mt-4 grid max-h-72 gap-2 overflow-auto md:grid-cols-3">
          {loadingSlots ? <p className="text-sm text-slate/70">Cargando horarios...</p> : null}
          {!loadingSlots && slots.length === 0 ? (
            <p className="text-sm text-slate/70">No hay horarios disponibles para esta fecha.</p>
          ) : null}
          {slots.map((slot) => {
            const isSelected = selectedSlot?.staff_id === slot.staff_id && selectedSlot.start_at === slot.start_at;
            return (
              <button
                type="button"
                key={`${slot.staff_id}-${slot.start_at}`}
                className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                  isSelected
                    ? 'border-brass bg-brass/15 shadow-[0_18px_24px_-24px_rgba(234,176,72,0.9)]'
                    : 'border-slate/20 bg-white/85 hover:border-brass/60 dark:border-slate-700 dark:bg-slate-900/70'
                }`}
                onClick={() => {
                  setSelectedSlot(slot);
                  setStep(Math.max(step, 4));
                }}
              >
                <p className="font-semibold text-ink">
                  {new Date(slot.start_at).toLocaleTimeString('es-UY', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="mt-1 text-slate/70">{slot.staff_name}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`surface-card ${step >= 4 ? '' : 'opacity-60'}`}>
        <CardTitle>4. Tus datos</CardTitle>
        <CardDescription>Usamos esta informacion para confirmar tu cita.</CardDescription>

        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="customerName">Nombre y apellido</label>
            <Input id="customerName" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
          </div>
          <div>
            <label htmlFor="customerPhone">Telefono</label>
            <Input id="customerPhone" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
          </div>
          <div>
            <label htmlFor="customerEmail">Email (opcional)</label>
            <Input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="notes">Notas (opcional)</label>
            <Textarea id="notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate/10 pt-4 dark:border-slate-700">
        <p className="text-sm text-slate/80">
          {selectedService ? `Seleccionado: ${selectedService.name}` : 'Elegi un servicio para comenzar'}
        </p>
        <Button onClick={submitBooking} disabled={!selectedSlot || !customerName || !customerPhone || submitting}>
          {submitting ? 'Creando...' : 'Confirmar reserva'}
        </Button>
      </div>
    </Card>
  );
}

