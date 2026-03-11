'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { respondToStaffInvitationAction } from '@/app/admin/actions';
import {
  markAccountNotificationReadAction,
  markAllAccountNotificationsReadAction,
} from '@/app/cuenta/actions';

interface AccountInvitationItem {
  id: string;
  role: string;
  createdAt: string;
  shopName: string;
  shopSlug: string | null;
}

interface AccountSystemNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  actionUrl: string | null;
  isRead: boolean;
}

interface AccountNotificationsPanelProps {
  invitations: AccountInvitationItem[];
  notifications: AccountSystemNotificationItem[];
}

function notificationTone(type: string): 'default' | 'success' | 'warning' | 'danger' {
  if (type === 'appointment_confirmed') {
    return 'success';
  }

  if (type === 'appointment_cancelled') {
    return 'danger';
  }

  if (type === 'review_requested') {
    return 'warning';
  }

  return 'default';
}

function notificationLabel(type: string): string {
  if (type === 'appointment_confirmed') {
    return 'Confirmada';
  }

  if (type === 'appointment_cancelled') {
    return 'Cancelada';
  }

  if (type === 'appointment_completed') {
    return 'Finalizada';
  }

  if (type === 'appointment_no_show') {
    return 'No asistida';
  }

  if (type === 'review_requested') {
    return 'Resena';
  }

  return 'Info';
}

