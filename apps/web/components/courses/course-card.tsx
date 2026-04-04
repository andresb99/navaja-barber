'use client';

import { cn } from '@/lib/cn';
import { Button } from '@heroui/react';
import Link from 'next/link';

interface CourseCardProps {
  category: string;
  title: string;
  description: string;
  price: string;
  duration: string;
  level: string;
  shopName?: string;
  shopSlug?: string;
  imageUrl?: string | null;
  upcomingSessions?: number;
}

export function CourseCard({ category, title, description, price, duration, level, shopName, shopSlug, imageUrl, upcomingSessions }: CourseCardProps) {
  return (
    <div className="group relative bg-[#0a0a0c] border border-white/5 rounded-[2rem] flex flex-col h-full transition-all hover:border-[#c49cff]/30 hover:shadow-[0_0_40px_-10px_rgba(196,156,255,0.15)] overflow-hidden">
      {/* Course image */}
      {imageUrl && (
        <div className="relative w-full h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
          {typeof upcomingSessions === 'number' && upcomingSessions > 0 && (
            <div className="absolute top-4 right-4 bg-[#c49cff] text-[#2d0a6e] text-[8px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full">
              {upcomingSessions} {upcomingSessions === 1 ? 'SESIÓN' : 'SESIONES'}
            </div>
          )}
        </div>
      )}

      {/* Background glow on hover */}
      <div className="absolute -top-[20%] -right-[20%] w-[50%] h-[50%] bg-[#c49cff]/10 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="relative z-10 flex flex-col flex-1 p-6 sm:p-8">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[10px] font-black tracking-[0.3em] text-[#c49cff] uppercase">{category}</p>
            {shopName && (
              <>
                <span className="text-white/10">·</span>
                <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase truncate">{shopName}</p>
              </>
            )}
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight font-heading mb-4 group-hover:text-[#dcc8ff] transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed font-body line-clamp-3">
            {description}
          </p>
        </header>

        <div className="mt-auto pt-8 flex flex-col gap-8">
          <div className="grid grid-cols-3 gap-6 border-t border-white/5 pt-10">
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-black tracking-[0.2em] text-slate-500 uppercase">PRECIO</span>
              <span className="text-xl font-bold text-[#d0bcff] italic tracking-tight">{price}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-black tracking-[0.2em] text-slate-500 uppercase">DURACIÓN</span>
              <span className="text-xs font-black text-white uppercase">{duration}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-black tracking-[0.2em] text-slate-500 uppercase">NIVEL</span>
              <span className="text-xs font-black text-white uppercase">{level}</span>
            </div>
          </div>

          {shopSlug ? (
            <Link href={`/${shopSlug}/cursos`}>
              <Button
                variant="bordered"
                className="w-full h-14 rounded-xl border-white/10 text-white font-black tracking-[0.25em] text-[9px] uppercase hover:bg-white hover:text-black hover:border-white transition-all transform active:scale-[0.98]"
              >
                VER PROGRAMA
              </Button>
            </Link>
          ) : (
            <Button
              variant="bordered"
              className="w-full h-14 rounded-xl border-white/10 text-white font-black tracking-[0.25em] text-[9px] uppercase hover:bg-white hover:text-black hover:border-white transition-all transform active:scale-[0.98]"
            >
              VER PROGRAMA
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
