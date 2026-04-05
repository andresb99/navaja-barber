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
import { ChevronRight, ChevronLeft, Clock, Scissors, User, CalendarDays, CheckCircle2, Star, ShieldCheck, CreditCard, Banknote, Check } from 'lucide-react';
import { cn } from '@/lib/cn';

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

const STEPS = [
  { id: 1, label: 'SERVICES', title: 'SELECT EXPERTISE' },
  { id: 2, label: 'BARBER', title: 'CHOOSE YOUR ARTIST' },
  { id: 3, label: 'DATETIME', title: 'SCHEDULE YOUR RITUAL' },
  { id: 4, label: 'CONFIRM', title: 'FINAL CONFIRMATION' },
] as const;

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

  // State
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
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [acknowledgedPolicy, setAcknowledgedPolicy] = useState(true);

  // Derived Values
  const selectedService = useMemo(() => services.find(s => s.id === serviceId), [serviceId, services]);
  const selectedStaff = useMemo(() => staff.find(s => s.id === staffId), [staffId, staff]);
  const requiresOnlinePayment = supportsOnlinePayment && !payInStore && (selectedService?.price_cents || 0) > 0;

  const currentStepInfo = STEPS[step - 1];

  // Logic: Load Slots
  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }

    const controller = new AbortController();
    setLoadingSlots(true);
    setError(null);
    
    const query = new URLSearchParams({ shop_id: shopId, service_id: serviceId, date });
    if (staffId) query.set('staff_id', staffId);

    console.log('Fetching availability:', query.toString());

    fetch(`/api/availability?${query.toString()}`, { signal: controller.signal })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to fetch availability');
        }
        return res.json();
      })
      .then((payload: { slots: AvailabilitySlot[] }) => {
        console.log('Received slots:', payload.slots?.length || 0);
        setSlots(payload.slots || []);
        if (selectedSlot && !payload.slots.find(s => s.start_at === selectedSlot.start_at)) {
          setSelectedSlot(null);
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Availability fetch error:', err);
        setError('No pudimos cargar los horarios. Intenta con otra fecha.');
        setSlots([]);
      })
      .finally(() => setLoadingSlots(false));

    return () => controller.abort();
  }, [date, serviceId, shopId, staffId]);

  // Logic: Submit
  const submitBooking = async () => {
    if (!selectedSlot || !selectedService) return;

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
      setError(parsed.error.flatten().formErrors.join(', ') || 'Invalid data.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const payload = await res.json();
      if (payload.requires_payment && payload.checkout_url) {
        window.location.assign(payload.checkout_url);
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
    } catch (err) {
      setError('Failed to confirm booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderedSlots = useMemo(() => {
    return slots.map((slot) => ({
      key: `${slot.staff_id}-${slot.start_at}`,
      slot,
      startTimeLabel: new Date(slot.start_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
    }));
  }, [slots]);

  // UI Helpers
  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div id="atelier-booking-flow" className="w-full flex-1 flex flex-col relative overflow-hidden">
      {/* ── STEPPER HEADER ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 sm:gap-14 mb-4 sm:mb-12 shrink-0 pt-2 lg:pt-4">
        {STEPS.map((s, i) => {
          const isCompleted = step > s.id;
          return (
          <div key={s.id} className="flex items-center gap-2 sm:gap-4 group">
            <div 
              onClick={() => isCompleted && setStep(s.id)}
              className={cn("flex items-center gap-2 sm:gap-4 text-left", isCompleted ? "cursor-pointer hover:opacity-75 transition-opacity" : "")}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-[10px] sm:text-xs font-black transition-all duration-500 ring-offset-4 ring-offset-[#131315]",
                step === s.id ? "bg-[#d0bcff] text-[#23005c] ring-2 ring-[#d0bcff]" : 
                isCompleted ? "bg-[#a078ff]/10 text-[#a078ff] ring-1 ring-[#a078ff]/30" : "bg-[#1a181e] text-[#cbc3d7]/30 ring-1 ring-white/5"
              )}>
                {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : i + 1}
              </div>
              <div className="hidden md:block text-left">
                <p className={cn("text-[10px] font-black tracking-[0.2em] uppercase transition-colors", step === s.id ? "text-[#a078ff]" : isCompleted ? "text-[#a078ff]/50" : "text-[#cbc3d7]/20")}>
                  STEP 0{i + 1}
                </p>
                <p className={cn("text-xs font-bold tracking-widest", step === s.id ? "text-white" : "text-[#cbc3d7]/40")}>
                  {s.label}
                </p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="ml-2 sm:ml-12 w-6 sm:w-20 h-[1px] sm:h-[2px] bg-white/5">
                 <div className={cn("h-full bg-[#a078ff] transition-all duration-700", step > s.id ? "w-full" : "w-0")} />
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* ── HEADER CONTENT ────────────────────────────────────────────────── */}
      <div className="text-center mb-3 sm:mb-8 shrink-0">
        <p className="text-[9px] font-black tracking-[0.4em] text-[#a078ff] uppercase mb-1.5 opacity-80">
          STEP 0{step} — {STEPS[step - 1]?.label}
        </p>
        <h2 className="text-[22px] sm:text-5xl font-[family-name:var(--font-heading)] font-bold tracking-tighter text-white leading-none px-4">
          {STEPS[step - 1]?.title.split(' ').map((word: string, i: number, arr: string[]) => 
            i === arr.length - 1 ? <span key={i} className="text-[#d0bcff]">{word}</span> : word + ' '
          )}
        </h2>
        <p className="mt-2 sm:mt-3 px-4 text-[#cbc3d7] max-w-xl mx-auto text-[10px] sm:text-xs leading-relaxed opacity-40">
          {step === 1 && "Refined grooming curated for the modern individual. Choose your transformation."}
          {step === 2 && "Our master barbers are architects of style. Select the specialist who resonates with your vision."}
          {step === 3 && "Select your preferred date and time for the ultimate grooming experience. Our masters are ready."}
          {step === 4 && "Review your selection and provide your contact details to secure your slot in the elite chair."}
        </p>
      </div>

      {/* ── STEP CONTENT ──────────────────────────────────────────────────── */}
      <div className="animate-page-enter flex-1 overflow-hidden pb-8">
        {/* STEP 1: SERVICES */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 max-w-6xl mx-auto px-4 pt-1 sm:pt-4 h-full overflow-y-auto custom-scrollbar pr-4 relative touch-pan-y overscroll-none">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 col-span-full pb-48">
            {services.map((item) => (
              <div
                key={item.id}
                onClick={() => { setServiceId(item.id); setStaffId(''); setSelectedSlot(null); }}
                className={cn(
                  "group relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] bg-[#0a0a0c] p-6 sm:p-8 transition-all duration-200 ease-out cursor-pointer border-2 shadow-xl flex flex-col justify-between min-h-[300px] sm:min-h-[340px]",
                  serviceId === item.id ? "border-[#a078ff] bg-[#111113]" : "border-transparent hover:bg-[#111113] hover:border-white/5"
                )}
              >
                <div className="text-left">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <div className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shrink-0",
                        serviceId === item.id ? "bg-[#a078ff] text-white" : "bg-[#1a181e] text-[#a078ff]"
                      )}>
                        <Scissors className="w-5 h-5" />
                      </div>
                      <span className="text-xl font-black text-white">{formatCurrency(item.price_cents)}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight mb-2 uppercase">{item.name}</h3>
                    <p className="text-sm text-[#cbc3d7] leading-relaxed opacity-60 line-clamp-2">
                      Precision grooming and signature styling session tailored specifically for your profile.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-8">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a181e]/50 border border-white/5 text-[10px] font-black tracking-widest text-[#cbc3d7] uppercase">
                      <Clock className="w-3.5 h-3.5" />
                      {item.duration_minutes} MIN
                    </div>
                    {serviceId === item.id && (
                      <div className="ml-auto w-6 h-6 rounded-full bg-[#d0bcff] flex items-center justify-center shadow-[0_0_15px_rgba(208,188,255,0.4)]">
                        <CheckCircle2 className="w-4 h-4 text-[#23005c]" />
                      </div>
                    )}
                  </div>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* STEP 2: BARBERS */}
        {step === 2 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-8 max-w-5xl mx-auto px-4 pt-2 sm:pt-6 h-full overflow-y-auto custom-scrollbar pr-4 pb-32 sm:pb-40">
            {staff.map((member) => (
              <div key={member.id} onClick={() => setStaffId(member.id)} className="group flex flex-col items-center cursor-pointer">
                <div className="relative mb-3 sm:mb-6 m-2 sm:m-3">
                  <div className={cn(
                    "absolute -inset-2 sm:-inset-3 rounded-full ring-2 ring-offset-[4px] sm:ring-offset-[6px] ring-offset-[#131315] transition-all duration-500",
                    staffId === member.id ? "ring-[#a078ff] opacity-100" : "ring-transparent opacity-0 group-hover:opacity-100 group-hover:ring-white/20"
                  )} />
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-[#111113] ring-1 ring-white/10 shadow-2xl">
                    <img 
                      src={`https://i.pravatar.cc/160?u=${member.id}`} 
                      className={cn("w-full h-full object-cover transition-all duration-700", staffId === member.id ? "grayscale-0 scale-110" : "grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100")} 
                      alt={member.name} 
                    />
                    {staffId === member.id && (
                      <div className="absolute inset-0 bg-[#a078ff]/10" />
                    )}
                  </div>
                  {staffId === member.id && (
                    <div className="absolute bottom-0 right-0 sm:-right-0 sm:-bottom-1 sm:-right-1 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#d0bcff] flex items-center justify-center shadow-lg border-[2px] sm:border-[3px] border-[#131315] z-10 animate-page-enter">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#23005c]" />
                    </div>
                  )}
                </div>
                <h3 className={cn("text-sm sm:text-xl font-bold tracking-tight text-center transition-colors px-1 uppercase", staffId === member.id ? "text-[#d0bcff]" : "text-white group-hover:text-[#a078ff]")}>
                  {member.name}
                </h3>
                <p className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] text-[#cbc3d7]/40 uppercase mt-1 sm:mt-2 text-center w-full truncate px-2">
                   MASTER ARCHITECT
                </p>
              </div>
            ))}
          </div>
        )}

        {/* STEP 3: DATETIME */}
        {step === 3 && (
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 max-w-6xl mx-auto px-4 items-start h-full overflow-y-auto lg:overflow-visible custom-scrollbar pb-32 sm:pb-0">
            <div className="w-full lg:w-[380px] shrink-0 bg-[#0a0a0c] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 shadow-2xl border border-white/5">
              <div className="flex items-center justify-between mb-6 sm:mb-10">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-2 sm:gap-3">
                   <button onClick={() => { 
                     const d = new Date(date + 'T00:00:00'); 
                     d.setMonth(d.getMonth()-1); 
                     d.setDate(1); // Reset to 1st to ensure valid date
                     setDate(d.toISOString().slice(0,10)); 
                   }} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#1a181e] flex items-center justify-center text-white hover:bg-[#111113] transition-all border border-white/10"><ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5"/></button>
                   <button onClick={() => { 
                     const d = new Date(date + 'T00:00:00'); 
                     d.setMonth(d.getMonth()+1); 
                     d.setDate(1); // Reset to 1st
                     setDate(d.toISOString().slice(0,10)); 
                   }} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#1a181e] flex items-center justify-center text-white hover:bg-[#111113] transition-all border border-white/10"><ChevronRight className="w-4 h-4 sm:w-5 sm:h-5"/></button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-y-4 text-center">
                 {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(d => <div key={d} className="text-[10px] font-black text-[#cbc3d7]/30 tracking-widest">{d}</div>)}
                 {(() => {
                   const d = new Date(date + 'T00:00:00');
                   const month = d.getMonth(), year = d.getFullYear();
                   const first = new Date(year, month, 1).getDay();
                   const days = new Date(year, month + 1, 0).getDate();
                   const cells = [];
                   for (let i = 0; i < first; i++) cells.push(<div key={`e-${i}`} />);
                   for (let i = 1; i <= days; i++) {
                     const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
                     const current = date === iso;
                     cells.push(
                       <button 
                         key={i} 
                         onClick={() => setDate(iso)}
                         className={cn(
                           "relative w-10 h-10 mx-auto rounded-xl text-sm font-bold transition-all",
                           current ? "bg-[#d0bcff] text-[#23005c] shadow-[0_0_20px_-5px_rgba(160,120,255,0.5)] scale-110 z-10" : "text-white hover:bg-[#1a181e]"
                         )}
                       >
                         {i}
                       </button>
                     );
                   }
                   return cells;
                 })()}
              </div>
            </div>

            <div className="flex-1 w-full flex flex-col gap-4 sm:gap-6 text-left lg:h-full lg:overflow-y-auto pr-2 sm:pr-4 lg:pb-40 custom-scrollbar">
               <div className="flex items-center gap-4 mb-2 mt-4 lg:mt-0">
                  <span className="text-[10px] font-black tracking-[.3em] text-[#a078ff] uppercase">AVAILABLE TIME SLOTS</span>
                  <div className="h-[1px] flex-1 bg-white/5" />
               </div>
               
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {renderedSlots.map(item => (
                    <button 
                      key={item.key}
                      onClick={() => setSelectedSlot(item.slot)}
                      className={cn(
                        "py-4 sm:py-5 px-4 sm:px-6 rounded-2xl text-xs font-black tracking-widest transition-all uppercase border",
                        selectedSlot?.start_at === item.slot.start_at ? "bg-[#d0bcff] text-[#23005c] border-transparent shadow-lg scale-[1.05]" : "bg-[#0a0a0c] text-[#cbc3d7] border-white/5 hover:border-white/10 hover:bg-[#111113]"
                      )}
                    >
                      {item.startTimeLabel}
                    </button>
                  ))}
               </div>

               {!loadingSlots && slots.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-20 opacity-30 w-full h-full">
                    <CalendarDays className="w-12 h-12 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">No slots available for this date</p>
                 </div>
               )}
               {loadingSlots && (
                 <div className="flex flex-col items-center justify-center py-20 opacity-30 w-full h-full">
                    <div className="w-8 h-8 rounded-full border-2 border-[#a078ff] border-t-transparent animate-spin mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">Searching availability...</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMATION */}
        {step === 4 && (
          <div className="flex flex-col lg:flex-row gap-8 sm:gap-10 max-w-6xl mx-auto px-4 items-start h-full overflow-y-auto custom-scrollbar pb-32 sm:pb-40">
             <div className="flex-1 w-full space-y-6 sm:space-y-10 text-left">
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                   <div className="space-y-3 sm:space-y-4">
                      <label className="text-[10px] font-black tracking-[.2em] text-[#cbc3d7]/50 uppercase ml-4">Full Name</label>
                      <input 
                        value={customerName} 
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="e.g. Julian Sterling"
                        className="w-full bg-[#0a0a0c]/50 border-2 border-white/5 rounded-2xl sm:rounded-[1.5rem] px-5 py-4 sm:px-6 sm:py-5 text-sm sm:text-base text-white placeholder:text-[#cbc3d7]/20 outline-none focus:!border-[#a078ff] focus:!ring-1 focus:!ring-[#a078ff] transition-all"
                      />
                   </div>
                   <div className="space-y-3 sm:space-y-4">
                      <label className="text-[10px] font-black tracking-[.2em] text-[#cbc3d7]/50 uppercase ml-4">Phone Number</label>
                      <input 
                        value={customerPhone} 
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="+598 00 000 000"
                        className="w-full bg-[#0a0a0c]/50 border-2 border-white/5 rounded-2xl sm:rounded-[1.5rem] px-5 py-4 sm:px-6 sm:py-5 text-sm sm:text-base text-white placeholder:text-[#cbc3d7]/20 outline-none focus:!border-[#a078ff] focus:!ring-1 focus:!ring-[#a078ff] transition-all"
                      />
                   </div>
                   <div className="sm:col-span-2 space-y-3 sm:space-y-4">
                      <label className="text-[10px] font-black tracking-[.2em] text-[#cbc3d7]/50 uppercase ml-4">Email Address</label>
                      <input 
                        value={customerEmail} 
                        onChange={e => setCustomerEmail(e.target.value)}
                        placeholder="julian@nocturnal.com"
                        className="w-full bg-[#0a0a0c]/50 border-2 border-white/5 rounded-2xl sm:rounded-[1.5rem] px-5 py-4 sm:px-6 sm:py-5 text-sm sm:text-base text-white placeholder:text-[#cbc3d7]/20 outline-none focus:!border-[#a078ff] focus:!ring-1 focus:!ring-[#a078ff] transition-all"
                      />
                   </div>
                   <div className="sm:col-span-2 space-y-3 sm:space-y-4">
                      <label className="text-[10px] font-black tracking-[.2em] text-[#cbc3d7]/50 uppercase ml-4">Special Notes</label>
                      <textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Any specific requirements for your cut or allergies we should know about?"
                        className="w-full bg-[#0a0a0c]/50 border-2 border-white/5 rounded-2xl sm:rounded-[1.5rem] px-5 py-4 sm:px-6 sm:py-5 text-sm sm:text-base text-white placeholder:text-[#cbc3d7]/20 outline-none focus:!border-[#a078ff] focus:!ring-1 focus:!ring-[#a078ff] transition-all resize-none"
                      />
                   </div>
                   <div className="sm:col-span-2 space-y-4">
                      <div className="flex items-center gap-4 mb-2 mt-4">
                        <span className="text-[10px] font-black tracking-[.3em] text-[#a078ff] uppercase">PAYMENT METHOD</span>
                        <div className="h-[1px] flex-1 bg-white/5" />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div 
                          onClick={() => setPayInStore(false)}
                          className={cn(
                            "relative overflow-hidden rounded-[1.5rem] p-5 border-2 transition-all cursor-pointer group flex items-center gap-4",
                            !payInStore ? "bg-[#a078ff]/10 border-[#a078ff] shadow-[0_0_20px_-5px_rgba(160,120,255,0.3)]" : "bg-[#0a0a0c]/50 border-white/5 hover:bg-[#111113]"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", !payInStore ? "bg-[#a078ff] text-[#23005c]" : "bg-[#1a181e] text-[#cbc3d7]/40")}>
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-black tracking-widest text-[#a078ff] uppercase mb-0.5">Pay Now</p>
                            <p className="text-xs font-bold text-white uppercase">MERCADO PAGO</p>
                          </div>
                        </div>

                        <div 
                          onClick={() => setPayInStore(true)}
                          className={cn(
                            "relative overflow-hidden rounded-[1.5rem] p-5 border-2 transition-all cursor-pointer group flex items-center gap-4",
                            payInStore ? "bg-[#a078ff]/10 border-[#a078ff] shadow-[0_0_20px_-5px_rgba(160,120,255,0.3)]" : "bg-[#0a0a0c]/50 border-white/5 hover:bg-[#111113]"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", payInStore ? "bg-[#a078ff] text-[#23005c]" : "bg-[#1a181e] text-[#cbc3d7]/40")}>
                            <Banknote className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-black tracking-widest text-[#a078ff] uppercase mb-0.5">Pay Later</p>
                            <p className="text-xs font-bold text-white uppercase">IN-STORE</p>
                          </div>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <Checkbox 
                     isSelected={agreedToTerms} 
                     onValueChange={setAgreedToTerms}
                     classNames={{ label: "text-[#cbc3d7] text-xs", wrapper: "after:bg-[#a078ff]" }}
                   >
                     I agree to the <span className="text-[#d0bcff] font-bold">Terms of Service</span> and privacy policy.
                   </Checkbox>
                   <Checkbox 
                     isSelected={acknowledgedPolicy}
                     onValueChange={setAcknowledgedPolicy}
                     classNames={{ label: "text-[#cbc3d7] text-xs", wrapper: "after:bg-[#a078ff]" }}
                   >
                     I acknowledge the <span className="text-[#d0bcff] font-bold">Cancellation Policy</span>.
                   </Checkbox>
                </div>
             </div>

             <div className="w-full lg:w-[420px] shrink-0 sticky top-0 text-left">
                <div className="bg-[#0a0a0c] rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border border-white/5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]">
                   <div className="flex items-center justify-between mb-8 sm:mb-10">
                      <p className="text-[10px] font-black tracking-[.4em] text-[#a078ff] uppercase">BOOKING SUMMARY</p>
                      <ShieldCheck className="w-5 h-5 text-[#a078ff]/30" />
                   </div>
                   
                   <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase mb-2">RECEIPT #{Math.floor(Math.random()*9000)+1000}-ELITE</h3>
                   
                   <div className="space-y-6 sm:space-y-8 mt-6 sm:mt-10">
                      <div className="flex gap-4 sm:gap-5">
                         <div className="w-12 h-12 rounded-xl bg-[#1a181e] flex items-center justify-center shrink-0 border border-white/5"><Scissors className="w-5 h-5 text-[#a078ff]" /></div>
                         <div className="flex-1">
                            <p className="text-[9px] font-black tracking-widest text-[#cbc3d7]/30 uppercase mb-1">SERVICE</p>
                            <p className="text-sm font-bold text-white uppercase">{selectedService?.name}</p>
                         </div>
                         <span className="text-sm font-black text-white">{formatCurrency(selectedService?.price_cents || 0)}</span>
                      </div>
                      <div className="flex gap-5">
                         <div className="w-12 h-12 rounded-xl bg-[#1a181e] flex items-center justify-center shrink-0 border border-white/5 overflow-hidden">
                            <img src={`https://i.pravatar.cc/80?u=${staffId}`} className="w-full h-full object-cover" />
                         </div>
                         <div className="flex-1">
                            <p className="text-[9px] font-black tracking-widest text-[#cbc3d7]/30 uppercase mb-1">ARTIST</p>
                            <p className="text-sm font-bold text-white uppercase">{selectedStaff?.name}</p>
                         </div>
                         <CheckCircle2 className="w-4 h-4 text-[#d0bcff]" />
                      </div>
                      <div className="flex gap-5">
                         <div className="w-12 h-12 rounded-xl bg-[#1a181e] flex items-center justify-center shrink-0 border border-white/5"><CalendarDays className="w-5 h-5 text-[#a078ff]" /></div>
                         <div className="flex-1">
                            <p className="text-[9px] font-black tracking-widest text-[#cbc3d7]/30 uppercase mb-1">SCHEDULE</p>
                            <p className="text-sm font-bold text-white uppercase">
                              {selectedSlot ? new Date(selectedSlot.start_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', ' —') : "No time selected"}
                            </p>
                         </div>
                      </div>
                   </div>

                   <div className="mt-12 pt-10 border-t border-white/10">
                      <div className="flex justify-between items-end">
                         <p className="text-[10px] font-black tracking-[.3em] text-[#cbc3d7]/50 uppercase">TOTAL AMOUNT</p>
                         <span className="text-4xl font-black text-[#d0bcff] tracking-tighter">{formatCurrency(selectedService?.price_cents || 0)}</span>
                      </div>
                      <button 
                        disabled={submitting || !agreedToTerms || !acknowledgedPolicy}
                        onClick={submitBooking}
                        className="w-full mt-10 bg-[#d0bcff] text-[#23005c] py-6 rounded-[1.5rem] font-black tracking-[0.2em] text-xs uppercase shadow-xl hover:bg-[#a078ff] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
                      >
                        {submitting ? "CONFIRMING..." : "CONFIRM BOOKING"}
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* ── PERSISTENT BOTTOM BAR ────────────────────────────────────────── */}
      <div className="fixed bottom-10 sm:bottom-16 left-0 right-0 z-[60] px-4 pointer-events-none">
        <div className="max-w-6xl mx-auto w-full pointer-events-auto">
          <div className="bg-[#0a0a0c]/20 backdrop-blur-xl saturate-200 px-5 py-3 sm:px-8 sm:py-5 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3 sm:gap-4 relative overflow-hidden">
             {/* Subtle reflection overlay for extra "glass" realism */}
             <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-50 pointer-events-none" />
             <div className="flex items-center gap-3 sm:gap-6 min-w-0 text-left relative z-10">
                <div className="min-w-0">
                   <p className="text-[8px] font-black text-[#cbc3d7]/40 tracking-widest uppercase mb-0 sm:mb-0.5">
                     {step === 1 ? 'SELECTION' : step === 2 ? 'SERVICE' : 'ARTIST'}
                   </p>
                   <p className="text-[10px] sm:text-sm font-bold text-white truncate uppercase max-w-[150px] sm:max-w-full">
                     {step === 1 ? (selectedService?.name || '---') : 
                      step === 2 ? (selectedService?.name || '---') : 
                      (selectedStaff?.name || '---')}
                   </p>
                </div>
                {selectedService && (
                  <div className="hidden sm:block shrink-0">
                    <p className="text-[8px] font-black text-[#cbc3d7]/40 tracking-widest uppercase mb-1">INVESTMENT</p>
                    <p className="text-sm font-black text-[#d0bcff]">{formatCurrency(selectedService.price_cents)}</p>
                  </div>
                )}
             </div>

             <div className="flex gap-2 sm:gap-4 shrink-0 items-center">
                <Button 
                   isDisabled={step === 1}
                   onClick={prevStep}
                   className="bg-[#1a181e] text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center min-w-10 p-0 border border-white/10 hover:bg-[#111113]"
                >
                   <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                
                {step < 4 ? (
                   <Button 
                     isDisabled={
                       (step === 1 && !serviceId) || 
                       (step === 2 && !staffId) || 
                       (step === 3 && !selectedSlot)
                     }
                     onClick={nextStep}
                     className="bg-[#d0bcff] text-[#23005c] px-4 sm:px-10 rounded-full font-black tracking-widest text-[9px] sm:text-[10px] uppercase shadow-lg group h-10 sm:h-12"
                   >
                     {step === 1 ? 'CHOOSE BARBER' : step === 2 ? 'SELECT TIME' : 'FINAL DETAILS'}
                     <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform" />
                   </Button>
                ) : (
                   <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-6 hidden sm:flex">
                      <span className="text-[10px] font-black tracking-widest text-[#a078ff] uppercase">READY TO CONFIRM</span>
                      <CheckCircle2 className="w-4 h-4 text-[#a078ff]" />
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .animate-page-enter {
          animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(160, 120, 255, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(160, 120, 255, 0.5);
        }
        
        #atelier-booking-flow input:focus,
        #atelier-booking-flow input:focus-visible,
        #atelier-booking-flow textarea:focus,
        #atelier-booking-flow textarea:focus-visible {
          border-color: #a078ff !important;
          box-shadow: 0 0 0 1px #a078ff !important;
          outline: none !important;
        }
      `}</style>
    </div>
  );
}
