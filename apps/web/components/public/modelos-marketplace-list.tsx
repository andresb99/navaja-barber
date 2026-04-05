'use client';

import { useState, useEffect, useMemo, useRef, useCallback, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Button, Slider, Switch, Avatar, Card, CardBody } from '@heroui/react';
import { X, ChevronRight, SlidersHorizontal, Loader2, ArrowUpRight, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';
import { buildTenantCanonicalHref } from '@/lib/tenant-public-urls';
import { MarketplaceEnrollmentModal } from '@/components/public/marketplace-enrollment-modal';
import { MarketplaceItemCard } from '@/components/public/marketplace-item-card';
import type { MarketplaceOpenModelCall } from '@/lib/modelos';
import { modelRegistrationInputSchema } from '@navaja/shared';

interface ModelosMarketplaceListProps {
  calls: MarketplaceOpenModelCall[];
}

function normalizeFilterValue(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export function ModelosMarketplaceList({ calls }: ModelosMarketplaceListProps) {
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [activeLocation, setActiveLocation] = useState('Todas');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  
  // UI State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);
  const closingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<{
    title: string;
    description: string;
    shopId: string;
    sessions: Array<{ id: string; dateLabel: string; seatsLeft: number }>;
  } | null>(null);

  const normalizeValue = useCallback((value: string | null | undefined) => {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }, []);

  const closeFilter = useCallback(() => {
    if (isFilterClosing) return;
    setIsFilterClosing(true);
    closingTimer.current = setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 200);
  }, [isFilterClosing]);

  const handleModalClose = () => {
    setSelectedCourse(null);
    setError(null);
    setMessage(null);
  };

  const handleModelSubmit = async (formData: any) => {
    setError(null);
    setMessage(null);

    const parsed = modelRegistrationInputSchema.safeParse({
      shop_id: selectedCourse?.shopId,
      session_id: formData.sessionId,
      full_name: formData.name,
      phone: formData.phone,
      email: formData.email || null,
      consent_photos_videos: formData.consent,
      marketing_opt_in: false,
      notes: formData.notes || null,
    });

    if (!parsed.success) {
      setError('Por favor, revisa los datos del formulario.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/modelos/registro', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        setError(await response.text());
        return;
      }

      setMessage('¡Postulación enviada! Te contactaremos por WhatsApp si encajas en la sesión.');
      setTimeout(() => {
        handleModalClose();
      }, 2500);
    } catch (err) {
      setError('Error al enviar la postulación. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Grouping & Filtering Logic (Matches CoursesClient transition pattern)
  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    calls.forEach(c => {
      if (Array.isArray(c.model_categories)) {
        c.model_categories.forEach(cat => categories.add(String(cat || '').trim()));
      }
    });
    return Array.from(categories).sort();
  }, [calls]);

  const locationOptions = useMemo(() => {
    const locations = new Set<string>();
    calls.forEach(c => {
      if (c.location) locations.add(c.location.trim());
    });
    return Array.from(locations).sort();
  }, [calls]);

  const filteredGroups = useMemo(() => {
    const groups = new Map<string, any>();
    
    calls.forEach((call) => {
      // Category filter
      if (activeCategory !== 'Todas') {
        const hasCategory = Array.isArray(call.model_categories) && 
          call.model_categories.some(c => String(c).trim() === activeCategory);
        if (!hasCategory) return;
      }
      
      // Location filter
      if (activeLocation !== 'Todas') {
        if (call.location?.trim() !== activeLocation) return;
      }

      const key = `${call.shop_id}-${call.course_title}`;
      if (!groups.has(key)) {
        groups.set(key, { ...call, sessions: [call] });
      } else {
        groups.get(key)!.sessions.push(call);
      }
    });

    const result = Array.from(groups.values());
    
    // Sort logic
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [calls, activeCategory, activeLocation, sortBy]);

  const handleOpenModal = useCallback((course: any) => {
    setSelectedCourse({
      title: course.course_title,
      description: course.notes_public || '',
      shopId: course.shop_id,
      sessions: course.sessions.map((s: any) => ({
        id: s.session_id,
        dateLabel: new Date(s.start_at).toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' }),
        seatsLeft: s.models_needed || 1,
      })),
    });
  }, []);

  const resetFilters = () => {
    setActiveCategory('Todas');
    setActiveLocation('Todas');
    setSortBy('newest');
  };

  const sortOptions: { value: 'newest' | 'popular', label: string }[] = [
    { value: 'newest', label: 'Más recientes' },
    { value: 'popular', label: 'Más populares' },
  ];

  return (
    <div className="selection:bg-[#c49cff]/30 min-h-screen">
      <div className="py-8 sm:py-12">
        {/* ── MODERN HEADER (Premium UX) ── */}
        <div className="flex flex-col gap-10 mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-px bg-[#c49cff]" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c49cff]">
                  Marketplace 
                </p>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">
                Convocatorias <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c49cff] to-[#9d50bb]">Abiertas</span>
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-4 md:gap-6 ml-auto md:ml-0">
              <span className={cn(
                "text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5",
                isPending ? "text-[#c49cff]" : "text-slate-400 dark:text-white/20"
              )}>
                {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                <span>{filteredGroups.length} SESIONES DISPONIBLES</span>
              </span>

              <div className="flex items-center gap-3">
                 <Link 
                  href="/modelos/registro" 
                  className="h-11 px-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black tracking-widest uppercase flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  PERFIL MODELO
                </Link>

                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="h-11 px-5 flex items-center gap-2 text-[10px] font-black tracking-widest text-[#c49cff] hover:text-slate-900 dark:hover:text-white transition-colors uppercase border border-slate-100 dark:border-white/10 rounded-full bg-white dark:bg-transparent"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>FILTROS</span>
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal Sort Scroll */}
          <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-3 overflow-x-auto pb-4 sm:pb-0 sm:flex-wrap hide-scrollbar">
              <span className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mr-2 shrink-0 hidden sm:inline">ORDENAR POR</span>
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={cn(
                    "h-10 px-6 rounded-full text-[10px] font-black tracking-widest uppercase transition-all transform active:scale-95 whitespace-nowrap shrink-0",
                    sortBy === opt.value
                      ? "bg-[#c49cff] text-[#2d0a6e] shadow-[0_4px_20px_-5px_rgba(196,156,255,0.4)]"
                      : "bg-slate-50 dark:bg-white/[0.03] text-slate-400 dark:text-white/40 border border-slate-100 dark:border-transparent hover:border-slate-200 dark:hover:border-white/10"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── GRID (Unified Gap & Styling) ── */}
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 transition-opacity duration-500 ease-in-out",
          isPending ? "opacity-20 cursor-wait pointer-events-none" : "opacity-100"
        )}>
          {filteredGroups.length === 0 ? (
            <div className="col-span-full text-center py-40">
              <p className="text-slate-300 dark:text-white/20 text-xs font-black uppercase tracking-[0.3em]">No hay convocatorias con estos filtros</p>
              <button 
                onClick={resetFilters} 
                className="mt-6 h-12 px-8 rounded-full border border-slate-100 dark:border-white/10 text-[#c49cff] text-[10px] font-black uppercase tracking-widest hover:bg-[#c49cff]/5 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            filteredGroups.map((course) => {
              const isAcademic = course.notes_public?.toLowerCase().includes('académica') || !course.model_categories?.length;
              const levelKey = (course.course_level || '').toLowerCase();
              const levelLabel = (LEVEL_LABELS[levelKey] ?? course.course_level) || 'General';
              
              return (
                <div key={`${course.shop_id}-${course.course_title}`} className="will-change-transform">
                  <MarketplaceItemCard
                    id={`${course.shop_id}-${course.course_title}`}
                    type="model"
                    category={isAcademic ? 'Academia' : 'Casting'}
                    title={course.course_title}
                    description={course.notes_public || 'Participa en esta sesión exclusiva académica/editorial.'}
                    imageUrl={course.course_image_url}
                    shopName={course.shop_name}
                    date={String(course.location || 'PRÓXIMAMENTE')}
                    location={String(course.location || course.shop_name)}
                    upcomingSessions={course.sessions.reduce((acc: number, s: any) => acc + (s.models_needed || 0), 0)}
                    primaryAction={{
                      label: 'POSTULARME',
                      onPress: () => setSelectedCourse({
                        title: course.course_title,
                        description: course.notes_public || '',
                        shopId: course.shop_id,
                        sessions: course.sessions.map((s: any) => ({
                          id: s.session_id,
                          dateLabel: new Date(s.start_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase(),
                          seatsLeft: s.models_needed
                        }))
                      })
                    }}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── FILTER DRAWER (Unified Logic) ── */}
      {isFilterOpen && createPortal(
        <>
          <div
            className={cn('fixed inset-0 bg-white/30 dark:bg-black/70 z-[90] transition-opacity duration-300', isFilterClosing ? 'opacity-0' : 'opacity-100')}
            onClick={closeFilter}
          />
          <aside className={cn('fixed right-0 top-0 h-full w-[400px] z-[100] bg-white dark:bg-[#0a0a0b] text-slate-900 dark:text-white p-8 flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_40px_rgba(0,0,0,0.5)]', isFilterClosing ? 'animate-slide-out-right' : 'animate-slide-in-right')}>
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-black italic tracking-tighter uppercase">FILTROS</h2>
                <span className="text-[10px] font-black text-[#c49cff]">{filteredGroups.length}</span>
              </div>
              <button onClick={closeFilter} className="p-3 bg-slate-50 dark:bg-white/5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-12 pb-10">
              {/* Category Pills */}
              <section>
                <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-white/20 uppercase mb-6 text-left">CATEGORÍA</h3>
                <div className="flex flex-wrap gap-2">
                  {['Todas', ...categoryOptions].map((cat) => {
                    const isActive = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          "h-10 px-5 rounded-full text-[9px] font-black tracking-widest uppercase transition-all",
                          isActive ? "bg-[#c49cff] text-[#2d0a6e]" : "bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Location Pills */}
              <section>
                <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-white/20 uppercase mb-6 text-left">UBICACIÓN</h3>
                <div className="flex flex-wrap gap-2">
                  {['Todas', ...locationOptions].map((loc) => {
                    const isActive = activeLocation === loc;
                    return (
                      <button
                        key={loc}
                        onClick={() => setActiveLocation(loc)}
                        className={cn(
                          "h-10 px-5 rounded-full text-[9px] font-black tracking-widest uppercase transition-all",
                          isActive ? "bg-[#c49cff] text-[#2d0a6e]" : "bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="pt-8 mt-auto border-t border-slate-100 dark:border-white/5 space-y-4">
              <Button onPress={closeFilter} className="w-full h-16 bg-[#c49cff] text-[#2d0a6e] font-black tracking-[0.2em] text-xs uppercase rounded-xl shadow-[0_10px_30px_-10px_rgba(196,156,255,0.4)] transition-transform active:scale-[0.98]">
                VER CONVOCATORIAS
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <button onClick={resetFilters} className="w-full text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-white/20 hover:text-slate-900 dark:hover:text-white/40 transition-colors uppercase">
                RESETEAR
              </button>
            </div>
          </aside>
        </>,
        document.body
      )}

      <AnimatePresence>
        {selectedCourse && (
          <MarketplaceEnrollmentModal
            key="model-enrollment-modal"
            type="model"
            title={selectedCourse.title}
            sessions={selectedCourse.sessions}
            isOpen={!!selectedCourse}
            onClose={handleModalClose}
            onSubmit={handleModelSubmit}
            isLoading={isSubmitting}
            error={error}
            message={message}
          />
        )}
      </AnimatePresence>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slide-out-right { from { transform: translateX(0); } to { transform: translateX(100%); } }
        .animate-slide-out-right { animation: slide-out-right 0.2s cubic-bezier(0.4, 0, 1, 1) forwards; }
      `}</style>
    </div>
  );
}
