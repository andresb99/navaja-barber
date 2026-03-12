'use client';

import { useMemo, useState } from 'react';
import { Button, Input, Select, SelectItem, Textarea } from '@heroui/react';

interface ShopOption {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
}

interface MarketplaceJobsFormProps {
  shops: ShopOption[];
}

const NETWORK_SCOPE = 'network';

export function MarketplaceJobsForm({ shops }: MarketplaceJobsFormProps) {
  const [target, setTarget] = useState<string>(NETWORK_SCOPE);
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

  const selectedTargetLabel = useMemo(() => {
    if (target === NETWORK_SCOPE) {
      return 'Bolsa general del marketplace';
    }

    const shop = shops.find((item) => item.id === target);
    if (!shop) {
      return 'Barberia seleccionada';
    }

    return [shop.name, shop.city || shop.region].filter(Boolean).join(' - ');
  }, [shops, target]);
  const targetOptions = useMemo(
    () => [
      {
        id: NETWORK_SCOPE,
        label: 'Bolsa general del marketplace',
      },
      ...shops.map((shop) => ({
        id: shop.id,
        label: [shop.name, shop.city || shop.region].filter(Boolean).join(' - '),
      })),
    ],
    [shops],
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!file) {
      setError('Adjunta tu CV para continuar.');
      return;
    }

    if (!name.trim() || !phone.trim() || !email.trim() || !availability.trim()) {
      setError('Completa los campos obligatorios antes de enviar.');
      return;
    }

    const payload = {
      ...(target === NETWORK_SCOPE ? {} : { shop_id: target }),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      instagram: instagram.trim() || null,
      experience_years: Number(experienceYears),
      availability: availability.trim(),
    };

    const formData = new FormData();
    formData.set('payload', JSON.stringify(payload));
    formData.set('cv', file);

    setLoading(true);
    const response = await fetch(
      (target === NETWORK_SCOPE ? '/api/jobs/network' : '/api/jobs/apply') as string,
      {
        method: 'POST',
        body: formData,
      },
    );

    if (!response.ok) {
      setLoading(false);
      setError(await response.text());
      return;
    }

    setLoading(false);
    setMessage(
      target === NETWORK_SCOPE
        ? 'Tu CV ya esta en la bolsa general del marketplace.'
        : 'Postulacion enviada a la barberia seleccionada.',
    );
    setName('');
    setPhone('');
    setEmail('');
    setInstagram('');
    setExperienceYears('1');
    setAvailability('');
    setFile(null);
    setTarget(NETWORK_SCOPE);
  }

  return (
    <form className="soft-panel space-y-5 rounded-[1.9rem] border-0 p-4 sm:p-6" onSubmit={onSubmit}>
      <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Empleo marketplace
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
            Postulate una vez o apunta a una barberia especifica
          </h2>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
            Puedes dejar tu CV en la bolsa general o enviarlo directo a una barberia activa.
          </p>
        </div>

        <div className="surface-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Destino actual
          </p>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{selectedTargetLabel}</p>
        </div>
      </div>

      <Select
        id="job-target"
        aria-label="Destino de la postulacion"
        label="Enviar mi CV a"
        labelPlacement="inside"
        selectedKeys={target ? [target] : []}
        onChange={(event) => setTarget(event.target.value)}
      >
        {targetOptions.map((option) => (
          <SelectItem key={option.id}>{option.label}</SelectItem>
        ))}
      </Select>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          id="name"
          label="Nombre y apellido"
          labelPlacement="inside"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input
          id="phone"
          label="Telefono"
          labelPlacement="inside"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
        />
        <Input
          id="email"
          type="email"
          label="Email"
          labelPlacement="inside"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
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
          required
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
          required
        />
      </div>

      {error ? <p className="status-banner error">{error}</p> : null}
      {message ? <p className="status-banner success">{message}</p> : null}

      <Button
        type="submit"
        disabled={loading}
        className="action-primary w-full justify-center px-5 text-sm font-semibold sm:w-auto"
      >
        {loading ? 'Enviando...' : 'Enviar postulacion'}
      </Button>
    </form>
  );
}
