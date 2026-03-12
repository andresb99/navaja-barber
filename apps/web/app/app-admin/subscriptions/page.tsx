import { requirePlatformAdmin } from '@/lib/auth';
import { listAppAdminSubscriptions } from '@/lib/app-admin-subscriptions';
import { setShopSubscriptionForTestingAction } from './actions';
import { Button } from '@heroui/button';
import { AdminSelect } from '@/components/heroui/admin-select';
import { Container } from '@/components/heroui/container';

export default async function AppAdminSubscriptionsPage() {
  await requirePlatformAdmin('/app-admin/subscriptions');
  const items = await listAppAdminSubscriptions();

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
        {items.map((item) => {
          const currentPlan = String(item.plan || 'free');
          const currentStatus = String(item.status || 'active');
          const periodEnd = item.currentPeriodEnd || null;

          return (
            <article key={item.shopId} className="soft-panel rounded-[1.8rem] border-0 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-ink dark:text-slate-100">
                    {item.shopName}
                  </p>
                  <p className="text-xs text-slate/70 dark:text-slate-400">
                    {item.shopSlug} - estado tienda: {item.shopStatus}
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
                <input type="hidden" name="shop_id" value={item.shopId} />
                <AdminSelect
                  name="plan"
                  aria-label="Plan de suscripcion"
                  label="Plan"
                  labelPlacement="inside"
                  defaultSelectedKeys={[currentPlan]}
                  disallowEmptySelection
                  options={[
                    { key: 'free', label: 'Free' },
                    { key: 'pro', label: 'Pro' },
                    { key: 'business', label: 'Business' },
                    { key: 'app_admin', label: 'App Admin' },
                  ]}
                />

                <AdminSelect
                  name="status"
                  aria-label="Estado de suscripcion"
                  label="Estado"
                  labelPlacement="inside"
                  defaultSelectedKeys={[currentStatus]}
                  disallowEmptySelection
                  options={[
                    { key: 'active', label: 'active' },
                    { key: 'trialing', label: 'trialing' },
                    { key: 'past_due', label: 'past_due' },
                    { key: 'cancelled', label: 'cancelled' },
                  ]}
                />

                <Button
                  type="submit"
                  className="action-primary mt-[1.15rem] inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold"
                >
                  Aplicar
                </Button>
              </form>
            </article>
          );
        })}
      </div>
    </section>
  );
}
