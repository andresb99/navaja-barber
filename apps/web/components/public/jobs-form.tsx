'use client';

import { useState, useRef } from 'react';
import { jobApplicationCreateSchema } from '@navaja/shared';
import { Button, Input, Select, SelectItem } from '@heroui/react';
import { UploadCloud } from 'lucide-react';

interface JobsFormProps {
  shopId: string;
}

export function JobsForm({ shopId }: JobsFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [experienceYears, setExperienceYears] = useState('1');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      availability: 'Full-Time', // default to Full-Time since it was removed
    });

    if (!parsed.success) {
      setError(parsed.error.flatten().formErrors.join(', ') || 'Datos de postulación inválidos.');
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
    setMessage('Tu postulación ha sido enviada exitosamente.');
    setName('');
    setPhone('');
    setEmail('');
    setInstagram('');
    setExperienceYears('1');
    setFile(null);
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Custom classNames for dark minimal inputs in the new design
  const inputClassNames = {
    label: "text-[10px] font-black uppercase tracking-[0.15em] text-at-heading mb-1.5 !opacity-100",
    inputWrapper: "bg-[#111113] border-none data-[hover=true]:bg-[#161619] group-data-[focus=true]:bg-[#161619] shadow-none rounded-xl h-14",
    input: "text-white text-sm font-medium placeholder:text-at-muted/30",
  };

  return (
    <form className="flex flex-col gap-y-7" onSubmit={onSubmit}>
      <Input
        labelPlacement="outside"
        id="name"
        label="Nombre y Apellido"
        placeholder="Ej. Julian Moreno"
        classNames={inputClassNames}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          labelPlacement="outside"
          id="phone"
          label="Teléfono"
          placeholder="+34 000 000 000"
          classNames={inputClassNames}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <Input
          labelPlacement="outside"
          id="email"
          type="email"
          label="Email"
          placeholder="julian@beardly.com"
          classNames={inputClassNames}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <Input
        labelPlacement="outside"
        id="instagram"
        label="Instagram / Portfolio"
        placeholder="@tu_usuario_art"
        classNames={inputClassNames}
        value={instagram}
        onChange={(event) => setInstagram(event.target.value)}
      />

      <Select
        labelPlacement="outside"
        id="experience"
        label="Experiencia"
        classNames={{
          label: inputClassNames.label,
          trigger: inputClassNames.inputWrapper,
          value: inputClassNames.input,
          popoverContent: "bg-[#161619] border border-white/5",
        }}
        defaultSelectedKeys={['1']}
        value={experienceYears}
        onChange={(event) => setExperienceYears(event.target.value)}
      >
        <SelectItem key="0">Menos de 1 año</SelectItem>
        <SelectItem key="1">1 año</SelectItem>
        <SelectItem key="2">2 años</SelectItem>
        <SelectItem key="3">3 años</SelectItem>
        <SelectItem key="5">5+ años</SelectItem>
      </Select>

      {/* CV Upload Dropzone */}
      <div className="space-y-3">
        <label className={inputClassNames.label + " block"}>Adjuntar CV (PDF)</label>
        <div 
          className="border-2 border-dashed border-white/10 rounded-2xl bg-[#0c0c0e]/30 p-8 text-center cursor-pointer hover:border-at-accent-light/30 hover:bg-[#111113] transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <UploadCloud className="w-5 h-5 text-[#a078ff] mx-auto mb-3" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-at-muted">
            {file ? file.name : "Arrastra tu archivo o haz clic"}
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => setFile(e.target.files?.[0] || null)} 
            className="hidden" 
            accept=".pdf,.doc,.docx"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm font-semibold text-center">{error}</p>}
      {message && <p className="text-green-400 text-sm font-semibold text-center">{message}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-14 bg-at-accent-light text-at-accent-on text-sm font-bold tracking-widest uppercase rounded-2xl border-none shadow-[0_0_20px_rgba(var(--at-accent),0.3)] hover:shadow-[0_0_30px_rgba(var(--at-accent),0.5)] transition-all"
      >
        {loading ? 'Enviando...' : 'Enviar Postulación'}
      </Button>
    </form>
  );
}
