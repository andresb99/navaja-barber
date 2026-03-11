'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { SelectItem } from '@heroui/select';
import {
  createStaffInvitationsAction,
  createTimeOffAction,
  searchStaffInviteeAction,
  upsertWorkingHoursRangeAction,
} from '@/app/admin/actions';
import { AdminSelect } from '@/components/heroui/admin-select';
import { SurfaceCheckbox } from '@/components/heroui/surface-field';

interface StaffOption {
  id: string;
  name: string;
}

interface AdminStaffFormsProps {
  shopId: string;
  shopSlug: string;
  staff: StaffOption[];
  weekdays: string[];
}

type InviteRole = 'staff' | 'admin';

interface InviteePreview {
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
}

const formInputClassNames = {
  label: 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500',
  inputWrapper:
    'min-h-[56px] rounded-[1.2rem] border border-slate-900/10 bg-white/82 shadow-none transition data-[hover=true]:border-sky-300 group-data-[focus=true]:border-sky-400 dark:border-white/10 dark:bg-white/[0.04]',
  input: 'text-sm text-slate-900 dark:text-zinc-100',
} as const;

const temporalInputClassNames = {
  ...formInputClassNames,
  input: 'temporal-placeholder-hidden text-sm text-slate-900 dark:text-zinc-100',
} as const;

