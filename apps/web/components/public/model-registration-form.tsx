'use client';

import { useMemo, useState } from 'react';
import { modelRegistrationInputSchema } from '@navaja/shared';
import { Button, Input, Select, SelectItem } from '@heroui/react';

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
      <div className="soft-panel rounded-[1.8rem] p-5">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
          Listo, recibimos tu registro
        </h2>
        <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
          Te vamos a contactar por WhatsApp para confirmar disponibilidad.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="soft-panel space-y-5 rounded-[1.9rem] border-0 p-6">
      <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Tu perfil
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
            Completa tu registro
          </h2>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
            Guarda tus datos, tus preferencias y los consentimientos necesarios en una sola vista.
          </p>
        </div>
        <div className="surface-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Contacto
          </p>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
            Si encajas en la sesion, coordinamos por WhatsApp y te pedimos cualquier dato extra.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          id="fullName"
          label="Nombre y apellido"
          labelPlacement="inside"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Ej: Camila Rodriguez"
          required
        />
        <Input
          id="phone"
          label="Telefono"
          labelPlacement="inside"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Ej: +59899111222"
          required
        />
        <Input
          id="email"
          type="email"
          label="Email (opcional)"
          labelPlacement="inside"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
        />
        <Input
          id="instagram"
          label="Instagram (opcional)"
          labelPlacement="inside"
          value={instagram}
          onChange={(event) => setInstagram(event.target.value)}
          placeholder="@usuario"
        />
      </div>

      <Select
        id="sessionId"
        aria-label="Sesion de curso"
        label="Sesion de curso (opcional)"
        labelPlacement="inside"
        selectedKeys={sessionId ? [sessionId] : []}
        disallowEmptySelection={false}
        isClearable
        placeholder="Me anoto para proximas convocatorias"
        onChange={(event) => setSessionId(event.target.value)}
      >
        {sessions.map((session) => (
          <SelectItem key={session.session_id}>{session.label}</SelectItem>
        ))}
      </Select>

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
          Por ahora no pedimos carga de fotos online. Si hace falta, te las vamos a solicitar por
          WhatsApp.
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

      <Button
        type="submit"
        disabled={!canSubmit}
        className="action-primary px-5 text-sm font-semibold"
      >
        {loading ? 'Enviando...' : 'Anotarme como modelo'}
      </Button>
    </form>
  );
}
