'use client';

import { useState } from 'react';
import { courseEnrollmentCreateSchema } from '@navaja/shared';
import { Button, Input } from '@heroui/react';

export function CourseEnrollmentForm({ sessionId }: { sessionId: string }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
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

    setLoading(false);
    setMessage('Inscripcion enviada. Te contactamos para confirmar el cupo.');
    setName('');
    setPhone('');
    setEmail('');
  }

  return (
    <form onSubmit={onSubmit} className="surface-card spotlight-card space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
          Inscripcion
        </p>
        <p className="mt-2 font-medium text-ink dark:text-slate-100">Reservar cupo</p>
      </div>
      <Input
        label="Nombre y apellido"
        labelPlacement="inside"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        label="Telefono"
        labelPlacement="inside"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
      />
      <Input
        type="email"
        label="Email"
        labelPlacement="inside"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {error ? <p className="status-banner error text-xs">{error}</p> : null}
      {message ? <p className="status-banner success text-xs">{message}</p> : null}
      <Button
        type="submit"
        disabled={loading}
        className="action-primary w-full text-sm font-semibold"
      >
        {loading ? 'Enviando...' : 'Anotarme'}
      </Button>
    </form>
  );
}
