'use client';

import { useState } from 'react';
import { courseEnrollmentCreateSchema } from '@navaja/shared';
import { Button, Input } from '@heroui/react';

interface CourseEnrollmentFormProps {
  sessionId: string;
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  preferredPaymentMethod?: string | null;
}

export function CourseEnrollmentForm({
  sessionId,
  initialName = '',
  initialPhone = '',
  initialEmail = '',
  preferredPaymentMethod = null,
}: CourseEnrollmentFormProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const parsed = courseEnrollmentCreateSchema.safeParse({
      session_id: sessionId,
      name,
      phone,
      email,
    });

    if (!parsed.success) {
      setError(parsed.error.flatten().formErrors.join(', ') || 'Datos de inscripcion invalidos.');
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
    setMessage('Inscripcion enviada. Te contactamos para confirmar el cupo.');
    setName(initialName);
    setPhone(initialPhone);
    setEmail(initialEmail);
  }

  return (
    <form onSubmit={onSubmit} className="surface-card spotlight-card space-y-4">
      <div className="border-b border-slate-100 pb-4 dark:border-slate-700/50">
        <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-ink dark:text-slate-100">
          Reservar cupo
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Complet&aacute; tus datos para inscribirte.
        </p>
      </div>
      <Input
        label="Nombre y apellido"
        labelPlacement="inside"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <Input
        label="Telefono"
        labelPlacement="inside"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        required
      />
      <Input
        type="email"
        label="Email"
        labelPlacement="inside"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      {preferredPaymentMethod ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          M&eacute;todo guardado: <span className="font-medium text-ink dark:text-slate-200">{preferredPaymentMethod}</span>
        </p>
      ) : null}
      {error ? <p className="status-banner error text-xs">{error}</p> : null}
      {message ? <p className="status-banner success text-xs">{message}</p> : null}
      <Button
        type="submit"
        disabled={loading}
        className="action-primary w-full text-sm font-semibold"
      >
        {loading ? 'Procesando...' : 'Anotarme'}
      </Button>
    </form>
  );
}
