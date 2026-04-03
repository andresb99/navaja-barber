'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { bookingInputSchema, formatCurrency } from '@navaja/shared';
import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react';
import { SurfaceDatePicker } from '@/components/heroui/surface-field';

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
  shopSlug: string;
  shopName: string;
  shopTimezone: string;
  services: ServiceOption[];
  staff: StaffOption[];
  initialCustomerEmail?: string;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  preferredPaymentMethod?: string | null;
  supportsOnlinePayment?: boolean;
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
  shopSlug,
  shopName,
  shopTimezone,
  services,
  staff,
  initialCustomerEmail,
  initialCustomerName = '',
  initialCustomerPhone = '',
  preferredPaymentMethod = null,
  supportsOnlinePayment = true,
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
  const [payInStore, setPayInStore] = useState(!supportsOnlinePayment);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staffScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isInfinite = staff.length >= 4;
  const loopedStaff = useMemo(() => isInfinite ? Array(30).fill(staff).flat() : staff, [staff, isInfinite]);

  const checkScroll = useCallback(() => {
    if (staffScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = staffScrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft) < scrollWidth - clientWidth - 1);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, loopedStaff]);

  useEffect(() => {
    if (staffScrollRef.current && isInfinite && staff.length > 0) {
      const container = staffScrollRef.current;
      // Wait for next tick so DOM is painted with all copies
      setTimeout(() => {
        const middleStartIndex = 15 * staff.length;
        const middleItem = container.children[middleStartIndex] as HTMLElement;
        if (middleItem) {
          container.scrollLeft = middleItem.offsetLeft;
        }
      }, 50);
    }
  }, [staff, isInfinite]);

  const selectedService = useMemo(
    () => services.find((item) => item.id === serviceId) || null,
    [serviceId, services],
  );
  const selectedStaff = useMemo(
    () => staff.find((item) => item.id === staffId) || null,
    [staff, staffId],
  );
  const requiresOnlinePayment =
    supportsOnlinePayment && !payInStore && Number(selectedService?.price_cents || 0) > 0;
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
    if (!supportsOnlinePayment) {
      setPayInStore(true);
    }
  }, [supportsOnlinePayment]);

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

      const successParams = new URLSearchParams({
        appointment: payload.appointment_id,
        start: selectedSlot.start_at,
        service: selectedService.name,
        staff: selectedSlot.staff_name,
        shop: shopSlug,
        shop_name: shopName,
        timezone: shopTimezone,
      });

      router.push(`/book/success?${successParams.toString()}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'No se pudo confirmar la cita.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-8 lg:gap-16 items-start mt-6 sm:mt-10 w-full min-w-0">
      {/* LEFT COLUMN: THE STEPS */}
      <div className="space-y-12 min-w-0 w-full">
        {/* Step 1 */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-at-raised text-at-heading text-xs font-bold ring-1 ring-at-border/5">01</span>
            <h2 className="text-2xl font-bold text-at-heading tracking-tight">Select Service</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {services.map((item) => {
              const isSelected = item.id === serviceId;
              return (
                <div
                  key={item.id}
                  onClick={() => handleServiceSelectionChange([item.id])}
                  role="button"
                  tabIndex={0}
                  className={`text-left relative p-4 sm:p-6 rounded-[1rem] border transition-all flex flex-col justify-between min-h-[180px] sm:min-h-[220px] cursor-pointer outline-none ${isSelected
                      ? 'bg-at-deep border-at-accent-light shadow-[0_0_20px_-5px_rgba(var(--at-accent),0.3)]'
                      : 'bg-at-deep border-at-border/5 hover:border-at-border/20'
                    }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4 w-full">
                      <h3 className="text-xl font-bold text-at-heading pr-4 leading-tight">{item.name}</h3>
                      <span className={`font-bold text-lg whitespace-nowrap flex-shrink-0 ${isSelected ? 'text-at-accent-light' : 'text-at-heading'}`}>
                        {formatCurrency(item.price_cents)}
                      </span>
                    </div>
                    <p className="text-sm text-at-muted line-clamp-3 leading-relaxed">
                      Precision grooming and styling session tailored for you.
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-2 text-xs text-at-muted font-semibold tracking-wider">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {item.duration_minutes} MIN
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-at-accent-light flex items-center justify-center shadow-[0_0_15px_rgba(var(--at-accent),0.4)]">
                        <svg className="w-4 h-4 text-at-accent-on fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2 */}
        <div className={`space-y-6 transition-opacity ${step >= 2 ? '' : 'opacity-40 pointer-events-none'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-at-raised text-at-heading text-xs font-bold ring-1 ring-at-border/5">02</span>
              <h2 className="text-2xl font-bold text-at-heading tracking-tight">Select Professional</h2>
            </div>
            
            {(canScrollLeft || canScrollRight) && (
              <div className="flex gap-2 hidden sm:flex">
                <button 
                  type="button" 
                  onClick={() => staffScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                  disabled={!canScrollLeft} 
                  className="w-8 h-8 rounded-full bg-at-raised flex items-center justify-center text-at-heading hover:bg-at-surface transition-colors disabled:opacity-30 disabled:hover:bg-at-raised"
                >
                  <svg className="w-4 h-4 ml-[-2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button 
                  type="button" 
                  onClick={() => staffScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                  disabled={!canScrollRight} 
                  className="w-8 h-8 rounded-full bg-at-raised flex items-center justify-center text-at-heading hover:bg-at-surface transition-colors disabled:opacity-30 disabled:hover:bg-at-raised"
                >
                  <svg className="w-4 h-4 ml-[2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </div>
          <div className="w-full min-w-0 relative group">
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-at-page to-transparent z-10 pointer-events-none sm:hidden" />
            )}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-at-page to-transparent z-10 pointer-events-none sm:hidden" />
            )}
            <div 
              ref={staffScrollRef}
              onScroll={checkScroll}
              className="flex flex-nowrap overflow-x-auto gap-4 sm:gap-6 pb-6 pt-4 scrollbar-hide snap-x"
            >
              {loopedStaff.map((member, index) => {
              const isSelected = member.id === staffId;
              return (
                <button key={`${member.id}-${index}`} onClick={() => handleStaffSelectionChange([member.id])} className="text-center group flex flex-col items-center w-[76px] sm:w-[90px] shrink-0 snap-start">
                  <div className={`relative mb-3 rounded-full transition-all ${isSelected ? 'ring-[3px] ring-offset-4 ring-offset-at-page ring-at-accent-light scale-105' : 'ring-1 ring-transparent group-hover:ring-at-border/20 group-hover:ring-offset-2 group-hover:ring-offset-at-page'}`}>
                    <img src={`https://i.pravatar.cc/150?u=${member.id}`} loading="lazy" className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover transition-all ${isSelected ? 'grayscale-0' : 'grayscale'}`} alt={member.name} />
                    {isSelected && (
                      <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-at-accent-light flex items-center justify-center border-[3px] border-at-page">
                        <svg className="w-3 h-3 text-at-accent-on fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                  </div>
                  <span className={`block font-bold mt-1 text-sm w-full truncate px-1 ${isSelected ? 'text-at-heading' : 'text-at-muted'}`}>
                    {member.name.split(' ')[0]}
                  </span>
                  <span className="block text-[9px] font-bold text-at-muted/50 uppercase tracking-wider">{(index % staff.length) === 0 ? 'MASTER' : 'ARTISAN'}</span>
                </button>
              )
            })}
            {/* Spacer for full horizontal scroll bleed offset */}
            <div className="w-4 sm:w-8 shrink-0" />
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className={`space-y-6 transition-opacity ${step >= 3 ? '' : 'opacity-40 pointer-events-none'}`}>
          <div className="flex items-center gap-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-at-raised text-at-heading text-xs font-bold ring-1 ring-at-border/5">03</span>
            <h2 className="text-2xl font-bold text-at-heading tracking-tight">Date & Time</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start w-full min-w-0">
            <div className="bg-at-deep rounded-[1rem] p-6 w-full min-w-0">
              <div className="flex items-center justify-between mb-8">
                <span className="text-sm font-bold tracking-widest uppercase text-at-heading">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => {
                    const d = new Date(date + 'T00:00:00'); d.setMonth(d.getMonth() - 1); setDate(d.toISOString().split('T')[0] as string);
                  }} className="w-8 h-8 rounded-full bg-at-raised flex items-center justify-center text-at-heading hover:bg-at-surface transition-colors"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg></button>
                  <button type="button" onClick={() => {
                    const d = new Date(date + 'T00:00:00'); d.setMonth(d.getMonth() + 1); setDate(d.toISOString().split('T')[0] as string);
                  }} className="w-8 h-8 rounded-full bg-at-raised flex items-center justify-center text-at-heading hover:bg-at-surface transition-colors"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-4">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <div key={i} className="text-[10px] font-bold text-at-muted/50 uppercase">{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                {(() => {
                  const d = new Date(date + 'T00:00:00');
                  const month = d.getMonth();
                  const year = d.getFullYear();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const firstDay = new Date(year, month, 1).getDay();
                  const startRaw = firstDay === 0 ? 6 : firstDay - 1; // 0=Mon, ... 6=Sun

                  const cells = [];
                  for (let i = 0; i < startRaw; i++) {
                    cells.push(<div key={`empty-${i}`} className="p-1 sm:p-2"></div>);
                  }
                  for (let i = 1; i <= daysInMonth; i++) {
                    const cur = new Date(year, month, i);
                    const isoDate = cur.toISOString().split('T')[0] as string;
                    const isSelected = date === isoDate;
                    cells.push(
                      <button
                        key={i}
                        type="button"
                        onClick={() => setDate(isoDate)}
                        className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center transition-all ${isSelected ? 'bg-at-accent-light text-at-accent-on shadow-[0_0_15px_-3px_rgba(var(--at-accent),0.4)]' : 'text-at-heading hover:bg-at-raised'
                          }`}
                      >
                        {i.toString().padStart(2, '0')}
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-at-heading mb-4">AVAILABLE SLOTS</p>
              <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 sm:gap-3 max-h-72 overflow-y-auto pr-1 sm:pr-2">
                {loadingSlots ? <p className="text-sm text-at-muted col-span-2">Cargando...</p> : null}
                {!loadingSlots && slots.length === 0 ? (
                  <p className="text-sm text-at-muted col-span-2">No hay horarios disponibles.</p>
                ) : null}
                {renderedSlots.map((item) => {
                  const { slot, isSelected } = item;
                  return (
                    <button key={item.key} onClick={() => handleSelectSlot(slot)} className={`py-4 rounded-[0.8rem] text-sm font-bold text-center transition-all ${isSelected ? 'bg-at-accent-light text-at-accent-on shadow-[0_0_15px_-3px_rgba(var(--at-accent),0.4)]' : 'bg-at-deep text-at-muted hover:bg-at-raised/80 hover:text-at-heading border border-transparent'
                      }`}>
                      {item.startTimeLabel}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className={`space-y-6 transition-opacity ${step >= 4 ? '' : 'opacity-40 pointer-events-none'}`}>
          <div className="flex items-center gap-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-at-raised text-at-heading text-xs font-bold ring-1 ring-at-border/5">04</span>
            <h2 className="text-2xl font-bold text-at-heading tracking-tight">Client Profile</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 w-full min-w-0">
            <div>
              <label className="block text-[9px] font-bold uppercase text-at-muted mb-2 tracking-widest">FULL NAME</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Wick" className="w-full bg-at-deep rounded-[0.8rem] px-4 py-4 text-sm text-at-heading placeholder-at-muted/40 focus:outline-none focus:ring-1 focus:ring-at-accent-light border-0" />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase text-at-muted mb-2 tracking-widest">MOBILE NUMBER</label>
              <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="w-full bg-at-deep rounded-[0.8rem] px-4 py-4 text-sm text-at-heading placeholder-at-muted/40 focus:outline-none focus:ring-1 focus:ring-at-accent-light border-0" />
            </div>
            {requiresOnlinePayment && (
              <div className="sm:col-span-2">
                <label className="block text-[9px] font-bold uppercase text-at-muted mb-2 tracking-widest">EMAIL (Required for Payment)</label>
                <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="hello@example.com" className="w-full bg-at-deep rounded-[0.8rem] px-4 py-4 text-sm text-at-heading placeholder-at-muted/40 focus:outline-none focus:ring-1 focus:ring-at-accent-light border-0" />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-[9px] font-bold uppercase text-at-muted mb-2 tracking-widest">SPECIAL INSTRUCTIONS</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Low skin fade, keep the top long. No beard trimmer." className="w-full bg-at-deep rounded-[0.8rem] px-4 py-4 text-sm text-at-heading placeholder-at-muted/40 focus:outline-none focus:ring-1 focus:ring-at-accent-light resize-none border-0"></textarea>
            </div>
          </div>
          {error ? <p className="text-red-400 text-sm mt-4 font-bold bg-red-500/10 p-4 rounded-lg">{error}</p> : null}
        </div>
      </div>

      {/* RIGHT COLUMN: APPOINTMENT SUMMARY */}
      <div className="lg:sticky lg:top-24 pb-8">
        <div className="bg-at-deep rounded-[1.5rem] p-6 sm:p-8 shadow-2xl ring-1 ring-at-border/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-at-accent-light flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-at-accent-on" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-at-heading tracking-tight">Appointment Summary</h3>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold text-at-muted/50 uppercase tracking-widest mb-1">SERVICE</p>
                <p className="text-sm font-bold text-at-heading truncate">{selectedService ? selectedService.name : '--'}</p>
              </div>
              <span className="text-sm font-bold text-at-accent-light flex-shrink-0 whitespace-nowrap">
                {selectedService ? formatCurrency(selectedService.price_cents) : '--'}
              </span>
            </div>

            <div>
              <p className="text-[9px] font-bold text-at-muted/50 uppercase tracking-widest mb-1">BARBER</p>
              <p className="text-sm font-bold text-at-heading">{selectedStaff ? selectedStaff.name : '--'}</p>
            </div>

            <div>
              <p className="text-[9px] font-bold text-at-muted/50 uppercase tracking-widest mb-1">DATE & TIME</p>
              <p className="text-sm font-bold text-at-heading">{selectedSlot ? `${new Date(selectedSlot.start_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} at ${renderedSlots.find((r) => r.slot.start_at === selectedSlot.start_at)?.startTimeLabel}` : '--'}</p>
            </div>

            <div className="border-t border-at-border/20 pt-6 space-y-3 mt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-at-muted">Subtotal</span>
                <span className="font-bold text-at-heading">{selectedService ? formatCurrency(selectedService.price_cents) : '--'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-at-muted">Booking Fee</span>
                <span className="font-bold text-at-heading">$0.00</span>
              </div>
            </div>

            <div className="flex justify-between items-end pt-4 mb-2">
              <span className="text-lg font-bold text-at-heading">Total</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-at-accent-light">{selectedService ? formatCurrency(selectedService.price_cents) : '--'}</span>
            </div>

            <button
              disabled={!selectedSlot || !customerName || !customerPhone || submitting}
              onClick={submitBooking}
              className="w-full bg-at-accent-light text-at-accent-on font-bold text-sm uppercase tracking-[0.1em] py-5 mt-2 rounded-[1rem] hover:bg-at-accent hover:scale-[1.02] shadow-[0_0_30px_-10px_rgba(var(--at-accent),0.4)] transition-all disabled:opacity-50 disabled:bg-at-border/20 disabled:text-at-muted disabled:hover:scale-100 disabled:shadow-none"
            >
              {submitting ? 'PROCESSING...' : 'CONFIRM APPOINTMENT'}
            </button>

            <p className="text-[8px] font-bold text-at-muted/50 tracking-widest text-center uppercase">
              {supportsOnlinePayment && requiresOnlinePayment ? 'YOU WILL BE REDIRECTED TO PAYMENT.' : 'PAY AT THE SHOP AFTER YOUR SERVICE.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

