'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface SessionInfo {
  id: string;
  dateLabel: string;
  seatsLeft: number;
}

interface MarketplaceEnrollmentModalProps {
  type: 'course' | 'model';
  title: string;
  priceLabel?: string;
  sessions: SessionInfo[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  message?: string | null;
  
  // Initial values for prepopulation
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  preSelectedSessionId?: string | null;
  preferredPaymentMethod?: string | null;
}

export function MarketplaceEnrollmentModal({
  type,
  title,
  priceLabel,
  sessions,
  isOpen,
  onClose,
  onSubmit, 
  isLoading: propLoading = false,
  error: propError = null,
  message: propMessage = null,
  initialName = '',
  initialPhone = '',
  initialEmail = '',
  preSelectedSessionId = null,
  preferredPaymentMethod = null,
}: MarketplaceEnrollmentModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync pre-selected session + initials when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSessionId(preSelectedSessionId || (sessions.length === 1 ? sessions[0]?.id ?? null : null));
      setName(initialName);
      setEmail(initialEmail);
      setPhone(initialPhone);
    }
  }, [isOpen, preSelectedSessionId, sessions, initialName, initialEmail, initialPhone]);

  // Handle ESC and Body Scroll
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
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
      if (!selectedSessionId) return;
      
      await onSubmit({
        name,
        email,
        phone,
        notes,
        sessionId: selectedSessionId,
        consent,
      });
    },
    [selectedSessionId, name, phone, email, notes, consent, onSubmit],
  );

  if (!mounted) return null;

  const isModel = type === 'model';
  const isCourse = type === 'course';

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
            }}
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ 
              type: 'spring',
              damping: 25,
              stiffness: 300,
              opacity: { duration: 0.2 }
            }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 520,
              maxHeight: '85vh',
              overflowY: 'auto',
              borderRadius: '1.5rem',
              background: '#111113',
              boxShadow: '0 25px 70px -15px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            <div className="p-5 sm:p-6 md:p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-[2px] bg-[#a078ff]" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a078ff]">
                      {isModel ? 'Marketplace' : 'Enrollment Open'}
                    </p>
                  </div>
                  <h2 className="font-[family-name:var(--font-heading)] text-3xl font-extrabold text-white tracking-tight">
                    {isModel ? 'Postularme' : 'Reserve Your Station'}
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

              {/* Title Info Card */}
              <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-5 flex items-center justify-between mb-5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#8a8a93] mb-1">
                    {isModel ? 'Convocatoria' : 'Course Title'}
                  </p>
                  <p className="text-base font-bold text-white">{title}</p>
                </div>
                {isCourse && priceLabel && (
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#8a8a93] mb-1">Tuition</p>
                    <p className="text-xl font-black text-[#d0bcff]">{priceLabel}</p>
                  </div>
                )}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    {isModel ? 'Email (Opcional)' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="A.VANCE@PRIVATE.COM"
                    required={isCourse}
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

                {isModel && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a8a93] mb-2">
                      Notas / Comentarios (Opcional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contanos algo más sobre vos o sobre tu cabello..."
                      rows={3}
                      className="w-full rounded-xl bg-white/5 ring-1 ring-white/10 px-5 py-4 text-sm font-medium text-white placeholder:text-[#555] placeholder:text-xs outline-none transition-colors focus:ring-[#a078ff]/50 focus:bg-white/[0.07] resize-none"
                    />
                  </div>
                )}

                {/* Session Selector */}
                {sessions.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a8a93] mb-3">
                      Select Session
                    </label>
                    <div
                      className="max-h-[240px] overflow-y-auto pr-3 custom-scrollbar"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#444 transparent'
                      }}
                    >
                      <style>{`
                        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 20px; }
                      `}</style>
                      <div className="space-y-3 p-1">
                        {sessions.map((session) => {
                          const isSelected = selectedSessionId === session.id;
                          const seatsLabel =
                            session.seatsLeft === 0
                              ? 'SIN CUPOS'
                              : session.seatsLeft <= 3
                                ? `${session.seatsLeft} SPOTS REMAINING`
                                : (isModel ? 'DISPONIBLE' : 'OPEN ENROLLMENT');

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

                {isModel && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setConsent(!consent)}
                      className="flex items-start gap-3 text-left group"
                    >
                      <div className={cn(
                        "mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        consent ? "bg-[#a078ff] border-[#a078ff]" : "border-white/20 bg-white/5 group-hover:border-white/40"
                      )}>
                        {consent && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-[10px] text-[#8a8a93] leading-relaxed">
                        Doy mi consentimiento para que se tomen fotografías y videos durante la sesión con fines académicos o promocionales.
                      </span>
                    </button>
                  </div>
                )}

                {/* Preferred payment */}
                {isCourse && preferredPaymentMethod && (
                  <p className="rounded-xl bg-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8a8a93]">
                    Método guardado: <span className="text-white">{preferredPaymentMethod}</span>
                  </p>
                )}

                {/* Error / Success */}
                {propError && (
                  <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/20 px-4 py-3 text-xs text-red-300">
                    {propError}
                  </div>
                )}
                {propMessage && (
                  <div className="rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 px-4 py-3 text-xs text-emerald-300">
                    {propMessage}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={propLoading || !selectedSessionId}
                  className="w-full rounded-full bg-[#D0BCFF] py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:shadow-[0_0_30px_-5px_rgba(208,188,255,0.4)] hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  {propLoading ? 'Processing...' : (isModel ? 'Confirmar Postulación' : 'Confirm Enrollment')}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
