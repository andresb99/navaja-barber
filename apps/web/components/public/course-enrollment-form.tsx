'use client';

import { useState } from 'react';
import { courseEnrollmentCreateSchema } from '@navaja/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    <form
      onSubmit={onSubmit}
      className="space-y-2 rounded-xl border border-slate/20 bg-white/85 p-4 dark:border-slate-700 dark:bg-slate-900/70"
    >
      <p className="font-medium text-ink dark:text-slate-100">Reservar cupo</p>
      <Input placeholder="Nombre y apellido" value={name} onChange={(event) => setName(event.target.value)} />
      <Input placeholder="Telefono" value={phone} onChange={(event) => setPhone(event.target.value)} />
      <Input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      {error ? <p className="status-banner error text-xs">{error}</p> : null}
      {message ? <p className="status-banner success text-xs">{message}</p> : null}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Enviando...' : 'Anotarme'}
      </Button>
    </form>
  );
}
