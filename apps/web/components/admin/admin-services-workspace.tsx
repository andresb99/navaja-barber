import Link from 'next/link';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Input } from '@heroui/input';
import { formatCurrency } from '@navaja/shared';
import { BarChart3, CalendarClock, Clock3, Store, type LucideIcon } from 'lucide-react';

interface ServiceWorkspaceItem {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  isActive: boolean;
  recentBookings: number;
  recentCompleted: number;
  lastBookedAtLabel: string | null;
}

interface AdminServicesWorkspaceProps {
  formAction: (formData: FormData) => void | Promise<void>;
  shopId: string;
  shopSlug: string;
  totalServices: number;
  activeServicesCount: number;
  inactiveServicesCount: number;
  averagePriceLabel: string;
  averageDurationLabel: string;
  priceRangeLabel: string;
  durationSpreadLabel: string;
  topDemandServiceLabel: string;
  servicesWithDemandCount: number;
  services: ServiceWorkspaceItem[];
}

const inputClassNames = {
  label:
    'text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400',
  inputWrapper:
    'border border-white/65 bg-white/72 shadow-none transition data-[hover=true]:border-white/75 group-data-[focus=true]:border-sky-400 dark:border-white/10 dark:bg-white/[0.04]',
  input: 'text-sm text-ink dark:text-slate-100',
};

function resolvePricePosition(priceCents: number, averagePriceCents: number) {
  if (!averagePriceCents) {
    return 'Sin referencia';
  }

  if (priceCents >= averagePriceCents * 1.15) {
    return 'Premium';
  }

  if (priceCents <= averagePriceCents * 0.85) {
    return 'Accesible';
  }

  return 'Precio medio';
}

function resolvePriceTone(priceCents: number, averagePriceCents: number) {
  if (!averagePriceCents) {
    return undefined;
  }

  if (priceCents >= averagePriceCents * 1.15) {
    return 'warning';
  }

  if (priceCents <= averagePriceCents * 0.85) {
    return 'success';
  }

  return undefined;
}

