'use client';

import Link from 'next/link';
import { Button } from '@heroui/button';
import { Input, Textarea } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { upsertCourseAction } from '@/app/admin/actions';

interface AdminCourseFormProps {
  shopId: string;
  shopSlug: string;
  initialCourse?: {
    id: string;
    title: string;
    description: string;
    priceCents: number;
    durationHours: number;
    level: string;
    imageUrl: string | null;
    isActive: boolean;
  };
  cancelHref?: string;
}

const courseLevelOptions = ['Inicial', 'Intermedio', 'Avanzado', 'Masterclass'] as const;

const adminSelectClassNames = {
  trigger:
    'min-h-14 rounded-2xl border border-white/8 bg-white/[0.03] shadow-none data-[hover=true]:border-white/12 data-[hover=true]:bg-white/[0.05] data-[focus=true]:border-white/12 data-[focus=true]:bg-white/[0.05] data-[open=true]:border-white/12 data-[open=true]:bg-white/[0.05]',
  label: 'text-[11px] font-semibold text-slate-400',
  value: 'text-sm font-medium text-slate-100',
  selectorIcon: 'text-slate-400',
  popoverContent: 'rounded-2xl border border-white/10 bg-[#091120]/92 p-1',
} as const;

export function AdminCourseForm({ shopId, shopSlug, initialCourse, cancelHref }: AdminCourseFormProps) {
  const isEditing = Boolean(initialCourse);
  const levelOptions = initialCourse?.level && !courseLevelOptions.includes(initialCourse.level as (typeof courseLevelOptions)[number])
    ? [initialCourse.level, ...courseLevelOptions]
    : [...courseLevelOptions];

  return (
    <form action={upsertCourseAction} className="mt-4 grid gap-3" encType="multipart/form-data">
      <input type="hidden" name="shop_id" value={shopId} />
      <input type="hidden" name="shop_slug" value={shopSlug} />
      {isEditing ? <input type="hidden" name="id" value={initialCourse?.id} /> : null}
      <Input
        name="title"
        label="Titulo del curso"
        labelPlacement="inside"
        defaultValue={initialCourse?.title || ''}
        minLength={3}
        required
      />
      <Textarea
        name="description"
        rows={4}
        label="Descripcion"
        labelPlacement="inside"
        description="Resumen breve para el marketplace. Minimo 6 caracteres."
        minLength={6}
        placeholder="Ej: Tecnicas de fade, visagismo y terminacion profesional."
        defaultValue={initialCourse?.description || ''}
        required
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input
          name="price_cents"
          type="number"
          label="Precio (centavos)"
          labelPlacement="inside"
          defaultValue={String(initialCourse?.priceCents ?? '')}
          min={0}
          step={1}
          required
        />
        <Input
          name="duration_hours"
          type="number"
          label="Horas"
          labelPlacement="inside"
          defaultValue={String(initialCourse?.durationHours ?? '')}
          min={1}
          step={1}
          required
        />
        <Select
          name="level"
          aria-label="Nivel del curso"
          label="Nivel"
          labelPlacement="inside"
          classNames={adminSelectClassNames}
          defaultSelectedKeys={[initialCourse?.level || 'Inicial']}
          disallowEmptySelection
          isRequired
        >
          {levelOptions.map((level) => (
            <SelectItem key={level}>{level}</SelectItem>
          ))}
        </Select>
      </div>

      <div className="space-y-2 rounded-2xl border border-white/70 bg-white/65 p-3 shadow-[0_16px_24px_-24px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-white/[0.04]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate/65 dark:text-slate-400">
          Imagen del curso
        </p>
        {initialCourse?.imageUrl ? (
          <div className="overflow-hidden rounded-xl border border-white/60 dark:border-white/10">
            <img
              src={initialCourse.imageUrl}
              alt={`Imagen actual de ${initialCourse.title}`}
              className="h-32 w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}
        <input
          type="file"
          name="image_file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full cursor-pointer rounded-xl border border-white/65 bg-white/85 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:file:bg-white dark:file:text-slate-950"
        />
        <Input
          name="image_url"
          label="URL de imagen (opcional)"
          labelPlacement="inside"
          defaultValue={initialCourse?.imageUrl || ''}
        />
        <p className="text-xs text-slate/70 dark:text-slate-400">
          Si subes un archivo, reemplaza la URL anterior automaticamente.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={initialCourse?.isActive ?? true} /> Activo
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="action-primary w-fit px-5 text-sm font-semibold">
          {isEditing ? 'Guardar cambios' : 'Guardar curso'}
        </Button>
        {isEditing && cancelHref ? (
          <Button as={Link} href={cancelHref} variant="ghost" className="action-secondary w-fit px-5 text-sm font-semibold">
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
