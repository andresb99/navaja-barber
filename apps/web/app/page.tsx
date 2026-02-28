'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  Scissors,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button, Card, CardBody } from '@heroui/react';

const operatingHighlights = [
  {
    title: 'Reservas sin friccion',
    description:
      'Agenda en cuatro pasos con disponibilidad clara, barbero opcional y confirmacion inmediata.',
    icon: CalendarDays,
  },
  {
    title: 'Operacion centralizada',
    description: 'Staff, administracion, resenas y seguimiento en una sola plataforma.',
    icon: Scissors,
  },
  {
    title: 'Nuevas lineas de negocio',
    description: 'Cursos, modelos y postulaciones integrados con la misma experiencia visual.',
    icon: Sparkles,
  },
] as const;

const routeShowcase = [
  {
    href: '/book',
    title: 'Agenda premium',
    description: 'Reserva turnos con una experiencia mas limpia y actual.',
    eyebrow: 'Booking',
    accent: 'from-sky-500/15 to-transparent',
  },
  {
    href: '/courses',
    title: 'Academia y workshops',
    description: 'Cursos con detalle, sesiones y llamados a accion mas claros.',
    eyebrow: 'Cursos',
    accent: 'from-rose-500/15 to-transparent',
  },
  {
    href: '/modelos',
    title: 'Convocatorias vivas',
    description: 'Un flujo mas aspiracional para captar modelos y ordenar sesiones.',
    eyebrow: 'Modelos',
    accent: 'from-amber-400/18 to-transparent',
  },
  {
    href: '/jobs',
    title: 'Atraccion de talento',
    description: 'Postulaciones con mejor percepcion de marca y mas confianza visual.',
    eyebrow: 'Empleo',
    accent: 'from-emerald-500/14 to-transparent',
  },
] as const;

export default function HomePage() {
  return (
    <section className="space-y-8 md:space-y-10">
      <div className="section-hero px-6 py-8 md:px-8 md:py-10">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="space-y-6">
            <p className="hero-eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Ultra moderno
            </p>

            <div className="space-y-4">
              <h1 className="max-w-3xl font-[family-name:var(--font-heading)] text-4xl font-semibold leading-[1.02] text-slate-950 md:text-6xl dark:text-white">
                Una plataforma de barberia que ya no se siente de la generacion pasada.
              </h1>

              <p className="max-w-2xl text-sm text-slate/85 md:text-base dark:text-slate-300">
                Redisenamos la experiencia para que reservas, cursos, modelos y operacion interna
                convivan en un mismo lenguaje: mas limpio, mas aspiracional y con mejor jerarquia
                visual.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                as={Link}
                href="/book"
                size="lg"
                endContent={<ArrowRight className="h-4 w-4" />}
                className="action-primary px-6 text-sm font-semibold"
              >
                Agendar ahora
              </Button>

              <Button
                as={Link}
                href="/courses"
                size="lg"
                variant="flat"
                className="action-secondary px-6 text-sm font-semibold"
              >
                Explorar cursos
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="stat-tile">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Agenda
                </p>
                <p className="mt-3 text-2xl font-semibold text-ink dark:text-white">4 pasos</p>
                <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                  Desde servicio hasta confirmacion.
                </p>
              </div>
              <div className="stat-tile">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Roles
                </p>
                <p className="mt-3 text-2xl font-semibold text-ink dark:text-white">3 capas</p>
                <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                  Cliente, staff y administracion.
                </p>
              </div>
              <div className="stat-tile">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Marca
                </p>
                <p className="mt-3 text-2xl font-semibold text-ink dark:text-white">1 sistema</p>
                <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                  Consistente en toda la web.
                </p>
              </div>
            </div>
          </div>

          <div className="soft-panel spotlight-card rounded-[2rem] p-5 md:p-6">
            <div className="grid gap-4">
              <div className="surface-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Experiencia
                </p>
                <h2 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-white">
                  Flujo mas claro, decision mas rapida
                </h2>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Cada pantalla prioriza lectura, contraste y profundidad visual sin romper la
                  operativa actual.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="surface-card">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/12 text-sky-700 dark:bg-sky-500/14 dark:text-sky-200">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-ink dark:text-white">
                    Cuenta y perfil
                  </p>
                  <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                    El acceso ahora se ve mas confiable y mejor resuelto.
                  </p>
                </div>

                <div className="surface-card">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/12 text-rose-700 dark:bg-rose-500/14 dark:text-rose-200">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-ink dark:text-white">
                    Talento y academia
                  </p>
                  <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                    Formularios y landings con mas valor percibido.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {operatingHighlights.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className="soft-panel spotlight-card rounded-[1.7rem] border-0 shadow-none"
            >
              <CardBody className="space-y-4 p-5">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink dark:text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                    {item.description}
                  </p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {routeShowcase.map((item) => (
          <Link key={item.href} href={item.href} className="no-underline">
            <Card className="soft-panel rounded-[1.8rem] border-0 shadow-none transition-transform duration-200 hover:-translate-y-1">
              <CardBody className="overflow-hidden p-5">
                <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${item.accent}`} />
                <div className="relative z-10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                    {item.eyebrow}
                  </p>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-white">
                        {item.title}
                      </h2>
                      <p className="mt-2 max-w-md text-sm text-slate/80 dark:text-slate-300">
                        {item.description}
                      </p>
                    </div>
                    {item.href === '/book' ? (
                      <CalendarDays className="h-5 w-5 text-sky-600 dark:text-sky-200" />
                    ) : null}
                    {item.href === '/courses' ? (
                      <GraduationCap className="h-5 w-5 text-rose-600 dark:text-rose-200" />
                    ) : null}
                    {item.href === '/modelos' ? (
                      <Users className="h-5 w-5 text-amber-600 dark:text-amber-200" />
                    ) : null}
                    {item.href === '/jobs' ? (
                      <BriefcaseBusiness className="h-5 w-5 text-emerald-600 dark:text-emerald-200" />
                    ) : null}
                  </div>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
                    Ver seccion
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