export function AccountNotificationsPanel({
  invitations,
  notifications,
}: AccountNotificationsPanelProps) {
  const router = useRouter();
  const [invitationItems, setInvitationItems] = useState(invitations);
  const [systemItems, setSystemItems] = useState(notifications);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeInvitationId, setActiveInvitationId] = useState<string | null>(null);
  const [activeSystemNotificationId, setActiveSystemNotificationId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pendingInvitationsCount = invitationItems.length;
  const unreadSystemCount = useMemo(
    () => systemItems.reduce((total, item) => total + (item.isRead ? 0 : 1), 0),
    [systemItems],
  );
  const pendingCount = pendingInvitationsCount + unreadSystemCount;

  const pendingLabel = useMemo(() => {
    return `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`;
  }, [pendingCount]);

  const handleDecision = useCallback(
    (membershipId: string, decision: 'accept' | 'decline') => {
      startTransition(async () => {
        setActiveInvitationId(membershipId);
        setActiveSystemNotificationId(null);
        setError(null);
        setFeedback(null);

        try {
          const formData = new FormData();
          formData.set('membership_id', membershipId);
          formData.set('decision', decision);
          await respondToStaffInvitationAction(formData);

          setInvitationItems((current) => current.filter((item) => item.id !== membershipId));
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
          setActiveInvitationId(null);
        }
      });
    },
    [router, startTransition],
  );

  const handleMarkNotificationRead = useCallback(
    (notificationId: string) => {
      startTransition(async () => {
        setActiveSystemNotificationId(notificationId);
        setActiveInvitationId(null);
        setError(null);
        setFeedback(null);

        try {
          await markAccountNotificationReadAction({ notificationId });

          setSystemItems((current) =>
            current.map((item) =>
              item.id === notificationId
                ? {
                    ...item,
                    isRead: true,
                  }
                : item,
            ),
          );
          window.dispatchEvent(new Event('profile-updated'));
          router.refresh();
        } catch (actionError) {
          const message =
            actionError instanceof Error
              ? actionError.message
              : 'No se pudo marcar la notificacion como leida.';
          setError(message);
        } finally {
          setActiveSystemNotificationId(null);
        }
      });
    },
    [router, startTransition],
  );

  const handleMarkAllNotificationsRead = useCallback(() => {
    startTransition(async () => {
      setActiveSystemNotificationId('all');
      setActiveInvitationId(null);
      setError(null);
      setFeedback(null);

      try {
        await markAllAccountNotificationsReadAction();
        setSystemItems((current) =>
          current.map((item) => (item.isRead ? item : { ...item, isRead: true })),
        );
        window.dispatchEvent(new Event('profile-updated'));
        router.refresh();
      } catch (actionError) {
        const message =
          actionError instanceof Error
            ? actionError.message
            : 'No se pudieron actualizar las notificaciones.';
        setError(message);
      } finally {
        setActiveSystemNotificationId(null);
      }
    });
  }, [router, startTransition]);

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
              Revisa invitaciones y cambios importantes en tus citas (confirmacion, cancelacion,
              finalizacion y solicitud de resena).
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

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate/65 dark:text-slate-400">
              Actividad de citas
            </h4>
            <div className="flex items-center gap-2">
              <Chip
                size="sm"
                radius="full"
                variant="flat"
                color={unreadSystemCount > 0 ? 'warning' : 'default'}
              >
                {unreadSystemCount} sin leer
              </Chip>
              {unreadSystemCount > 0 ? (
                <Button
                  type="button"
                  onClick={handleMarkAllNotificationsRead}
                  isDisabled={isPending && activeSystemNotificationId === 'all'}
                  variant="light"
                  className="text-xs font-semibold text-ink underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-70 dark:text-slate-200"
                >
                  {isPending && activeSystemNotificationId === 'all'
                    ? 'Actualizando...'
                    : 'Marcar todo como leido'}
                </Button>
              ) : null}
            </div>
          </div>

          {systemItems.length === 0 ? (
            <p className="text-sm text-slate/70 dark:text-slate-400">
              Aun no tienes novedades de citas en tu cuenta.
            </p>
          ) : null}

          <div className="grid gap-3">
            {systemItems.map((item) => {
              const isUpdatingNotification = isPending && activeSystemNotificationId === item.id;

              return (
                <div key={item.id} className="surface-card rounded-2xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-ink dark:text-slate-100">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                        {item.message}
                      </p>
                      <p className="mt-2 text-xs text-slate/70 dark:text-slate-400">
                        {new Date(item.createdAt).toLocaleString('es-UY')}
                      </p>
                    </div>
                    <Chip
                      size="sm"
                      radius="full"
                      variant="flat"
                      color={item.isRead ? 'default' : notificationTone(item.type)}
                    >
                      {item.isRead ? 'Leida' : notificationLabel(item.type)}
                    </Chip>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {item.actionUrl ? (
                      <Link
                        href={item.actionUrl}
                        onClick={() => {
                          if (!item.isRead) {
                            handleMarkNotificationRead(item.id);
                          }
                        }}
                        className="action-secondary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
                      >
                        Ver detalle
                      </Link>
                    ) : null}
                    {!item.isRead ? (
                      <Button
                        type="button"
                        onClick={() => handleMarkNotificationRead(item.id)}
                        isDisabled={isUpdatingNotification}
                        className="action-primary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isUpdatingNotification ? 'Actualizando...' : 'Marcar como leida'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate/65 dark:text-slate-400">
              Invitaciones de equipo
            </h4>
            <Chip
              size="sm"
              radius="full"
              variant="flat"
              color={pendingInvitationsCount > 0 ? 'warning' : 'default'}
            >
              {pendingInvitationsCount} pendiente
              {pendingInvitationsCount === 1 ? '' : 's'}
            </Chip>
          </div>

          {pendingInvitationsCount === 0 ? (
            <p className="text-sm text-slate/70 dark:text-slate-400">
              No tienes invitaciones pendientes en este momento.
            </p>
          ) : null}

          <div className="grid gap-3">
            {invitationItems.map((item) => {
              const currentActionPending = isPending && activeInvitationId === item.id;

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
                    <Button
                      type="button"
                      onClick={() => handleDecision(item.id, 'accept')}
                      isDisabled={currentActionPending}
                      className="action-primary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {currentActionPending ? 'Procesando...' : 'Aceptar invitacion'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleDecision(item.id, 'decline')}
                      isDisabled={currentActionPending}
                      variant="ghost"
                      className="action-secondary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Rechazar
                    </Button>
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
        </div>
      </CardBody>
    </Card>
  );
}
