'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { courseEnrollmentCreateSchema } from '@navaja/shared';

interface SessionInfo {
  id: string;
  dateLabel: string;
  seatsLeft: number;
}

interface CourseEnrollmentModalProps {
  courseTitle: string;
  priceLabel: string;
  sessions: SessionInfo[];
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  preferredPaymentMethod?: string | null;
  isOpen: boolean;
  preSelectedSessionId?: string | null;
  onClose: () => void;
}

export function CourseEnrollmentModal({
  courseTitle,
  priceLabel,
  sessions,
  initialName = '',
  initialPhone = '',
  initialEmail = '',
  preferredPaymentMethod = null,
  isOpen,
  preSelectedSessionId = null,
  onClose,
}: CourseEnrollmentModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync pre-selected session when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSessionId(preSelectedSessionId || (sessions.length === 1 ? sessions[0]?.id ?? null : null));
      setError(null);
      setMessage(null);
    }
  }, [isOpen, preSelectedSessionId, sessions]);

  // Close on Escape + lock body scroll
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setMessage(null);

      if (!selectedSessionId) {
        setError('Seleccioná una sesión para continuar.');
        return;
      }

      const parsed = courseEnrollmentCreateSchema.safeParse({
        session_id: selectedSessionId,
        name,
        phone,
        email,
      });

      if (!parsed.success) {
        setError(
          parsed.error.flatten().formErrors.join(', ') || 'Datos de inscripción inválidos.',
        );
        return;
      }

      setLoading(true);
      const response = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        setLoading(false);
        setError(await response.text());
        return;
      }

      const payload = (await response.json()) as {
        enrollment_id?: string;
        requires_payment?: boolean;
        payment_intent_id?: string;
        checkout_url?: string;
      };

      if (payload.requires_payment && payload.checkout_url) {
        window.location.assign(payload.checkout_url);
        return;
      }

      setLoading(false);
      setMessage('Inscripción enviada. Te contactamos para confirmar el cupo.');
    },
    [selectedSessionId, name, phone, email],
  );

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      <style>{`
        @keyframes enroll-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes enroll-rise {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Full-screen overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* Backdrop — no blur for performance */}
        <div
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            animation: 'enroll-fade 0.2s ease-out both',
          }}
        />

        {/* Modal panel */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 520,
            maxHeight: '85vh',
            overflowY: 'auto',
            borderRadius: '1.5rem',
            background: '#111113',
            boxShadow: '0 25px 70px -15px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)',
            animation: 'enroll-rise 0.25s ease-out both',
          }}
        >
          <div className="p-5 sm:p-8 md:p-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-[2px] bg-[#a078ff]" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a078ff]">
                    Enrollment Open
                  </p>
                </div>
                <h2 className="font-[family-name:var(--font-heading)] text-3xl font-extrabold text-white tracking-tight">
                  Reserve Your Station
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#8a8a93] transition-colors hover:bg-white/5 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Course Info Card */}
            <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-5 flex items-center justify-between mb-8">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#8a8a93] mb-1">Course Title</p>
                <p className="text-base font-bold text-white">{courseTitle}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#8a8a93] mb-1">Tuition</p>
                <p className="text-xl font-black text-[#d0bcff]">{priceLabel}</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a8a93] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ALEXANDER VANCE"
                  required
                  className="w-full rounded-xl bg-white/5 ring-1 ring-white/10 px-5 py-4 text-sm font-medium text-white placeholder:text-[#555] placeholder:text-xs placeholder:uppercase placeholder:tracking-widest outline-none transition-colors focus:ring-[#a078ff]/50 focus:bg-white/[0.07]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a8a93] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="A.VANCE@PRIVATE.COM"
                  required
                  className="w-full rounded-xl bg-white/5 ring-1 ring-white/10 px-5 py-4 text-sm font-medium text-white placeholder:text-[#555] placeholder:text-xs placeholder:uppercase placeholder:tracking-widest outline-none transition-colors focus:ring-[#a078ff]/50 focus:bg-white/[0.07]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a8a93] mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+598 99 123 456"
                  required
                  className="w-full rounded-xl bg-white/5 ring-1 ring-white/10 px-5 py-4 text-sm font-medium text-white placeholder:text-[#555] placeholder:text-xs placeholder:uppercase placeholder:tracking-widest outline-none transition-colors focus:ring-[#a078ff]/50 focus:bg-white/[0.07]"
                />
              </div>

              {/* Session Selector */}
              {sessions.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a8a93] mb-3">
                    Select Session
                  </label>
                  <div
                    className="max-h-[340px] overflow-y-auto pr-3 custom-scrollbar"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#444 transparent'
                    }}
                  >
                    <style>{`
                      .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                      }
                      .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                      }
                      .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #444;
                        border-radius: 20px;
                      }
                      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #555;
                      }
                    `}</style>
                    <div className="space-y-3 p-1">
                      {sessions.map((session) => {
                        const isSelected = selectedSessionId === session.id;
                        const seatsLabel =
                          session.seatsLeft === 0
                            ? 'SIN CUPOS'
                            : session.seatsLeft <= 3
                              ? `${session.seatsLeft} SPOTS REMAINING`
                              : 'OPEN ENROLLMENT';

                        return (
                          <button
                            type="button"
                            key={session.id}
                            onClick={() => setSelectedSessionId(session.id)}
                            disabled={session.seatsLeft === 0}
                            className={`w-full flex items-center justify-between rounded-xl px-5 py-4 text-left transition-colors ring-1 ${isSelected
                                ? 'ring-[#a078ff] bg-[#a078ff]/10'
                                : 'ring-white/10 bg-white/5 hover:ring-white/20 hover:bg-white/[0.07]'
                              } ${session.seatsLeft === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            <div>
                              <p className={`text-sm font-bold tracking-tight ${isSelected ? 'text-white' : 'text-[#cbc3d7]'}`}>
                                {session.dateLabel}
                              </p>
                              <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isSelected ? 'text-[#a078ff]' : 'text-[#8a8a93]'}`}>
                                {seatsLabel}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-[#a078ff]' : 'border-white/20'
                              }`}>
                              {isSelected && (
                                <div className="w-2.5 h-2.5 rounded-full bg-[#a078ff]" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Preferred payment */}
              {preferredPaymentMethod && (
                <p className="rounded-xl bg-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8a8a93]">
                  Método guardado: <span className="text-white">{preferredPaymentMethod}</span>
                </p>
              )}

              {/* Error / Success */}
              {error && (
                <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/20 px-4 py-3 text-xs text-red-300">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 px-4 py-3 text-xs text-emerald-300">
                  {message}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !selectedSessionId}
                className="w-full rounded-full bg-gradient-to-r from-[#a078ff] to-[#d0bcff] py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#23005c] transition-all hover:shadow-[0_0_40px_-10px_rgba(160,120,255,0.5)] hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                {loading ? 'Processing...' : 'Confirm Enrollment'}
              </button>

              {/* Footer text */}
              <p className="text-center text-[9px] font-bold uppercase tracking-widest text-[#555] leading-relaxed">
                Secure checkout powered by Nocturnal Elite Payments.<br />
                Your station is held for 15 minutes.
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
