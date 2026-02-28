import Link from 'next/link';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Input, Textarea } from '@heroui/input';
import { SHOP_ID } from '@/lib/constants';
import { updateModelInternalNotesAction } from '@/app/admin/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface ModelosAdminPageProps {
  searchParams: Promise<{
    q?: string;
    model_id?: string;
    ok?: string;
    error?: string;
  }>;
}

function formatPreferences(input: unknown): string {
  if (!input || typeof input !== 'object') {
    return 'Sin preferencias';
  }
  const prefs = (input as Record<string, unknown>).preferences;
  if (!Array.isArray(prefs) || prefs.length === 0) {
    return 'Sin preferencias';
  }
  return prefs.map((item) => String(item)).join(', ');
}

export default async function ModelosAdminPage({ searchParams }: ModelosAdminPageProps) {
  const params = await searchParams;
  const q = (params.q || '').trim();
  const selectedId = params.model_id || '';

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('models')
    .select(
      'id, full_name, phone, email, instagram, attributes, notes_internal, marketing_opt_in, created_at',
    )
    .eq('shop_id', SHOP_ID)
    .order('created_at', { ascending: false })
    .limit(150);

  if (q) {
    const safeQ = q.replace(/[,]/g, ' ');
    query = query.or(`full_name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`);
  }

  const { data: models } = await query;
  let selectedModel = (models || []).find((item) => String(item.id) === selectedId) || null;

  if (!selectedModel && selectedId) {
    const { data: fallback } = await supabase
      .from('models')
      .select(
        'id, full_name, phone, email, instagram, attributes, notes_internal, marketing_opt_in, created_at',
      )
      .eq('shop_id', SHOP_ID)
      .eq('id', selectedId)
      .maybeSingle();
    selectedModel = fallback || null;
  }

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Modelos</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.3rem] dark:text-slate-100">
              Base de modelos de practica
            </h1>
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              Busca, revisa datos de contacto y registra notas internas de cada modelo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Registros
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(models || []).length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Busqueda
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {q ? 'Filtrada' : 'General'}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Seleccion
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {selectedModel ? 'Activa' : 'Ninguna'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {params.ok ? <p className="status-banner success">{params.ok}</p> : null}
      {params.error ? <p className="status-banner error">{params.error}</p> : null}

      <form method="get" className="soft-panel flex gap-2 rounded-[1.8rem] border-0 p-4">
        <Input
          name="q"
          label="Buscar modelo"
          labelPlacement="inside"
          defaultValue={q}
          placeholder="Nombre o telefono"
        />
        <Button type="submit" className="action-primary px-5 text-sm font-semibold">
          Buscar
        </Button>
      </form>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="soft-panel rounded-[1.8rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Listado</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {(models || []).map((model) => {
                const href = `/admin/modelos?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  model_id: String(model.id),
                }).toString()}`;
                const active = String(model.id) === selectedId;
                return (
                  <li key={String(model.id)}>
                    <Link
                      href={href}
                      className={`block rounded-2xl px-3 py-2 no-underline transition ${
                        active
                          ? 'bg-slate-950 text-white shadow-[0_18px_28px_-22px_rgba(15,23,42,0.5)] dark:bg-white dark:text-slate-950'
                          : 'bg-white/55 hover:bg-white/82 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <p className="font-medium">{String(model.full_name)}</p>
                      <p className={`text-xs ${active ? 'text-white/80' : 'text-slate/70'}`}>
                        {String(model.phone)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        <Card className="soft-panel rounded-[1.8rem] border-0 shadow-none">
          <CardBody className="p-5">
            {!selectedModel ? (
              <>
                <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
                  Detalle de modelo
                </h3>
                <p className="text-sm text-slate/80 dark:text-slate-300">
                  Selecciona un modelo del listado para ver su ficha.
                </p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
                    {String(selectedModel.full_name)}
                  </h3>
                  {selectedModel.marketing_opt_in ? (
                    <Chip size="sm" radius="full" variant="flat" color="success">
                      Acepta novedades
                    </Chip>
                  ) : null}
                </div>
                <p className="text-sm text-slate/80 dark:text-slate-300">
                  Registrado el {new Date(String(selectedModel.created_at)).toLocaleString('es-UY')}
                </p>

                <dl className="mt-4 grid gap-2 text-sm">
                  <div className="surface-card">
                    <dt className="font-medium text-slate/80">Telefono</dt>
                    <dd>{String(selectedModel.phone)}</dd>
                  </div>
                  <div className="surface-card">
                    <dt className="font-medium text-slate/80">Email</dt>
                    <dd>{String(selectedModel.email || 'No informado')}</dd>
                  </div>
                  <div className="surface-card">
                    <dt className="font-medium text-slate/80">Instagram</dt>
                    <dd>{String(selectedModel.instagram || 'No informado')}</dd>
                  </div>
                  <div className="surface-card">
                    <dt className="font-medium text-slate/80">Preferencias</dt>
                    <dd>{formatPreferences(selectedModel.attributes)}</dd>
                  </div>
                </dl>

                <form action={updateModelInternalNotesAction} className="mt-5 space-y-2">
                  <input type="hidden" name="model_id" value={String(selectedModel.id)} />
                  <Textarea
                    id="notes_internal"
                    name="notes_internal"
                    rows={5}
                    label="Notas internas"
                    labelPlacement="inside"
                    defaultValue={String(selectedModel.notes_internal || '')}
                    placeholder="Comentarios privados para el equipo."
                  />
                  <Button
                    type="submit"
                    variant="flat"
                    color="default"
                    className="action-secondary px-5 text-sm font-semibold"
                  >
                    Guardar notas
                  </Button>
                </form>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
