'use client';

import NextLink from 'next/link';
import { motion } from 'motion/react';
import { Calendar, CreditCard, Store, CheckCircle2, ArrowRight } from 'lucide-react';
import { Accordion, AccordionItem, Chip, Divider } from '@heroui/react';
import {
  publicMarketingSoftwareHero,
  publicMarketingSoftwareFaqs,
} from '@navaja/shared';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.45, delay },
});

export function SoftwareParaBarberiasPage() {
  return (
    <div className="space-y-4">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="soft-panel relative overflow-hidden rounded-[1.8rem] p-6 md:p-10"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-24 -top-24 h-[450px] w-[450px] rounded-full bg-violet-500/6 blur-[100px] dark:bg-violet-500/10" />
          <div className="absolute -bottom-16 left-1/3 h-[300px] w-[300px] rounded-full bg-brass/5 blur-[80px]" />
        </div>

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          {/* Left: copy */}
          <div>
            <Chip
              variant="bordered"
              size="sm"
              classNames={{
                base: 'border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/5',
                content:
                  'text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate/84 dark:text-slate-300',
              }}
            >
              Plataforma SaaS
            </Chip>

            <h1 className="mt-4 font-[family-name:var(--font-heading)] text-4xl font-bold leading-[1.1] tracking-tight text-ink md:text-[3rem] dark:text-white">
              Todo lo que necesita
              <br />
              tu barbería,
              <br />
              en un solo lugar.
            </h1>

            <p className="mt-4 max-w-lg text-base text-slate/65 dark:text-white/60">
              Reservas, agenda, cobros, staff y marketplace — sin planillas, sin mensajes sueltos,
              sin herramientas separadas.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <NextLink
                href="/suscripcion"
                className="action-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
              >
                Ver planes
                <ArrowRight className="h-4 w-4" />
              </NextLink>
              <NextLink
                href="/shops"
                className="action-secondary inline-flex min-h-11 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
              >
                Ver marketplace
              </NextLink>
            </div>
          </div>

          {/* Right: stats */}
          <div className="grid gap-3">
            {publicMarketingSoftwareHero.stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                className="surface-card rounded-2xl p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate/55 dark:text-white/40">
                  {stat.label}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-ink dark:text-white">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Feature grid ────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        {/* Main feature card */}
        <motion.div
          {...fadeUp(0)}
          className="soft-panel flex flex-col justify-between gap-8 rounded-[1.8rem] p-6 md:p-8"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500 dark:bg-violet-500/20 dark:text-violet-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-[family-name:var(--font-heading)] text-2xl font-bold text-ink dark:text-white">
              Reservas y pagos
            </h2>
            <p className="mt-3 text-sm text-slate/65 dark:text-white/60">
              Reservas online por barbería, staff y servicio. El cliente elige pagar en el local o
              por checkout online — con validación final del horario en ambos casos.
            </p>
          </div>

          <div className="grid gap-2.5">
            {[
              'Pago online o en el local en el mismo flujo',
              'Disponibilidad real por barbero y servicio',
              'Reembolso automático si el local cancela',
            ].map((point) => (
              <div key={point} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400" />
                <span className="text-sm text-slate/75 dark:text-white/65">{point}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stacked secondary cards */}
        <div className="flex flex-col gap-4">
          {[
            {
              icon: <Calendar className="h-5 w-5" />,
              title: 'Operación del local',
              description:
                'Agenda diaria, bloqueos, ausencias, estados de cita y control operativo para admins y staff — desde web y mobile.',
            },
            {
              icon: <Store className="h-5 w-5" />,
              title: 'Crecimiento del negocio',
              description:
                'Marketplace público, reseñas verificadas, bolsa de trabajo, cursos y captación de modelos sobre la misma base de datos.',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              {...fadeUp(i * 0.1)}
              className="soft-panel flex flex-1 flex-col rounded-[1.8rem] p-6"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brass/12 text-brass">
                {feature.icon}
              </div>
              <h2 className="mt-3 font-[family-name:var(--font-heading)] text-xl font-bold text-ink dark:text-white">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm text-slate/65 dark:text-white/60">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <motion.div {...fadeUp()} className="soft-panel rounded-[1.8rem] p-6 md:p-8">
        <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-ink dark:text-white">
          Preguntas frecuentes
        </h2>
        <Divider className="my-4 bg-white/20 dark:bg-white/5" />
        <Accordion
          variant="splitted"
          itemClasses={{
            base: 'surface-card !shadow-none border-1 border-white/50 dark:border-white/6',
            title: 'text-sm font-semibold text-ink dark:text-slate-100',
            content: 'text-sm text-slate/80 dark:text-slate-300 pb-4',
            trigger: 'py-4 px-1',
            indicator: 'text-slate/60 dark:text-slate-400',
          }}
        >
          {publicMarketingSoftwareFaqs.map((item, index) => (
            <AccordionItem
              key={`faq-${index}`}
              aria-label={item.question}
              title={item.question}
            >
              {item.answer}
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>

      {/* ── Bottom CTA ──────────────────────────────────────────── */}
      <motion.div
        {...fadeUp()}
        className="soft-panel relative overflow-hidden rounded-[1.8rem] p-8 text-center md:p-12"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/6 blur-[120px] dark:bg-violet-500/10" />
        </div>
        <div className="relative z-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate/45 dark:text-white/40">
            Empezá hoy
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-4xl dark:text-white">
            Tu barbería, digitalizada.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-slate/65 dark:text-white/55">
            Agenda, pagos y marketplace en una sola plataforma. Sin configuraciones complejas.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <NextLink
              href="/suscripcion"
              className="action-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold"
            >
              Ver planes
              <ArrowRight className="h-4 w-4" />
            </NextLink>
            <NextLink
              href="/shops"
              className="action-secondary inline-flex min-h-11 items-center justify-center rounded-full px-7 py-3 text-sm font-semibold"
            >
              Explorar barberias
            </NextLink>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
