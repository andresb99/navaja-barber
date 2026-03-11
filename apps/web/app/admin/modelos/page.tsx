import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Input, Textarea } from '@heroui/input';
import { requireAdmin } from '@/lib/auth';
import { updateModelInternalNotesAction } from '@/app/admin/actions';
import { AdminModelsViewSwitcher } from '@/components/admin/models-view-switcher';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildAdminHref } from '@/lib/workspace-routes';
import { Container } from '@/components/heroui/container';

interface ModelosAdminPageProps {
  searchParams: Promise<{
    q?: string;
    view?: string;
    model_id?: string;
    ok?: string;
    error?: string;
    shop?: string;
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
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const q = (params.q || '').trim();
  const viewMode = params.view === 'cards' ? 'cards' : 'table';
  const selectedId = params.model_id || '';

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('models')
    .select(
      'id, full_name, phone, email, instagram, attributes, notes_internal, marketing_opt_in, created_at',
    )
    .eq('shop_id', ctx.shopId)
    .order('created_at', { ascending: false })
    .limit(150);

  if (q) {
    const safeQ = q.replace(/[,]/g, ' ');
    query = query.or(`full_name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`);
  }

  const { data: models } = await query;
  const modelRows = (models || []).map((model) => ({
    id: String(model.id),
    fullName: String(model.full_name || 'Sin nombre'),
    phone: String(model.phone || 'Sin telefono'),
    email: String(model.email || 'No informado'),
    instagram: String(model.instagram || 'Sin instagram'),
    preferences: formatPreferences(model.attributes),
    notesInternal: String(model.notes_internal || 'Sin notas'),
    marketingOptIn: Boolean(model.marketing_opt_in),
    createdAtLabel: new Date(String(model.created_at)).toLocaleString('es-UY'),
    href: buildAdminHref('/admin/modelos', ctx.shopSlug, {
      ...(q ? { q } : {}),
      ...(viewMode === 'cards' ? { view: 'cards' } : {}),
      model_id: String(model.id),
    }),
    isSelected: String(model.id) === selectedId,
  }));

  let selectedModel = (models || []).find((item) => String(item.id) === selectedId) || null;

  if (!selectedModel && selectedId) {
    const { data: fallback } = await supabase
      .from('models')
      .select(
        'id, full_name, phone, email, instagram, attributes, notes_internal, marketing_opt_in, created_at',
      )
      .eq('shop_id', ctx.shopId)
      .eq('id', selectedId)
      .maybeSingle();
    selectedModel = fallback || null;
  }

  return (
    <section className="space-y-6">
      <Container variant="pageHeader" className="px-6 py-7 md:px-8 md:py-9">
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
      </Container>

      {params.ok ? <p className="status-banner success">{params.ok}</p> : null}
      {params.error ? <p className="status-banner error">{params.error}</p> : null}

      <form method="get" className="soft-panel flex gap-2 rounded-[1.8rem] border-0 p-4">
        <input type="hidden" name="shop" value={ctx.shopSlug} />
        {viewMode === 'cards' ? <input type="hidden" name="view" value="cards" /> : null}
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

      <AdminModelsViewSwitcher rows={modelRows} initialView={viewMode} />

      <Card className="soft-panel rounded-[1.8rem] border-0 shadow-none">
        <CardBody className="p-5">
          {!selectedModel ? (
            <>
              <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
                Detalle de modelo
              </h3>
              <p className="text-sm text-slate/80 dark:text-slate-300">
                Usa la columna Acciones y presiona Ver ficha para editar notas internas.
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

              <dl className="mt-4 grid gap-2 text-sm md:grid-cols-2">
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
                <input type="hidden" name="shop_id" value={ctx.shopId} />
                <input type="hidden" name="shop_slug" value={ctx.shopSlug} />
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
    </section>
  );
}
