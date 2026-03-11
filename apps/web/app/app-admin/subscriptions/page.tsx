import { requirePlatformAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { setShopSubscriptionForTestingAction } from './actions';
import { Container } from '@/components/heroui/container';

interface ShopRow {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface SubscriptionRow {
  shop_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
}

export default async function AppAdminSubscriptionsPage() {
  await requirePlatformAdmin('/app-admin/subscriptions');

  const admin = createSupabaseAdminClient();
  const [{ data: shops }, { data: subscriptions }] = await Promise.all([
    admin.from('shops').select('id, name, slug, status').order('created_at', { ascending: false }),
    admin.from('subscriptions').select('shop_id, plan, status, current_period_end'),
  ]);

  const subscriptionsByShopId = new Map<string, SubscriptionRow>();
  for (const item of (subscriptions || []) as SubscriptionRow[]) {
    subscriptionsByShopId.set(String(item.shop_id), item);
  }

  return (
    <section className="space-y-6">
      <Container variant="pageHeader" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10">
          <p className="hero-eyebrow">App admin</p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.2rem] dark:text-slate-100">
            Switch de suscripciones para testing
          </h1>
          <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
            Cambia plan/estado por barberia para validar flows de pago, reservas y permisos.
          </p>
        </div>
      </Container>

      <div className="grid gap-4">
        {((shops || []) as ShopRow[]).map((shop) => {
          const subscription = subscriptionsByShopId.get(String(shop.id));
          const currentPlan = String(subscription?.plan || 'free');
          const currentStatus = String(subscription?.status || 'active');
          const periodEnd = subscription?.current_period_end || null;

          return (
            <article key={shop.id} className="soft-panel rounded-[1.8rem] border-0 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-ink dark:text-slate-100">{shop.name}</p>
                  <p className="text-xs text-slate/70 dark:text-slate-400">
                    {shop.slug} - estado tienda: {shop.status}
                  </p>
                </div>
                <p className="text-xs text-slate/70 dark:text-slate-400">
                  Renovacion: {periodEnd ? new Date(periodEnd).toLocaleString('es-UY') : 'N/A'}
                </p>
              </div>

              <form
                action={setShopSubscriptionForTestingAction}
                className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <input type="hidden" name="shop_id" value={shop.id} />
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate/70 dark:text-slate-400">
                  Plan
                  <select
                    name="plan"
                    defaultValue={currentPlan}
                    className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="business">Business</option>
                    <option value="app_admin">App Admin</option>
                  </select>
                </label>

                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate/70 dark:text-slate-400">
                  Estado
                  <select
                    name="status"
                    defaultValue={currentStatus}
                    className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                  >
                    <option value="active">active</option>
                    <option value="trialing">trialing</option>
                    <option value="past_due">past_due</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </label>

                <button
                  type="submit"
                  className="action-primary mt-[1.15rem] inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold"
                >
                  Aplicar
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </section>
  );
}
