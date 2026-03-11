import Link from 'next/link';
import { Button } from '@heroui/button';
import { Clock3, CreditCard, ShieldCheck } from 'lucide-react';
import type { ShopPaymentAccountSummary } from '@/lib/shop-payment-accounts.server';

interface MercadoPagoSettingsPanelProps {
  shopSlug: string;
  account: ShopPaymentAccountSummary | null;
  timeZone: string;
  message: { text: string; tone: 'success' | 'warning' | 'error' } | null;
}

const secondaryCardClassName = 'admin-premium-subcard rounded-[1.25rem] p-4';

function formatDate(value: string | null | undefined, timeZone: string) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return 'Sin fecha';
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sin fecha';
  }

  return parsed.toLocaleString('es-UY', { timeZone });
}

export function MercadoPagoSettingsPanel({
  shopSlug,
  account,
  timeZone,
  message,
}: MercadoPagoSettingsPanelProps) {
  const isConnected = Boolean(account?.isActive && account?.status === 'connected');

  return (
    <div className="space-y-5">
      {message ? <div className={`status-banner ${message.tone}`}>{message.text}</div> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="surface-card rounded-[1.35rem] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-white/65 bg-white/70 text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Estado
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                {isConnected ? 'Conectado' : 'Pendiente de conexion'}
              </p>
              <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">
                {isConnected
                  ? 'Las reservas online cobraran directo en la cuenta conectada.'
                  : 'Todavia no hay una cuenta lista para cobrar.'}
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card rounded-[1.35rem] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-white/65 bg-white/70 text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Cuenta receptora
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                {account?.nickname || account?.email || 'Sin cuenta conectada'}
              </p>
              <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">
                {account?.email || 'El dueno iniciara sesion y autorizara la app.'}
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card rounded-[1.35rem] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-white/65 bg-white/70 text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Ultima actividad
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                {formatDate(
                  account?.lastRefreshedAt || account?.lastCheckedAt || account?.connectedAt,
                  timeZone,
                )}
              </p>
              <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">
                {account?.lastError
                  ? `Ultimo error: ${account.lastError}`
                  : 'Sin alertas recientes.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/api/admin/payments/mercadopago/connect?shop=${encodeURIComponent(shopSlug)}`}
          className="action-primary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold no-underline"
        >
          {isConnected ? 'Reconectar Mercado Pago' : 'Conectar Mercado Pago'}
        </Link>

        {account?.isActive ? (
          <form
            method="post"
            action={`/api/admin/payments/mercadopago/disconnect?shop=${encodeURIComponent(shopSlug)}`}
          >
            <Button
              type="submit"
              variant="ghost"
              className="action-secondary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Desconectar
            </Button>
          </form>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className={secondaryCardClassName}>
          <p className="text-sm font-semibold text-ink dark:text-slate-100">1. Iniciar conexion</p>
          <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">
            Abre Mercado Pago y autoriza la cuenta del negocio.
          </p>
        </div>
        <div className={secondaryCardClassName}>
          <p className="text-sm font-semibold text-ink dark:text-slate-100">2. Validar la cuenta</p>
          <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">
            La plataforma guarda la cuenta y la usa para reservas nuevas.
          </p>
        </div>
        <div className={secondaryCardClassName}>
          <p className="text-sm font-semibold text-ink dark:text-slate-100">3. Cobrar y devolver</p>
          <p className="mt-1 text-xs leading-6 text-slate/75 dark:text-slate-400">
            Cobros y reembolsos salen desde la misma cuenta conectada.
          </p>
        </div>
      </div>
    </div>
  );
}
