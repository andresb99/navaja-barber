'use client';

import { useMemo, useState } from 'react';
import { modelRegistrationInputSchema } from '@navaja/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface SessionOption {
  session_id: string;
  label: string;
}

interface ModelRegistrationFormProps {
  shopId: string;
  sessions: SessionOption[];
  initialSessionId?: string;
}

const preferenceOptions = [
  { value: 'barba', label: 'Barba' },
  { value: 'pelo_largo', label: 'Pelo largo' },
  { value: 'pelo_corto', label: 'Pelo corto' },
  { value: 'rulos', label: 'Rulos' },
  { value: 'coloracion', label: 'Coloracion' },
] as const;

export function ModelRegistrationForm({
  shopId,
  sessions,
  initialSessionId,
}: ModelRegistrationFormProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [sessionId, setSessionId] = useState(initialSessionId || '');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [consentPhotos, setConsentPhotos] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(() => !!fullName && !!phone && !loading, [fullName, phone, loading]);

  function togglePreference(value: string) {
    setPreferences((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const parsed = modelRegistrationInputSchema.safeParse({
      shop_id: shopId,
      session_id: sessionId || undefined,
      full_name: fullName,
      phone,
      email: email || null,
      instagram: instagram || null,
      preferences,
      consent_photos_videos: consentPhotos,
      marketing_opt_in: marketingOptIn,
    });

    if (!parsed.success) {
      setError('Revisa los datos del formulario.');
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
    setSuccess(true);
    setFullName('');
    setPhone('');
    setEmail('');
    setInstagram('');
    setSessionId(initialSessionId || '');
    setPreferences([]);
    setConsentPhotos(false);
    setMarketingOptIn(false);
  }

  if (success) {
    return (
      <div className="status-banner success rounded-xl p-5">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">Listo, recibimos tu registro</h2>
        <p className="mt-2 text-sm">Te vamos a contactar por WhatsApp para confirmar disponibilidad.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="soft-panel space-y-4 rounded-2xl border border-white/45 p-6 dark:border-slate-700">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="fullName">Nombre y apellido</label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Ej: Camila Rodriguez"
            required
          />
        </div>
        <div>
          <label htmlFor="phone">Telefono</label>
          <Input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Ej: +59899111222"
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email (opcional)</label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@email.com"
          />
        </div>
        <div>
          <label htmlFor="instagram">Instagram (opcional)</label>
          <Input
            id="instagram"
            value={instagram}
            onChange={(event) => setInstagram(event.target.value)}
            placeholder="@usuario"
          />
        </div>
      </div>

      <div>
        <label htmlFor="sessionId">Sesion de curso (opcional)</label>
        <Select id="sessionId" value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
          <option value="">Me anoto para proximas convocatorias</option>
          {sessions.map((session) => (
            <option key={session.session_id} value={session.session_id}>
              {session.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate/90">Preferencias (opcional)</p>
        <div className="list-check grid gap-2 sm:grid-cols-2">
          {preferenceOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 rounded-lg border border-slate/20 bg-white/85 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
            >
              <input
                type="checkbox"
                checked={preferences.includes(option.value)}
                onChange={() => togglePreference(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-slate/30 bg-slate/5 p-3 text-sm text-slate/70 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
        <p className="font-medium text-slate/80">Fotos (opcional)</p>
        <p className="mt-1">
          Por ahora no pedimos carga de fotos online. Si hace falta, te las vamos a solicitar por WhatsApp.
        </p>
        {/* TODO: habilitar carga segura de hasta 3 fotos con storage y validacion de ownership */}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={consentPhotos}
            onChange={(event) => setConsentPhotos(event.target.checked)}
          />
          Acepto que me saquen fotos o videos durante la practica.
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(event) => setMarketingOptIn(event.target.checked)}
          />
          Quiero recibir novedades de cursos y convocatorias.
        </label>
      </div>

      {error ? <p className="status-banner error">{error}</p> : null}

      <Button type="submit" disabled={!canSubmit}>
        {loading ? 'Enviando...' : 'Anotarme como modelo'}
      </Button>
    </form>
  );
}