function getInviteeInitials(name: string, email: string) {
  const source = name.trim() || email.trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return 'US';
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

export function AdminStaffForms({ shopId, shopSlug, staff, weekdays }: AdminStaffFormsProps) {
  const router = useRouter();
  const hasStaff = staff.length > 0;
  const defaultStaffKeys = staff[0]?.id ? [staff[0].id] : [];
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('staff');
  const [searchResults, setSearchResults] = useState<InviteePreview[]>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<InviteePreview[]>([]);
  const [lastResolvedQuery, setLastResolvedQuery] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const selectedInviteeIds = useMemo(
    () => new Set(selectedInvitees.map((item) => item.userId)),
    [selectedInvitees],
  );
  const visibleSearchResults = useMemo(
    () => searchResults.filter((item) => !selectedInviteeIds.has(item.userId)),
    [searchResults, selectedInviteeIds],
  );

  const handleInviteQueryChange = useCallback((value: string) => {
    setInviteQuery(value);
    setInviteError(null);
    setInviteMessage(null);
  }, []);

  const handleInviteSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!selectedInvitees.length) {
        setInviteError('Agrega al menos un usuario a la lista antes de guardar.');
        setInviteMessage(null);
        return;
      }

      startSaveTransition(async () => {
        setInviteError(null);
        setInviteMessage(null);

        const result = await createStaffInvitationsAction({
          shopId,
          role: inviteRole,
          invitees: selectedInvitees.map((invitee) => ({
            email: invitee.email,
            userId: invitee.userId,
          })),
        });

        if (!result.ok) {
          setInviteError(result.message);
          return;
        }

        setInviteMessage(result.message);
        setInviteQuery('');
        setSearchResults([]);
        setSelectedInvitees([]);
        setLastResolvedQuery('');
        setInviteRole('staff');
        router.refresh();
      });
    },
    [inviteRole, router, selectedInvitees, shopId, startSaveTransition],
  );

  const handleAddInvitee = useCallback((invitee: InviteePreview) => {
    setSelectedInvitees((current) => {
      if (current.some((item) => item.userId === invitee.userId)) {
        return current;
      }

      return [...current, invitee];
    });
    setInviteQuery('');
    setSearchResults([]);
    setLastResolvedQuery('');
    setInviteError(null);
    setInviteMessage(`${invitee.fullName} agregado a la lista de invitaciones.`);
  }, []);

  const handleRemoveInvitee = useCallback((userId: string) => {
    setSelectedInvitees((current) => current.filter((item) => item.userId !== userId));
    setInviteError(null);
    setInviteMessage('Usuario removido de la lista.');
  }, []);

  useEffect(() => {
    const normalizedQuery = inviteQuery.trim();

    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      setLastResolvedQuery('');
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      startSearchTransition(async () => {
        const results = await searchStaffInviteeAction({
          shopId,
          query: normalizedQuery,
        });

        if (cancelled) {
          return;
        }

        setSearchResults(results);
        setLastResolvedQuery(normalizedQuery);
      });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [inviteQuery, shopId, startSearchTransition]);

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <section className="surface-card rounded-[1.9rem] p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Operacion
              </p>
              <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                Invitar personal al equipo
              </h2>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                Busca por email o nombre, arma una lista corta y guarda varias invitaciones en un
                solo paso.
              </p>
            </div>

            <span className="meta-chip">
              {selectedInvitees.length
                ? `${selectedInvitees.length} listos para invitar`
                : 'Sin lista preparada'}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-white/65 bg-white/50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Rol por defecto
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                {inviteRole === 'admin' ? 'Administrador' : 'Barbero'}
              </p>
              <p className="mt-1 text-sm text-slate/75 dark:text-slate-400">
                Lo puedes cambiar antes de guardar.
              </p>
            </div>

            <div className="rounded-[1.3rem] border border-white/65 bg-white/50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Busqueda
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                {inviteQuery.trim().length >= 2 ? 'Activa' : 'Escribe 2 caracteres o mas'}
              </p>
              <p className="mt-1 text-sm text-slate/75 dark:text-slate-400">
                El panel muestra coincidencias sin salir de la pagina.
              </p>
            </div>
          </div>

          <form onSubmit={handleInviteSubmit} className="mt-5 grid gap-4">
            <div className="relative">
              <Input
                value={inviteQuery}
                onValueChange={handleInviteQueryChange}
                label="Buscar usuario"
                labelPlacement="inside"
                type="text"
                placeholder="usuario@correo.com"
                classNames={formInputClassNames}
              />

              {inviteQuery.trim().length >= 2 ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[1.3rem] border border-white/70 bg-white/95 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.38)] backdrop-blur-xl dark:border-white/10 dark:bg-[#091120]/96">
                  <div className="max-h-72 overflow-auto p-2">
                    {isSearching ? (
                      <p className="px-3 py-2 text-sm text-slate/70 dark:text-slate-400">
                        Buscando...
                      </p>
                    ) : null}

                    {!isSearching &&
                    inviteQuery.trim() === lastResolvedQuery &&
                    visibleSearchResults.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-slate/70 dark:text-slate-400">
                        No encontramos usuarios para esa busqueda.
                      </p>
                    ) : null}

                    {!isSearching
                      ? visibleSearchResults.map((invitee) => (
                          <Button
                            key={invitee.userId}
                            type="button"
                            onClick={() => handleAddInvitee(invitee)}
                            variant="light"
                            className="h-auto w-full justify-start rounded-[1rem] px-3 py-3 text-left transition md:hover:bg-black/5 dark:md:hover:bg-white/[0.04]"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-white/60 bg-white/72 text-sm font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100">
                                {getInviteeInitials(invitee.fullName, invitee.email)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-ink dark:text-slate-100">
                                  {invitee.fullName}
                                </p>
                                <p className="mt-1 text-xs text-slate/75 dark:text-slate-300">
                                  {invitee.email}
                                </p>
                              </div>
                              <span className="meta-chip">Agregar</span>
                            </div>
                          </Button>
                        ))
                      : null}
                  </div>
                </div>
              ) : null}
            </div>

            <AdminSelect
              aria-label="Rol de la invitacion"
              label="Rol"
              labelPlacement="inside"
              selectedKeys={[inviteRole]}
              onChange={(event) => setInviteRole(event.target.value as InviteRole)}
            >
              <SelectItem key="staff">Personal</SelectItem>
              <SelectItem key="admin">Administrador</SelectItem>
            </AdminSelect>

            <div className="rounded-[1.4rem] border border-white/65 bg-white/50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Lista de invitaciones
                </p>
                <span className="meta-chip">{selectedInvitees.length} seleccionados</span>
              </div>

              {selectedInvitees.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedInvitees.map((invitee) => (
                    <span
                      key={invitee.userId}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-ink dark:text-slate-100"
                    >
                      <span>{invitee.fullName}</span>
                      <span className="text-slate/65 dark:text-slate-300/75">{invitee.email}</span>
                      <Button
                        type="button"
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => handleRemoveInvitee(invitee.userId)}
                        className="h-5 min-h-5 w-5 min-w-5 rounded-full bg-transparent text-slate/70 transition md:hover:text-rose-600 dark:text-slate-300 dark:md:hover:text-rose-300"
                        aria-label={`Remover a ${invitee.fullName}`}
                        title={`Remover a ${invitee.fullName}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate/75 dark:text-slate-400">
                  Agrega usuarios desde la busqueda para preparar la invitacion.
                </p>
              )}
            </div>

            <Button
              type="submit"
              isLoading={isSaving}
              isDisabled={!selectedInvitees.length}
              className="action-primary h-12 w-full px-5 text-sm font-semibold sm:w-auto"
            >
              {isSaving
                ? 'Enviando invitaciones...'
                : selectedInvitees.length > 1
                  ? `Guardar ${selectedInvitees.length} invitaciones`
                  : 'Guardar invitacion'}
            </Button>

            {inviteError ? (
              <p className="status-banner error" role="alert">
                {inviteError}
              </p>
            ) : null}
            {inviteMessage ? (
              <p className="status-banner success" role="status">
                {inviteMessage}
              </p>
            ) : null}
          </form>
        </section>

        <div className="space-y-5">
          <section className="surface-card rounded-[1.9rem] p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Disponibilidad
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                  Horarios laborales
                </h2>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Carga bloques semanales amplios sin depender de una tabla larga.
                </p>
              </div>
              <span className="meta-chip">
                {hasStaff ? 'Listo para asignar' : 'Requiere personal'}
              </span>
            </div>

            {!hasStaff ? (
              <p className="mt-4 rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Primero crea al menos un miembro del equipo para asignarle horarios.
              </p>
            ) : null}

            <form action={upsertWorkingHoursRangeAction} className="mt-5 grid gap-3">
              <input type="hidden" name="shop_id" value={shopId} />
              <input type="hidden" name="shop_slug" value={shopSlug} />

              <AdminSelect
                name="staff_id"
                aria-label="Selecciona personal"
                label="Personal"
                labelPlacement="inside"
                placeholder="Selecciona personal"
                defaultSelectedKeys={defaultStaffKeys}
                disallowEmptySelection
                isDisabled={!hasStaff}
                isRequired
              >
                {staff.map((item) => (
                  <SelectItem key={item.id}>{item.name}</SelectItem>
                ))}
              </AdminSelect>

              <div className="grid grid-cols-2 gap-3">
                <AdminSelect
                  name="day_from"
                  aria-label="Dia inicial"
                  label="Desde dia"
                  labelPlacement="inside"
                  disallowEmptySelection
                  isDisabled={!hasStaff}
                  isRequired
                  defaultSelectedKeys={['1']}
                >
                  {weekdays.map((day, index) => (
                    <SelectItem key={String(index)}>{day}</SelectItem>
                  ))}
                </AdminSelect>

                <AdminSelect
                  name="day_to"
                  aria-label="Dia final"
                  label="Hasta dia"
                  labelPlacement="inside"
                  disallowEmptySelection
                  isDisabled={!hasStaff}
                  isRequired
                  defaultSelectedKeys={['5']}
                >
                  {weekdays.map((day, index) => (
                    <SelectItem key={String(index)}>{day}</SelectItem>
                  ))}
                </AdminSelect>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="working-hours-start-time"
                  name="start_time"
                  type="time"
                  label="Desde"
                  labelPlacement="inside"
                  defaultValue="09:00"
                  classNames={temporalInputClassNames}
                  isDisabled={!hasStaff}
                  required
                />

                <Input
                  id="working-hours-end-time"
                  name="end_time"
                  type="time"
                  label="Hasta"
                  labelPlacement="inside"
                  defaultValue="17:00"
                  classNames={temporalInputClassNames}
                  isDisabled={!hasStaff}
                  required
                />
              </div>

              <div className="rounded-[1rem] border border-white/65 bg-white/72 px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]">
                <SurfaceCheckbox name="replace_existing" defaultSelected>
                  Reemplazar horarios existentes en ese rango
                </SurfaceCheckbox>
              </div>

              <p className="text-xs leading-6 text-slate/70 dark:text-slate-400">
                Puedes cargar un bloque de una sola vez. Si eliges un rango invertido, se toma con
                salto de fin de semana, por ejemplo viernes a lunes.
              </p>

              <Button
                type="submit"
                isDisabled={!hasStaff}
                className="action-primary h-12 w-full px-5 text-sm font-semibold sm:w-auto"
              >
                Aplicar horario al rango
              </Button>
            </form>
          </section>

          <section className="surface-card rounded-[1.9rem] p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Excepciones
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                  Agregar tiempo no disponible
                </h2>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Registra ausencias, pausas o cierres sin romper la lectura general del equipo.
                </p>
              </div>
              <span className="meta-chip">
                {hasStaff ? 'Agenda editable' : 'Sin staff cargado'}
              </span>
            </div>

            {!hasStaff ? (
              <p className="mt-4 rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Primero crea al menos un miembro del equipo para registrar bloqueos.
              </p>
            ) : null}

            <form action={createTimeOffAction} className="mt-5 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="shop_id" value={shopId} />
              <input type="hidden" name="shop_slug" value={shopSlug} />

              <AdminSelect
                name="staff_id"
                aria-label="Selecciona personal"
                label="Personal"
                labelPlacement="inside"
                placeholder="Selecciona personal"
                defaultSelectedKeys={defaultStaffKeys}
                disallowEmptySelection
                isDisabled={!hasStaff}
                isRequired
              >
                {staff.map((item) => (
                  <SelectItem key={item.id}>{item.name}</SelectItem>
                ))}
              </AdminSelect>

              <Input
                id="time-off-start-at"
                name="start_at"
                type="datetime-local"
                label="Inicio"
                labelPlacement="inside"
                classNames={temporalInputClassNames}
                isDisabled={!hasStaff}
                required
              />

              <Input
                id="time-off-end-at"
                name="end_at"
                type="datetime-local"
                label="Fin"
                labelPlacement="inside"
                classNames={temporalInputClassNames}
                isDisabled={!hasStaff}
                required
              />

              <Input
                name="reason"
                label="Motivo"
                labelPlacement="inside"
                classNames={formInputClassNames}
                isDisabled={!hasStaff}
              />

              <div className="md:col-span-2">
                <Button
                  type="submit"
                  isDisabled={!hasStaff}
                  className="action-primary h-12 w-full px-5 text-sm font-semibold sm:w-auto"
                >
                  Agregar bloqueo
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </section>
  );
}
