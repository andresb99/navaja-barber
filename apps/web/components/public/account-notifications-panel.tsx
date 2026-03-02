'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { respondToStaffInvitationAction } from '@/app/admin/actions';

interface AccountInvitationItem {
  id: string;
  role: string;
  createdAt: string;
  shopName: string;
  shopSlug: string | null;
}

interface AccountNotificationsPanelProps {
  invitations: AccountInvitationItem[];
}

export function AccountNotificationsPanel({ invitations }: AccountNotificationsPanelProps) {
  const router = useRouter();
  const [items, setItems] = useState(invitations);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pendingCount = items.length;

  const pendingLabel = useMemo(() => {
    return `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`;
  }, [pendingCount]);

  function handleDecision(membershipId: string, decision: 'accept' | 'decline') {
    startTransition(async () => {
      setActiveItemId(membershipId);
      setError(null);
      setFeedback(null);

      try {
        const formData = new FormData();
        formData.set('membership_id', membershipId);
        formData.set('decision', decision);
        await respondToStaffInvitationAction(formData);

        setItems((current) => current.filter((item) => item.id !== membershipId));
        setFeedback(
          decision === 'accept'
            ? 'Invitacion aceptada. Ya puedes entrar a Mis barberias y al panel de staff.'
            : 'Invitacion rechazada.',
        );
        window.dispatchEvent(new Event('profile-updated'));
        router.refresh();
      } catch (actionError) {
        const message =
          actionError instanceof Error
            ? actionError.message
            : 'No se pudo actualizar la invitacion.';
        setError(message);
      } finally {
        setActiveItemId(null);
      }
    });
  }

  return (
    <Card
      id="notificaciones"
      className="soft-panel rounded-[1.9rem] border-0 shadow-none scroll-mt-28"
    >
      <CardBody className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Notificaciones</h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Aqui aceptas o rechazas invitaciones para sumarte al equipo de una barberia.
            </p>
          </div>
          <Chip
            size="sm"
            radius="full"
            variant="flat"
            color={pendingCount > 0 ? 'warning' : 'default'}
          >
            {pendingLabel}
          </Chip>
        </div>

        {error ? (
          <p className="status-banner error" role="alert">
            {error}
          </p>
        ) : null}

        {feedback ? (
          <p className="status-banner success" role="status">
            {feedback}
          </p>
        ) : null}

        {pendingCount === 0 ? (
          <p className="text-sm text-slate/70 dark:text-slate-400">
            No tienes invitaciones pendientes en este momento.
          </p>
        ) : null}

        <div className="grid gap-3">
          {items.map((item) => {
            const currentActionPending = isPending && activeItemId === item.id;

            return (
              <div key={item.id} className="surface-card rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ink dark:text-slate-100">
                      {item.shopName || 'Barberia'}
                    </p>
                    <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                      Rol propuesto: {item.role === 'admin' ? 'Administrador' : 'Personal'}
                    </p>
                    <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                      Recibida el {new Date(item.createdAt).toLocaleString('es-UY')}
                    </p>
                  </div>
                  <Chip size="sm" radius="full" variant="flat" color="warning">
                    Pendiente
                  </Chip>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleDecision(item.id, 'accept')}
                    disabled={currentActionPending}
                    className="action-primary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {currentActionPending ? 'Procesando...' : 'Aceptar invitacion'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(item.id, 'decline')}
                    disabled={currentActionPending}
                    className="action-secondary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Rechazar
                  </button>
                  {item.shopSlug ? (
                    <Link
                      href={`/shops/${item.shopSlug}`}
                      className="action-secondary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
                    >
                      Ver barberia
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