function resolveDurationLabel(durationMinutes: number) {
  if (durationMinutes <= 30) {
    return 'Express';
  }

  if (durationMinutes <= 60) {
    return 'Sesion estandar';
  }

  return 'Sesion extensa';
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="data-card rounded-[1.7rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-ink dark:text-slate-100">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{detail}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] border border-white/70 bg-white/75 text-ink shadow-[0_18px_30px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function ServiceCatalogCard({
  item,
  averagePriceCents,
}: {
  item: ServiceWorkspaceItem;
  averagePriceCents: number;
}) {
  const pricePosition = resolvePricePosition(item.priceCents, averagePriceCents);
  const priceTone = resolvePriceTone(item.priceCents, averagePriceCents);
  const usageTone = item.isActive ? 'success' : item.recentBookings > 0 ? 'warning' : undefined;

  return (
    <article className="data-card h-full rounded-[1.7rem] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
            {item.isActive ? 'Visible en booking' : 'Oculto del booking'}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">{item.name}</h3>
        </div>
        <span className="meta-chip" data-tone={item.isActive ? 'success' : undefined}>
          {item.isActive ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="meta-chip" data-tone={priceTone}>
          {pricePosition}
        </span>
        <span className="meta-chip">{resolveDurationLabel(item.durationMinutes)}</span>
        <span className="meta-chip" data-tone={usageTone}>
          {item.recentBookings ? `${item.recentBookings} reservas / 90d` : 'Sin demanda reciente'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.3rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Precio
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-ink dark:text-slate-100">
            {formatCurrency(item.priceCents)}
          </p>
        </div>

        <div className="rounded-[1.3rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Duracion
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-ink dark:text-slate-100">
            {item.durationMinutes} min
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.3rem] border border-white/60 bg-white/48 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-sm font-semibold text-ink dark:text-slate-100">
          {item.recentBookings
            ? `${item.recentCompleted} citas realizadas recientemente`
            : item.isActive
              ? 'Listo para aparecer en la reserva publica'
              : 'Queda guardado pero no se muestra en el flujo de reserva'}
        </p>
        <p className="mt-1 text-sm text-slate/75 dark:text-slate-400">
          {item.lastBookedAtLabel
            ? `Ultima reserva registrada: ${item.lastBookedAtLabel}.`
            : item.isActive
              ? 'Puedes mantenerlo visible aunque aun no tenga demanda reciente.'
              : 'Activalo de nuevo cuando quieras recuperarlo sin recrear el servicio.'}
        </p>
      </div>
    </article>
  );
}

export function AdminServicesWorkspace({
  formAction,
  shopId,
  shopSlug,
  totalServices,
  activeServicesCount,
  inactiveServicesCount,
  averagePriceLabel,
  averageDurationLabel,
  priceRangeLabel,
  durationSpreadLabel,
  topDemandServiceLabel,
  servicesWithDemandCount,
  services,
}: AdminServicesWorkspaceProps) {
  const activeServices = services.filter((item) => item.isActive);
  const inactiveServices = services.filter((item) => !item.isActive);
  const averagePriceCents =
    totalServices > 0
      ? Math.round(services.reduce((sum, item) => sum + item.priceCents, 0) / totalServices)
      : 0;
  const appointmentsHref = `/admin/appointments?shop=${encodeURIComponent(shopSlug)}`;
  const barbershopHref = `/admin/barbershop?shop=${encodeURIComponent(shopSlug)}`;

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
            <div>
              <p className="hero-eyebrow">Servicios</p>
              <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
                Catalogo claro para reservar y mantener
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate/80 dark:text-slate-300">
                Esta ruta ahora separa el alta rapida del catalogo publicado para que crear
                servicios, leer precios y revisar visibilidad no se sienta como un formulario
                gigante sin prioridad visual.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="meta-chip">{totalServices} servicios</span>
                <span className="meta-chip">{activeServicesCount} visibles al publico</span>
                <span className="meta-chip">{averageDurationLabel} promedio</span>
                <span className="meta-chip">Top reciente: {topDemandServiceLabel}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <OverviewCard
                icon={Store}
                label="Catalogo activo"
                value={String(activeServicesCount)}
                detail={`${inactiveServicesCount} ocultos sin borrar historial`}
              />
              <OverviewCard
                icon={BarChart3}
                label="Precio medio"
                value={averagePriceLabel}
                detail={`Rango actual: ${priceRangeLabel}`}
              />
              <OverviewCard
                icon={Clock3}
                label="Duracion media"
                value={averageDurationLabel}
                detail={`Cobertura temporal: ${durationSpreadLabel}`}
              />
              <OverviewCard
                icon={CalendarClock}
                label="Demanda reciente"
                value={String(servicesWithDemandCount)}
                detail={`Servicio con mas movimiento: ${topDemandServiceLabel}`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.88fr)]">
        <section
          id="services-catalog"
          className="order-2 surface-card rounded-[1.9rem] p-5 md:p-6 xl:order-1"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Catalogo publicado
              </p>
              <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                Servicios listos para reservas y seguimiento
              </h2>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                El catalogo prioriza lo que hoy esta visible y deja los servicios archivados en una
                segunda capa mas ordenada.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="#new-service"
                className="action-primary inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold"
              >
                Nuevo servicio
              </a>
              <Link
                href={appointmentsHref}
                className="action-secondary inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold"
              >
                Ver citas
              </Link>
            </div>
          </div>

          {!services.length ? (
            <div className="mt-5 rounded-[1.5rem] border border-white/65 bg-white/55 px-4 py-4 text-sm text-slate/75 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
              Todavia no hay servicios creados. Usa el panel lateral para cargar el primero y dejar
              listo el flujo de reservas publicas.
            </div>
          ) : (
            <>
              {activeServices.length ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {activeServices.map((item) => (
                    <ServiceCatalogCard
                      key={item.id}
                      item={item}
                      averagePriceCents={averagePriceCents}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.5rem] border border-white/65 bg-white/55 px-4 py-4 text-sm text-slate/75 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                  Aun no hay servicios activos. Puedes crear uno nuevo o volver a activar alguno de
                  los ocultos.
                </div>
              )}

              {inactiveServices.length ? (
                <div className="mt-6 border-t border-white/45 pt-6 dark:border-white/10">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                        Servicios ocultos
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                        Servicios ocultos sin perder historial
                      </h3>
                      <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                        Quedan guardados para reactivarlos cuando el negocio los necesite otra vez.
                      </p>
                    </div>
                    <span className="meta-chip">{inactiveServices.length} inactivos</span>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {inactiveServices.map((item) => (
                      <ServiceCatalogCard
                        key={item.id}
                        item={item}
                        averagePriceCents={averagePriceCents}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>

        <aside className="order-1 space-y-5 xl:order-2">
          <div id="new-service">
            <Card className="surface-card rounded-[1.9rem] border-0 shadow-none">
              <CardBody className="p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                      Nuevo servicio
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                      Alta rapida del catalogo
                    </h2>
                    <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                      El formulario queda concentrado en una columna para que el catalogo siga
                      siendo el protagonista.
                    </p>
                  </div>
                  <span className="meta-chip" data-tone={activeServicesCount > 0 ? 'success' : 'warning'}>
                    {activeServicesCount > 0 ? 'Booking listo' : 'Falta publicar'}
                  </span>
                </div>

                <form action={formAction} className="mt-5 grid gap-4">
                  <input type="hidden" name="shop_id" value={shopId} />
                  <input type="hidden" name="shop_slug" value={shopSlug} />

                  <Input
                    name="name"
                    label="Nombre del servicio"
                    labelPlacement="outside"
                    variant="bordered"
                    radius="lg"
                    required
                    classNames={inputClassNames}
                    placeholder="Ej. Corte premium"
                  />

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <Input
                      name="price_cents"
                      type="number"
                      label="Precio (pesos UYU)"
                      labelPlacement="outside"
                      variant="bordered"
                      radius="lg"
                      step="0.01"
                      min="0"
                      required
                      classNames={inputClassNames}
                      placeholder="850"
                    />
                    <Input
                      name="duration_minutes"
                      type="number"
                      label="Duracion en minutos"
                      labelPlacement="outside"
                      variant="bordered"
                      radius="lg"
                      min="1"
                      required
                      classNames={inputClassNames}
                      placeholder="45"
                    />
                  </div>

                  <label className="flex items-center justify-between gap-4 rounded-[1.3rem] border border-white/65 bg-white/55 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <div>
                      <p className="text-sm font-semibold text-ink dark:text-slate-100">
                        Visible en reservas
                      </p>
                      <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                        Si lo dejas activo, aparece en el flujo publico inmediatamente.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked
                      className="h-4 w-4 rounded border-slate/30 accent-slate-900 dark:accent-slate-100"
                    />
                  </label>

                  <Button
                    type="submit"
                    className="action-primary h-12 justify-center rounded-full px-5 text-sm font-semibold"
                  >
                    Guardar servicio
                  </Button>
                </form>
              </CardBody>
            </Card>
          </div>

          <section className="surface-card rounded-[1.9rem] p-5 md:p-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Lectura rapida
              </p>
              <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                Como esta armado el catalogo hoy
              </h2>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                Un resumen corto para revisar mix de precios, visibilidad y relacion con el resto
                del admin.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-[1.3rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Visibilidad
                </p>
                <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                  {activeServicesCount} publicados y {inactiveServicesCount} ocultos.
                </p>
                <p className="mt-1 text-sm text-slate/75 dark:text-slate-400">
                  Los inactivos no salen en booking, pero siguen disponibles para reactivacion.
                </p>
              </div>

              <div className="rounded-[1.3rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Mix comercial
                </p>
                <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                  Precio medio {averagePriceLabel}
                </p>
                <p className="mt-1 text-sm text-slate/75 dark:text-slate-400">
                  Rango actual: {priceRangeLabel}.
                </p>
              </div>

              <div className="rounded-[1.3rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Demanda
                </p>
                <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                  {servicesWithDemandCount} servicios con reservas recientes.
                </p>
                <p className="mt-1 text-sm text-slate/75 dark:text-slate-400">
                  Mayor movimiento: {topDemandServiceLabel}.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={appointmentsHref}
                className="action-secondary inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold"
              >
                Impacto en citas
              </Link>
              <Link
                href={barbershopHref}
                className="action-secondary inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold"
              >
                Perfil del local
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
