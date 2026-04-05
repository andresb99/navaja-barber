'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { modelRegistrationInputSchema } from '@navaja/shared';
import { Button, Input, Checkbox, CheckboxGroup } from '@heroui/react';

interface SessionInfo {
  id: string;
  dateLabel: string;
  seatsLeft: number;
}

interface ModelEnrollmentModalProps {
  courseTitle: string;
  sessions: SessionInfo[];
  shopId: string;
  isOpen: boolean;
  onClose: () => void;
}

const preferenceOptions = [
  { value: 'barba', label: 'Barba' },
  { value: 'pelo_largo', label: 'Pelo largo' },
  { value: 'pelo_corto', label: 'Pelo corto' },
  { value: 'rulos', label: 'Rulos' },
  { value: 'coloracion', label: 'Coloración' },
] as const;

export function ModelEnrollmentModal({
  courseTitle,
  sessions,
  shopId,
  isOpen,
  onClose,
}: ModelEnrollmentModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [consentPhotos, setConsentPhotos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedSessionId(sessions.length === 1 ? sessions[0]?.id ?? null : null);
      setError(null);
      setMessage(null);
    }
  }, [isOpen, sessions]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
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

      const parsed = modelRegistrationInputSchema.safeParse({
        shop_id: shopId,
        session_id: selectedSessionId,
        full_name: fullName,
        phone,
        email: email || null,
        instagram: instagram || null,
        preferences,
        consent_photos_videos: consentPhotos,
        marketing_opt_in: false,
      });

      if (!parsed.success) {
        setError('Por favor, revisa los datos del formulario.');
        return;
      }

      setLoading(true);
      const response = await fetch('/api/modelos/registro', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        setLoading(false);
        setError(await response.text());
        return;
      }

      setLoading(false);
      setMessage('¡Postulación enviada! Te contactaremos por WhatsApp si encajas en la sesión.');
      setTimeout(() => {
        onClose();
        setFullName('');
        setPhone('');
        setEmail('');
        setInstagram('');
        setPreferences([]);
        setConsentPhotos(false);
      }, 2500);
    },
    [selectedSessionId, fullName, phone, email, instagram, preferences, consentPhotos, shopId, onClose],
  );

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      <style>{`
        @keyframes model-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes model-rise {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <div
          onClick={onClose}
          className="absolute inset-0 bg-at-deep/90 backdrop-blur-sm animate-[model-fade_0.2s_ease-out_both]"
        />

        <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] bg-at-deep ring-1 ring-at-border/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] animate-[model-rise_0.3s_ease-out_both] custom-scrollbar">
          <div className="p-8 sm:p-12">
            {/* Header */}
            <div className="flex items-start justify-between mb-10">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-[2px] bg-at-accent-light" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-at-accent-light">
                    MODEL CASTING
                  </p>
                </div>
                <h2 className="font-[family-name:var(--font-heading)] text-4xl font-extrabold text-at-heading tracking-tight leading-none">
                  Postularme
                </h2>
                <p className="mt-4 text-at-muted text-sm font-medium">
                  Completa tus datos para la sesión de <span className="text-at-heading font-bold">{courseTitle}</span>.
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-at-border/5 text-at-muted transition-all hover:bg-at-border/10 hover:text-at-heading"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Nombre Completo"
                  variant="flat"
                  placeholder="Ej: ALEJANDRO VANCE"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  classNames={{
                    inputWrapper: 'bg-at-surface/50 border-at-border/10 group-data-[focus=true]:border-at-accent-light/50',
                    label: 'text-at-muted font-bold uppercase tracking-widest text-[9px]',
                  }}
                />
                <Input
                  label="WhatsApp / Celular"
                  variant="flat"
                  placeholder="+598 99 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  classNames={{
                    inputWrapper: 'bg-at-surface/50 border-at-border/10 group-data-[focus=true]:border-at-accent-light/50',
                    label: 'text-at-muted font-bold uppercase tracking-widest text-[9px]',
                  }}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Email (Opcional)"
                  variant="flat"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  classNames={{
                    inputWrapper: 'bg-at-surface/50 border-at-border/10 group-data-[focus=true]:border-at-accent-light/50',
                    label: 'text-at-muted font-bold uppercase tracking-widest text-[9px]',
                  }}
                />
                <Input
                  label="Instagram (Opcional)"
                  variant="flat"
                  placeholder="@usuario"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  classNames={{
                    inputWrapper: 'bg-at-surface/50 border-at-border/10 group-data-[focus=true]:border-at-accent-light/50',
                    label: 'text-at-muted font-bold uppercase tracking-widest text-[9px]',
                  }}
                />
              </div>

              {/* Sessions Drawer style selectable list */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-at-accent mb-4">
                  Seleccionar Sesión / Fecha
                </p>
                <div className="grid gap-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {sessions.map((session) => {
                    const isSelected = selectedSessionId === session.id;
                    return (
                      <button
                        type="button"
                        key={session.id}
                        onClick={() => setSelectedSessionId(session.id)}
                        className={`w-full flex items-center justify-between rounded-2xl px-6 py-5 text-left border transition-all ${
                          isSelected
                            ? 'bg-at-accent-light/10 border-at-accent-light ring-1 ring-at-accent-light/20'
                            : 'bg-at-surface/30 border-at-border/5 hover:bg-at-surface/50 hover:border-at-border/20'
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-bold tracking-tight ${isSelected ? 'text-at-heading' : 'text-at-muted'}`}>
                            {session.dateLabel}
                          </p>
                          <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isSelected ? 'text-at-accent-light' : 'text-at-muted/50'}`}>
                            {session.seatsLeft > 0 ? `CUPOS DISPONIBLES` : 'SIN CUPOS'}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-at-accent-light' : 'border-at-border/20'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-at-accent-light" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preferences */}
              <CheckboxGroup
                label="Preferencias de Cabello / Barba"
                value={preferences}
                onChange={(vals) => setPreferences(vals as string[])}
                classNames={{
                  label: 'text-at-muted font-bold uppercase tracking-widest text-[10px] mb-4 outline-none',
                }}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {preferenceOptions.map((option) => (
                    <Checkbox
                      key={option.value}
                      value={option.value}
                      classNames={{
                        wrapper: 'before:border-at-border/20 group-data-[selected=true]:after:bg-at-accent-light',
                        label: 'text-xs text-at-muted font-medium',
                      }}
                    >
                      {option.label}
                    </Checkbox>
                  ))}
                </div>
              </CheckboxGroup>

              {/* Consent */}
              <div className="bg-at-raised/50 rounded-2xl p-5 border border-at-border/5">
                <Checkbox
                  isSelected={consentPhotos}
                  onValueChange={setConsentPhotos}
                  classNames={{
                    wrapper: 'before:border-at-border/20 group-data-[selected=true]:after:bg-at-accent-light',
                    label: 'text-xs text-at-muted font-medium leading-relaxed',
                  }}
                >
                  Doy mi consentimiento para que se tomen fotografías y videos durante la sesión con fines académicos o promocionales.
                </Checkbox>
              </div>

              {/* Status */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-xs font-bold text-red-400 uppercase tracking-widest text-center">
                  {error}
                </div>
              )}
              {message && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-xs font-bold text-emerald-400 uppercase tracking-widest text-center">
                  {message}
                </div>
              )}

              {/* Action */}
              <Button
                type="submit"
                isLoading={loading}
                disabled={!selectedSessionId || !fullName || !phone}
                className="w-full h-16 bg-at-accent-light !text-white font-black tracking-[0.2em] text-xs uppercase rounded-2xl shadow-[0_10px_30px_-10px_rgba(var(--at-accent-light),0.5)] hover:scale-[1.01] transition-all disabled:opacity-30"
              >
                CONFIRMAR POSTULACIÓN
              </Button>

              <p className="text-center text-[9px] font-bold uppercase tracking-[0.3em] text-at-muted/50">
                Atelier Casting System • Professional Models Only
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
