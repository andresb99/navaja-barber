import Link from 'next/link';
import { SHOP_ID } from '@/lib/constants';
import { updateModelInternalNotesAction } from '@/app/admin/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
    .select('id, full_name, phone, email, instagram, attributes, notes_internal, marketing_opt_in, created_at')
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
      .select('id, full_name, phone, email, instagram, attributes, notes_internal, marketing_opt_in, created_at')
      .eq('shop_id', SHOP_ID)
      .eq('id', selectedId)
      .maybeSingle();
    selectedModel = fallback || null;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">Modelos de practica</h1>
        <p className="mt-1 text-sm text-slate/80">
          Busca, revisa datos de contacto y registra notas internas de cada modelo.
        </p>
      </div>

      {params.ok ? <p className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{params.ok}</p> : null}
      {params.error ? <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{params.error}</p> : null}

      <form method="get" className="flex gap-2 rounded-xl border border-slate/20 bg-white p-4">
        <Input name="q" defaultValue={q} placeholder="Buscar por nombre o telefono" />
        <Button type="submit">Buscar</Button>
      </form>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardTitle>Listado</CardTitle>
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
                    className={`block rounded-md px-3 py-2 no-underline ${active ? 'bg-ink text-white' : 'bg-slate/5 hover:bg-slate/10'}`}
                  >
                    <p className="font-medium">{String(model.full_name)}</p>
                    <p className={`text-xs ${active ? 'text-white/80' : 'text-slate/70'}`}>{String(model.phone)}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          {!selectedModel ? (
            <>
              <CardTitle>Detalle de modelo</CardTitle>
              <CardDescription>Selecciona un modelo del listado para ver su ficha.</CardDescription>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{String(selectedModel.full_name)}</CardTitle>
                {selectedModel.marketing_opt_in ? <Badge tone="success">Acepta novedades</Badge> : null}
              </div>
              <CardDescription>
                Registrado el {new Date(String(selectedModel.created_at)).toLocaleString('es-UY')}
              </CardDescription>

              <dl className="mt-4 grid gap-2 text-sm">
                <div>
                  <dt className="font-medium text-slate/80">Telefono</dt>
                  <dd>{String(selectedModel.phone)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate/80">Email</dt>
                  <dd>{String(selectedModel.email || 'No informado')}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate/80">Instagram</dt>
                  <dd>{String(selectedModel.instagram || 'No informado')}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate/80">Preferencias</dt>
                  <dd>{formatPreferences(selectedModel.attributes)}</dd>
                </div>
              </dl>

              <form action={updateModelInternalNotesAction} className="mt-5 space-y-2">
                <input type="hidden" name="model_id" value={String(selectedModel.id)} />
                <label htmlFor="notes_internal">Notas internas</label>
                <Textarea
                  id="notes_internal"
                  name="notes_internal"
                  rows={5}
                  defaultValue={String(selectedModel.notes_internal || '')}
                  placeholder="Comentarios privados para el equipo."
                />
                <Button type="submit" variant="secondary">
                  Guardar notas
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}
