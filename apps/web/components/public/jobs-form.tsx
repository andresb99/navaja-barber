'use client';

import { useState } from 'react';
import { jobApplicationCreateSchema } from '@navaja/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
    <form className="soft-panel space-y-3 rounded-2xl border border-white/45 p-6 dark:border-slate-700" onSubmit={onSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="name">Nombre y apellido</label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div>
          <label htmlFor="phone">Telefono</label>
          <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div>
          <label htmlFor="instagram">Instagram (opcional)</label>
          <Input id="instagram" value={instagram} onChange={(event) => setInstagram(event.target.value)} />
        </div>
        <div>
          <label htmlFor="experience">Experiencia (anios)</label>
          <Input
            id="experience"
            type="number"
            min={0}
            max={60}
            value={experienceYears}
            onChange={(event) => setExperienceYears(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="cv">CV (PDF/DOC hasta 5MB)</label>
          <Input
            id="cv"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="availability">Disponibilidad</label>
          <Textarea
            id="availability"
            rows={4}
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
          />
        </div>
      </div>

      {error ? <p className="status-banner error">{error}</p> : null}
      {message ? <p className="status-banner success">{message}</p> : null}

      <Button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar postulacion'}
      </Button>
    </form>
  );
}
