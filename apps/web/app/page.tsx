'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <section className="relative">
      <div className="relative z-10 flex min-h-[78vh] flex-col items-center justify-center px-6 text-center">
        <p className="rounded-full border border-slate-300/60 bg-white/68 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 backdrop-blur dark:border-white/15 dark:bg-white/5 dark:text-white/80">
          Navaja Barber
        </p>

        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 md:text-6xl dark:text-white">
          Gestiona reservas y operaciones sin ruido.
        </h1>

        <p className="mt-4 max-w-xl text-sm text-slate-700 md:text-base dark:text-white/75">
          Una plataforma clara para agendar, administrar y crecer.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            asChild
            size="lg"
            glass
            className="pointer-events-auto px-6 text-sm font-semibold !text-slate-900 hover:-translate-y-0.5 dark:!text-white"
            glassProps={{
              borderRadius: 999,
              borderWidth: 0.07,
              backgroundOpacity: 0.1,
              saturation: 1,
              brightness: 50,
              opacity: 0.93,
              blur: 11,
              displace: 0.5,
              distortionScale: -180,
              redOffset: 0,
              greenOffset: 10,
              blueOffset: 20,
              mixBlendMode: 'screen',
            }}
          >
            <Link href="/book" className="no-underline">
              Agendar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="secondary"
            glass
            className="pointer-events-auto px-6 text-sm font-semibold !text-slate-900 hover:-translate-y-0.5 dark:!text-white"
            glassProps={{
              borderRadius: 999,
              borderWidth: 0.07,
              backgroundOpacity: 0.1,
              saturation: 1,
              brightness: 50,
              opacity: 0.93,
              blur: 11,
              displace: 0.5,
              distortionScale: -180,
              redOffset: 0,
              greenOffset: 10,
              blueOffset: 20,
              mixBlendMode: 'screen',
            }}
          >
            <Link href="/courses" className="no-underline">
              Ver cursos
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
