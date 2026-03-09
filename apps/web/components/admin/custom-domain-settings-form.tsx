'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@heroui/react';
import type { SubscriptionTier } from '@/lib/subscription-plans';

interface CustomDomainSettingsFormProps {
  shopId: string;
  currentPlan: SubscriptionTier;
  initialCustomDomain: string | null;
  initialDomainStatus: string | null;
  initialDomainVerifiedAt: string | null;
}

interface CustomDomainResponse {
  custom_domain: string | null;
  domain_status: string | null;
  domain_verified_at: string | null;
  message?: string | null;
}

function getStatusLabel(status: string | null | undefined) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'pending') {
    return 'Pendiente';
  }

  if (normalized === 'verified') {
    return 'Verificado';
  }

  if (normalized === 'active') {
    return 'Activo';
  }

  if (normalized === 'failed') {
    return 'Fallido';
  }

  return 'Sin configurar';
}

function getStatusTone(status: string | null | undefined) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'active' || normalized === 'verified') {
    return 'success';
  }

  if (normalized === 'failed') {
    return 'danger';
  }

  return 'default';
}

function formatVerifiedAt(value: string | null | undefined) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString('es-UY');
}

export function CustomDomainSettingsForm({
  shopId,
  currentPlan,
  initialCustomDomain,
  initialDomainStatus,
  initialDomainVerifiedAt,
}: CustomDomainSettingsFormProps) {
  const router = useRouter();
  const [domainInput, setDomainInput] = useState(initialCustomDomain || '');
  const [currentDomain, setCurrentDomain] = useState(initialCustomDomain);
  const [currentStatus, setCurrentStatus] = useState(initialDomainStatus);
  const [verifiedAt, setVerifiedAt] = useState(initialDomainVerifiedAt);
  const [pendingAction, setPendingAction] = useState<'save' | 'activate' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isBusinessPlan = currentPlan === 'business';
  const canActivate = isBusinessPlan && Boolean(currentDomain) && currentStatus !== 'active';
  const canRemove = isBusinessPlan && Boolean(currentDomain);

  async function submit(action: 'save' | 'activate' | 'remove') {
    setPendingAction(action);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/custom-domain', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(
          action === 'save'
            ? {
                action,
                shop_id: shopId,
                custom_domain: domainInput,
              }
            : {
                action,
                shop_id: shopId,
              },
        ),
      });

      if (!response.ok) {
        const message = await response.text();
        setError(message || 'No se pudo actualizar el dominio.');
        setPendingAction(null);
        return;
      }

      const result = (await response.json()) as CustomDomainResponse;
      setCurrentDomain(result.custom_domain || null);
      setCurrentStatus(result.domain_status || null);
      setVerifiedAt(result.domain_verified_at || null);
      setDomainInput(result.custom_domain || '');
      setSuccess(
        result.message ||
          (action === 'remove'
            ? 'Dominio eliminado correctamente.'
            : action === 'activate'
              ? 'Dominio activado correctamente.'
              : 'Dominio guardado correctamente.'),
      );
      setPendingAction(null);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'No se pudo actualizar el dominio.',
      );
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="status-banner error">{error}</p> : null}
      {success ? <p className="status-banner success">{success}</p> : null}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <Input
          label="Dominio personalizado"
          labelPlacement="inside"
          value={domainInput}
          onChange={(event) => setDomainInput(event.target.value.toLowerCase())}
          placeholder="www.tubarberia.com"
          isDisabled={!isBusinessPlan || pendingAction !== null}
          description="Se guarda normalizado sin protocolo y acepta la variante con www."
        />

        <div className="surface-card flex min-h-[88px] flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Estado actual
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="meta-chip" data-tone={getStatusTone(currentStatus)}>
              {getStatusLabel(currentStatus)}
            </span>
          </div>
          {formatVerifiedAt(verifiedAt) ? (
            <p className="mt-2 text-xs text-slate/75 dark:text-slate-400">
              Verificado: {formatVerifiedAt(verifiedAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="surface-card rounded-[1.75rem] p-4">
        {isBusinessPlan ? (
          <div className="space-y-2 text-sm text-slate/80 dark:text-slate-300">
            <p>
              1. Guarda el dominio.
            </p>
            <p>
              2. Agregalo manualmente en Vercel y sigue el target DNS exacto que Vercel te muestre
              para ese dominio.
            </p>
            <p>
              3. Cuando el dominio ya apunte a este proyecto, activa el dominio desde aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink dark:text-slate-100">
              Disponible solo en Business
            </p>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Actualiza tu suscripcion al plan Business para conectar y activar un dominio propio.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          className="action-primary px-5 text-sm font-semibold"
          onClick={() => submit('save')}
          isDisabled={!isBusinessPlan || pendingAction !== null || !domainInput.trim()}
          isLoading={pendingAction === 'save'}
        >
          Guardar dominio
        </Button>
        <Button
          type="button"
          className="action-secondary px-5 text-sm font-semibold"
          variant="ghost"
          onClick={() => submit('activate')}
          isDisabled={!canActivate || pendingAction !== null}
          isLoading={pendingAction === 'activate'}
        >
          Activar dominio
        </Button>
        <Button
          type="button"
          className="action-secondary px-5 text-sm font-semibold"
          variant="ghost"
          color="danger"
          onClick={() => submit('remove')}
          isDisabled={!canRemove || pendingAction !== null}
          isLoading={pendingAction === 'remove'}
        >
          Eliminar dominio
        </Button>
      </div>

      {currentDomain ? (
        <p className="text-xs text-slate/75 dark:text-slate-400">
          Dominio guardado: <span className="font-semibold text-ink dark:text-slate-100">{currentDomain}</span>
        </p>
      ) : null}
    </div>
  );
}
