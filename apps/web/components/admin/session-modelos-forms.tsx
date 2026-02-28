'use client';

import { Button } from '@heroui/button';
import { Input, Textarea } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import {
  updateModelApplicationStatusAction,
  upsertModelRequirementsAction,
} from '@/app/admin/actions';

interface AdminModelRequirementsFormProps {
  sessionId: string;
  modelsNeeded: number;
  hairLengthCategory: string;
  hairType: string;
  compensationType: string;
  compensationValueCents: string;
  beardRequired: boolean;
  notesPublic: string;
  isOpen: boolean;
}

interface AdminModelApplicationStatusFormProps {
  applicationId: string;
  status: string;
  notesInternal: string;
}

export function AdminModelRequirementsForm({
  sessionId,
  modelsNeeded,
  hairLengthCategory,
  hairType,
  compensationType,
  compensationValueCents,
  beardRequired,
  notesPublic,
  isOpen,
}: AdminModelRequirementsFormProps) {
  return (
    <form action={upsertModelRequirementsAction} className="mt-4 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="session_id" value={sessionId} />
      <Input
        id="models_needed"
        name="models_needed"
        type="number"
        min={1}
        label="Modelos necesarios"
        labelPlacement="inside"
        defaultValue={String(modelsNeeded)}
        required
      />
      <Select
        id="hair_length_category"
        name="hair_length_category"
        aria-label="Largo de pelo"
        label="Largo de pelo"
        labelPlacement="inside"
        defaultSelectedKeys={[hairLengthCategory]}
      >
        <SelectItem key="indistinto">Indistinto</SelectItem>
        <SelectItem key="corto">Corto</SelectItem>
        <SelectItem key="medio">Medio</SelectItem>
        <SelectItem key="largo">Largo</SelectItem>
      </Select>
      <Input
        id="hair_type"
        name="hair_type"
        label="Tipo de pelo (opcional)"
        labelPlacement="inside"
        defaultValue={hairType}
        placeholder="Ej: lacio, rulos, mixto"
      />
      <Select
        id="compensation_type"
        name="compensation_type"
        aria-label="Tipo de compensacion"
        label="Compensacion"
        labelPlacement="inside"
        defaultSelectedKeys={[compensationType]}
      >
        <SelectItem key="gratis">Gratis</SelectItem>
        <SelectItem key="descuento">Descuento</SelectItem>
        <SelectItem key="pago">Pago</SelectItem>
      </Select>
      <Input
        id="compensation_value_cents"
        name="compensation_value_cents"
        type="number"
        min={0}
        label="Valor compensacion (cents)"
        labelPlacement="inside"
        defaultValue={compensationValueCents}
      />
      <div className="flex items-end">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="beard_required" defaultChecked={beardRequired} />
          Requiere barba
        </label>
      </div>
      <Textarea
        id="notes_public"
        name="notes_public"
        className="md:col-span-2"
        rows={3}
        label="Notas publicas"
        labelPlacement="inside"
        defaultValue={notesPublic}
        placeholder="Indicaciones para quienes se postulan."
      />
      <div className="md:col-span-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_open" defaultChecked={isOpen} />
          Convocatoria abierta
        </label>
      </div>
      <div className="md:col-span-2">
        <Button type="submit" className="action-primary px-5 text-sm font-semibold">
          Guardar configuracion
        </Button>
      </div>
    </form>
  );
}

export function AdminModelApplicationStatusForm({
  applicationId,
  status,
  notesInternal,
}: AdminModelApplicationStatusFormProps) {
  return (
    <form
      action={updateModelApplicationStatusAction}
      className="mt-3 grid gap-2 md:grid-cols-[200px_1fr_auto]"
    >
      <input type="hidden" name="application_id" value={applicationId} />
      <Select
        name="status"
        aria-label="Estado de postulacion"
        label="Estado"
        labelPlacement="inside"
        defaultSelectedKeys={[status]}
      >
        <SelectItem key="confirmed">Confirmar</SelectItem>
        <SelectItem key="waitlist">Lista de espera</SelectItem>
        <SelectItem key="rejected">Rechazar</SelectItem>
        <SelectItem key="applied">Pendiente</SelectItem>
      </Select>
      <Input
        name="notes_internal"
        label="Nota interna"
        labelPlacement="inside"
        defaultValue={notesInternal}
      />
      <Button
        type="submit"
        variant="flat"
        color="default"
        className="action-secondary px-5 text-sm font-semibold"
      >
        Guardar
      </Button>
    </form>
  );
}
