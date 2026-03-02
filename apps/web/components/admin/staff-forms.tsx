'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import {
  createStaffInvitationsAction,
  createTimeOffAction,
  searchStaffInviteeAction,
  upsertWorkingHoursAction,
} from '@/app/admin/actions';

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

const adminSelectClassNames = {
  trigger:
    'min-h-14 rounded-2xl border border-transparent bg-white/[0.03] shadow-none data-[hover=true]:border-transparent data-[hover=true]:bg-white/[0.08] data-[focus=true]:border-transparent data-[focus=true]:bg-white/[0.08] data-[open=true]:border-transparent data-[open=true]:bg-white/[0.08]',
  label: 'text-[11px] font-semibold text-slate-400',
  value: 'text-sm font-medium text-slate-100',
  selectorIcon: 'text-slate-400',
  popoverContent: 'rounded-2xl border border-transparent bg-[#0b1527] p-1',
} as const;

type InviteRole = 'staff' | 'admin';

interface InviteePreview {
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
}

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

  function handleInviteQueryChange(value: string) {
    setInviteQuery(value);
    setInviteError(null);
    setInviteMessage(null);
  }

  function handleInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
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
  }

  function handleAddInvitee(invitee: InviteePreview) {
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
  }

  function handleRemoveInvitee(userId: string) {
    setSelectedInvitees((current) => current.filter((item) => item.userId !== userId));
    setInviteError(null);
    setInviteMessage('Usuario removido de la lista.');
  }

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

        const selectedIds = new Set(selectedInvitees.map((item) => item.userId));
        setSearchResults(results.filter((item) => !selectedIds.has(item.userId)));
        setLastResolvedQuery(normalizedQuery);
      });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [inviteQuery, selectedInvitees, shopId, startSearchTransition]);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="spotlight-card soft-panel rounded-[1.8rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
              Invitar personal al equipo
            </h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Escribe email o nombre, ve coincidencias al instante y arma una lista para invitar a
              varios usuarios de una sola vez.
            </p>
            <form onSubmit={handleInviteSubmit} className="mt-4 grid gap-3">
              <div className="relative">
                <Input
                  value={inviteQuery}
                  onValueChange={handleInviteQueryChange}
                  label="Buscar usuario por email"
                  labelPlacement="inside"
                  type="text"
                  placeholder="usuario@correo.com"
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
                      searchResults.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-slate/70 dark:text-slate-400">
                          No encontramos usuarios para esa busqueda.
                        </p>
                      ) : null}

                      {!isSearching
                        ? searchResults.map((invitee) => (
                            <button
                              key={invitee.userId}
                              type="button"
                              onClick={() => handleAddInvitee(invitee)}
                              className="w-full text-left rounded-[1rem] px-3 py-3 transition md:hover:bg-black/5 dark:md:hover:bg-white/[0.04]"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/55 text-sm font-semibold text-ink dark:border-transparent dark:bg-white/[0.05] dark:text-slate-100">
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
                            </button>
                          ))
                        : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <Select
                aria-label="Rol de la invitacion"
                label="Rol"
                labelPlacement="inside"
                classNames={adminSelectClassNames}
                selectedKeys={[inviteRole]}
                onChange={(event) => setInviteRole(event.target.value as InviteRole)}
              >
                <SelectItem key="staff">Personal</SelectItem>
                <SelectItem key="admin">Administrador</SelectItem>
              </Select>

              {selectedInvitees.length > 0 ? (
                <div className="rounded-[1.4rem] border border-white/55 bg-white/38 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate/60 dark:text-slate-400">
                    Lista de invitaciones
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedInvitees.map((invitee) => (
                      <span
                        key={invitee.userId}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-ink dark:text-slate-100"
                      >
                        <span>{invitee.fullName}</span>
                        <span className="text-slate/65 dark:text-slate-300/75">{invitee.email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInvitee(invitee.userId)}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-transparent text-slate/70 transition md:hover:text-rose-600 dark:text-slate-300 dark:md:hover:text-rose-300"
                          aria-label={`Remover a ${invitee.fullName}`}
                          title={`Remover a ${invitee.fullName}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <Button
                type="submit"
                isLoading={isSaving}
                isDisabled={!selectedInvitees.length}
                className="action-primary w-fit px-5 text-sm font-semibold"
              >
                {isSaving
                  ? 'Enviando invitaciones...'
                  : selectedInvitees.length > 1
                    ? `Guardar ${selectedInvitees.length} invitaciones`
                    : 'Guardar personal'}
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
          </CardBody>
        </Card>

        <Card className="spotlight-card soft-panel rounded-[1.8rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
              Horarios laborales
            </h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Define disponibilidad semanal sin depender de tablas largas.
            </p>
            {!hasStaff ? (
              <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Primero crea al menos un miembro del equipo para asignarle horarios.
              </p>
            ) : null}
            <form action={upsertWorkingHoursAction} className="mt-4 grid gap-3">
              <input type="hidden" name="shop_id" value={shopId} />
              <input type="hidden" name="shop_slug" value={shopSlug} />
              <Select
                name="staff_id"
                aria-label="Selecciona personal"
                label="Personal"
                labelPlacement="inside"
                placeholder="Selecciona personal"
                classNames={adminSelectClassNames}
                defaultSelectedKeys={defaultStaffKeys}
                disallowEmptySelection
                isDisabled={!hasStaff}
                isRequired
              >
                {staff.map((item) => (
                  <SelectItem key={item.id}>{item.name}</SelectItem>
                ))}
              </Select>
              <Select
                name="day_of_week"
                aria-label="Dia de la semana"
                label="Dia"
                labelPlacement="inside"
                classNames={adminSelectClassNames}
                disallowEmptySelection
                isDisabled={!hasStaff}
                isRequired
                defaultSelectedKeys={['1']}
              >
                {weekdays.map((day, index) => (
                  <SelectItem key={String(index)}>{day}</SelectItem>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="working-hours-start-time"
                  name="start_time"
                  type="time"
                  label="Desde"
                  labelPlacement="inside"
                  defaultValue="09:00"
                  classNames={{
                    input: 'temporal-placeholder-hidden',
                  }}
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
                  classNames={{
                    input: 'temporal-placeholder-hidden',
                  }}
                  isDisabled={!hasStaff}
                  required
                />
              </div>
              <Button
                type="submit"
                isDisabled={!hasStaff}
                className="action-primary w-fit px-5 text-sm font-semibold"
              >
                Guardar horario
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Card className="spotlight-card soft-panel rounded-[1.8rem] border-0 shadow-none">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
            Agregar tiempo no disponible
          </h3>
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Registra bloqueos y excepciones sin romper la lectura del calendario.
          </p>
          {!hasStaff ? (
            <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Primero crea al menos un miembro del equipo para registrar bloqueos.
            </p>
          ) : null}
          <form action={createTimeOffAction} className="mt-4 grid gap-3 md:grid-cols-4">
            <input type="hidden" name="shop_id" value={shopId} />
            <input type="hidden" name="shop_slug" value={shopSlug} />
            <Select
              name="staff_id"
              aria-label="Selecciona personal"
              label="Personal"
              labelPlacement="inside"
              placeholder="Selecciona personal"
              classNames={adminSelectClassNames}
              defaultSelectedKeys={defaultStaffKeys}
              disallowEmptySelection
              isDisabled={!hasStaff}
              isRequired
            >
              {staff.map((item) => (
                <SelectItem key={item.id}>{item.name}</SelectItem>
              ))}
            </Select>
            <Input
              id="time-off-start-at"
              name="start_at"
              type="datetime-local"
              label="Inicio"
              labelPlacement="inside"
              classNames={{
                input: 'temporal-placeholder-hidden',
              }}
              isDisabled={!hasStaff}
              required
            />
            <Input
              id="time-off-end-at"
              name="end_at"
              type="datetime-local"
              label="Fin"
              labelPlacement="inside"
              classNames={{
                input: 'temporal-placeholder-hidden',
              }}
              isDisabled={!hasStaff}
              required
            />
            <Input name="reason" label="Motivo" labelPlacement="inside" isDisabled={!hasStaff} />
            <div className="md:col-span-4">
              <Button
                type="submit"
                isDisabled={!hasStaff}
                className="action-primary px-5 text-sm font-semibold"
              >
                Agregar bloqueo
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
