'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { centsToCurrencyInput } from '@navaja/shared';
import { Button } from '@heroui/button';
import { Input, Textarea } from '@heroui/input';
import { SelectItem } from '@heroui/select';
import { upsertCourseAction } from '@/app/admin/actions';
import { AdminSelect } from '@/components/heroui/admin-select';

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
    requiresModel: boolean;
    modelCategories: string[];
    isActive: boolean;
  };
  cancelHref?: string;
}

const courseLevelOptions = ['Inicial', 'Intermedio', 'Avanzado', 'Masterclass'] as const;
const defaultModelCategoryOptions = [
  { value: 'Fade', label: 'Fade' },
  { value: 'Degradado', label: 'Degradado' },
  { value: 'Barba', label: 'Barba' },
  { value: 'Corte clasico', label: 'Corte clasico' },
  { value: 'Pelo largo', label: 'Pelo largo' },
  { value: 'Rulos', label: 'Rulos' },
  { value: 'Color', label: 'Color' },
  { value: 'Diseno', label: 'Diseno' },
] as const;

export function AdminCourseForm({
  shopId,
  shopSlug,
  initialCourse,
  cancelHref,
}: AdminCourseFormProps) {
  const isEditing = Boolean(initialCourse);
  const [requiresModel, setRequiresModel] = useState(initialCourse?.requiresModel ?? false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCourse?.modelCategories || [],
  );
  const [customCategory, setCustomCategory] = useState('');
  const levelOptions =
    initialCourse?.level &&
    !courseLevelOptions.includes(initialCourse.level as (typeof courseLevelOptions)[number])
      ? [initialCourse.level, ...courseLevelOptions]
      : [...courseLevelOptions];
  const knownCategoryValues = useMemo<Set<string>>(
    () => new Set(defaultModelCategoryOptions.map((option) => option.value)),
    [],
  );
  const customSelectedCategories = selectedCategories.filter(
    (category) => !knownCategoryValues.has(category),
  );
  const isModelCategoriesValid = !requiresModel || selectedCategories.length > 0;

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  function addCustomCategory() {
    const trimmed = customCategory.trim();
    if (!trimmed) {
      return;
    }

    const dedupeKey = trimmed.toLowerCase();
    const alreadyExists = selectedCategories.some(
      (category) => category.toLowerCase() === dedupeKey,
    );
    if (alreadyExists) {
      setCustomCategory('');
      return;
    }

    setSelectedCategories((current) => [...current, trimmed]);
    setCustomCategory('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!isModelCategoriesValid) {
      event.preventDefault();
    }
  }

  return (
    <form action={upsertCourseAction} onSubmit={handleSubmit} className="mt-4 grid gap-3">
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
          label="Precio (pesos UYU)"
          labelPlacement="inside"
          defaultValue={centsToCurrencyInput(initialCourse?.priceCents)}
          min={0}
          step={0.01}
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
        <AdminSelect
          name="level"
          aria-label="Nivel del curso"
          label="Nivel"
          labelPlacement="inside"
          defaultSelectedKeys={[initialCourse?.level || 'Inicial']}
          disallowEmptySelection
          isRequired
        >
          {levelOptions.map((level) => (
            <SelectItem key={level}>{level}</SelectItem>
          ))}
        </AdminSelect>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/70 bg-white/65 p-3 shadow-[0_16px_24px_-24px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate/65 dark:text-slate-400">
              Convocatoria de modelos
            </p>
            <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
              Si este curso necesita modelos, se abrira automaticamente la ficha al crear sesiones.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/78 px-3 py-1.5 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
            <input
              type="checkbox"
              name="requires_model"
              checked={requiresModel}
              onChange={(event) => setRequiresModel(event.target.checked)}
            />{' '}
            Requiere modelo
          </label>
        </div>

        {requiresModel ? (
          <>
            <div className="flex flex-wrap gap-2">
              {defaultModelCategoryOptions.map((category) => {
                const isActive = selectedCategories.includes(category.value);
                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => toggleCategory(category.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? 'border-cyan-400/65 bg-cyan-500/18 text-cyan-900 dark:border-cyan-300/55 dark:bg-cyan-400/20 dark:text-cyan-100'
                        : 'border-white/65 bg-white/72 text-slate-700 hover:bg-white dark:border-white/12 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Input
                value={customCategory}
                onValueChange={setCustomCategory}
                label="Categoria personalizada"
                labelPlacement="inside"
                placeholder="Ej: Mullet, crop, afeitado completo"
              />
              <Button
                type="button"
                variant="ghost"
                className="action-secondary h-14 px-4 text-sm font-semibold"
                onPress={addCustomCategory}
              >
                Agregar
              </Button>
            </div>

            {customSelectedCategories.length ? (
              <div className="flex flex-wrap gap-2">
                {customSelectedCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="rounded-full border border-amber-400/50 bg-amber-500/18 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-500/28 dark:border-amber-300/45 dark:bg-amber-400/16 dark:text-amber-100"
                  >
                    {category} x
                  </button>
                ))}
              </div>
            ) : null}

            {!isModelCategoriesValid ? (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-300" role="alert">
                Selecciona al menos una categoria para la convocatoria de modelos.
              </p>
            ) : null}

            {selectedCategories.map((category) => (
              <input key={category} type="hidden" name="model_categories" value={category} />
            ))}
          </>
        ) : (
          <p className="text-xs text-slate/70 dark:text-slate-400">
            Este curso no abrira convocatorias de modelos al crear sesiones.
          </p>
        )}
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
        <input type="checkbox" name="is_active" defaultChecked={initialCourse?.isActive ?? true} />{' '}
        Activo
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          className="action-primary w-fit px-5 text-sm font-semibold"
          isDisabled={!isModelCategoriesValid}
        >
          {isEditing ? 'Guardar cambios' : 'Guardar curso'}
        </Button>
        {isEditing && cancelHref ? (
          <Button
            as={Link}
            href={cancelHref}
            variant="ghost"
            className="action-secondary w-fit px-5 text-sm font-semibold"
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
