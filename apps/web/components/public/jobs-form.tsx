'use client';

import { useState } from 'react';
import { jobApplicationCreateSchema } from '@navaja/shared';
import { Button, Input, Textarea } from '@heroui/react';

interface JobsFormProps {
  shopId: string;
}

export function JobsForm({ shopId }: JobsFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [experienceYears, setExperienceYears] = useState('1');
  const [availability, setAvailability] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!file) {
      setError('Adjunta tu CV para continuar.');
      return;
    }

    const parsed = jobApplicationCreateSchema.safeParse({
      shop_id: shopId,
      name,
      phone,
      email,
      instagram: instagram || null,
      experience_years: Number(experienceYears),
      availability,
    });

    if (!parsed.success) {
      setError(parsed.error.flatten().formErrors.join(', ') || 'Datos de postulacion invalidos.');
      return;
    }

    const formData = new FormData();
    formData.set('payload', JSON.stringify(parsed.data));
    formData.set('cv', file);

    setLoading(true);
    const response = await fetch('/api/jobs/apply', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      setLoading(false);
      setError(await response.text());
      return;
    }

    setLoading(false);
    setMessage('Postulacion enviada. Nuestro equipo te va a contactar.');
    setName('');
    setPhone('');
    setEmail('');
    setInstagram('');
    setExperienceYears('1');
    setAvailability('');
    setFile(null);
  }

  return (
    <form className="soft-panel space-y-5 rounded-[1.9rem] border-0 p-6" onSubmit={onSubmit}>
      <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Postulacion
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
            Comparte tu perfil
          </h2>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
            Cuanto mas claro sea tu perfil y disponibilidad, mas rapido podremos evaluarte.
          </p>
        </div>
        <div className="surface-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Recomendado
          </p>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
            Adjunta un CV actualizado y agrega tu Instagram si ya publicas trabajos.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          id="name"
          label="Nombre y apellido"
          labelPlacement="inside"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          id="phone"
          label="Telefono"
          labelPlacement="inside"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <Input
          id="email"
          type="email"
          label="Email"
          labelPlacement="inside"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          id="instagram"
          label="Instagram (opcional)"
          labelPlacement="inside"
          value={instagram}
          onChange={(event) => setInstagram(event.target.value)}
        />
        <Input
          id="experience"
          type="number"
          min={0}
          max={60}
          label="Experiencia (anios)"
          labelPlacement="inside"
          value={experienceYears}
          onChange={(event) => setExperienceYears(event.target.value)}
        />
        <Input
          id="cv"
          type="file"
          label="CV (PDF/DOC hasta 5MB)"
          accept=".pdf,.doc,.docx"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <Textarea
          id="availability"
          className="md:col-span-2"
          rows={4}
          label="Disponibilidad"
          labelPlacement="inside"
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
        />
      </div>

      {error ? <p className="status-banner error">{error}</p> : null}
      {message ? <p className="status-banner success">{message}</p> : null}

      <Button
        type="submit"
        disabled={loading}
        className="action-primary px-5 text-sm font-semibold"
      >
        {loading ? 'Enviando...' : 'Enviar postulacion'}
      </Button>
    </form>
  );
}
