'use client';

import { useState, useEffect, useMemo, useRef, useCallback, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { CourseCard } from '@/components/courses/course-card';
import { CourseGridSkeleton } from '@/components/courses/course-skeleton';
import { Button, Slider, Switch } from '@heroui/react';
import { X, ChevronRight, SlidersHorizontal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fetchCourses, type CourseItem, type CourseFilters, type CoursesMeta } from '@/lib/actions/courses';

// ── Helpers ──────────────────────────────────────────────────────────────────
const LEVEL_MAP: Record<string, string> = {
  beginner: 'Principiante',
  'beginner / intermediate': 'Principiante',
  inicial: 'Principiante',
  intermediate: 'Intermedio',
  intermedio: 'Intermedio',
  advanced: 'Avanzado',
  avanzado: 'Avanzado',
  professional: 'Profesional',
  profesional: 'Profesional',
};

function normalizeLevel(raw: string): string {
  return LEVEL_MAP[raw.toLowerCase().trim()] ?? raw;
}

type DurationBucket = 'all' | 'short' | 'medium' | 'long';
const DURATION_LABELS: Record<DurationBucket, string> = {
  all: 'TODOS',
  short: 'CORTO (≤5H)',
  medium: 'MEDIO (6-10H)',
  long: 'INTENSIVO (11H+)',
};

function formatPrice(cents: number): string {
  const val = cents / 100;
  return val >= 1000 ? `$${(val / 1000).toFixed(1).replace(/\.0$/, '')}k` : `$${Math.round(val)}`;
}

interface CoursesClientProps {
  initialCourses: CourseItem[];
  initialHasMore: boolean;
  initialTotal: number;
  meta: CoursesMeta;
}

export function CoursesClient({ initialCourses, initialHasMore, initialTotal, meta }: CoursesClientProps) {
  const [activeLevel, setActiveLevel] = useState('Todos');
  const [selectedDuration, setSelectedDuration] = useState<DurationBucket>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([meta.priceMin, meta.priceMax]);
  const [onlyWithSessions, setOnlyWithSessions] = useState(false);
  const [sortBy, setSortBy] = useState<CourseFilters['sortBy']>('newest');

  const [courses, setCourses] = useState<CourseItem[]>(initialCourses);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const bufferRef = useRef<{ page: number; courses: CourseItem[]; hasMore: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);
  const closingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeFilter = useCallback(() => {
    if (isFilterClosing) return;
    setIsFilterClosing(true);
    closingTimer.current = setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 200);
  }, [isFilterClosing]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const prevFiltersRef = useRef(JSON.stringify({}));

  useEffect(() => { setMounted(true); }, []);

  const currentFilters = useMemo((): CourseFilters => ({
    level: activeLevel !== 'Todos' ? activeLevel : undefined,
    durationBucket: selectedDuration !== 'all' ? selectedDuration : undefined,
    priceMin: priceRange[0] > meta.priceMin ? priceRange[0] : undefined,
    priceMax: priceRange[1] < meta.priceMax ? priceRange[1] : undefined,
    onlyWithSessions: onlyWithSessions || undefined,
    sortBy,
  }), [activeLevel, selectedDuration, priceRange, onlyWithSessions, sortBy, meta]);

  const levels = useMemo(() => ['Todos', ...meta.levels], [meta.levels]);

  const prefetchNext = useCallback(async (currentPage: number, filters: CourseFilters) => {
    const nextPage = currentPage + 1;
    try {
      const result = await fetchCourses(filters, nextPage);
      bufferRef.current = { page: nextPage, courses: result.courses, hasMore: result.hasMore };
    } catch { bufferRef.current = null; }
  }, []);

  const applyFilters = useCallback(async (filters: CourseFilters) => {
    bufferRef.current = null;
    try {
      const result = await fetchCourses(filters, 0);
      setCourses(result.courses);
      setPage(0);
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
      if (result.hasMore) prefetchNext(0, filters);
    } catch (e) { console.error(e); }
  }, [prefetchNext]);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return;
    isLoadingRef.current = true;
    setIsLoadingMore(true);

    const nextPage = page + 1;
    if (bufferRef.current && bufferRef.current.page === nextPage) {
      const buffered = bufferRef.current;
      bufferRef.current = null;
      setCourses((prev) => {
        const existingIds = new Set(prev.map(c => c.id));
        const newOnes = buffered.courses.filter(c => !existingIds.has(c.id));
        return [...prev, ...newOnes];
      });
      setPage(nextPage);
      setHasMore(buffered.hasMore);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
      if (buffered.hasMore) prefetchNext(nextPage, currentFilters);
      return;
    }

    try {
      const result = await fetchCourses(currentFilters, nextPage);
      setCourses((prev) => {
        const existingIds = new Set(prev.map(c => c.id));
        const newOnes = result.courses.filter(c => !existingIds.has(c.id));
        return [...prev, ...newOnes];
      });
      setPage(nextPage);
      setHasMore(result.hasMore);
      if (result.hasMore) prefetchNext(nextPage, currentFilters);
    } catch (e) { console.error(e); } finally {
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [page, hasMore, currentFilters, prefetchNext]);

  useEffect(() => {
    const filtersKey = JSON.stringify(currentFilters);
    if (prevFiltersRef.current === filtersKey) return;
    const timer = setTimeout(() => {
      prevFiltersRef.current = filtersKey;
      startTransition(() => { applyFilters(currentFilters); });
    }, 300);
    return () => clearTimeout(timer);
  }, [currentFilters, applyFilters]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore && !isLoadingRef.current) loadMore();
    }, { rootMargin: '600px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  const resetFilters = () => {
    setActiveLevel('Todos');
    setSelectedDuration('all');
    setPriceRange([meta.priceMin, meta.priceMax]);
    setOnlyWithSessions(false);
    setSortBy('newest');
  };

  const sortOptions: { value: CourseFilters['sortBy'], label: string }[] = [
    { value: 'newest', label: 'Más recientes' },
    { value: 'popular', label: 'Más populares' },
    { value: 'rating', label: 'Mejor calificados' },
  ];

  return (
    <div className="selection:bg-[#c49cff]/30 min-h-screen pb-20">
      <div className="py-12 sm:py-20 px-4 sm:px-10 max-w-7xl mx-auto">
        
        {/* ── HEADER ── */}
        <div className="flex flex-col gap-8 mb-16">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic sm:hidden leading-none">Cursos</h1>
            <div className="flex items-center gap-6 ml-auto">
              <span className={cn(
                "text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1",
                isPending ? "text-[#c49cff]" : "text-slate-400 dark:text-white/20"
              )}>
                {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                <span className="hidden sm:inline">{isPending ? 'SINCRONIZANDO...' : `${totalCount} PROGRAMAS`}</span>
                <span className="sm:hidden">{totalCount}</span>
              </span>

              <button
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-2 text-[10px] font-black tracking-widest text-[#c49cff] hover:text-slate-900 dark:hover:text-white transition-colors uppercase sm:border-l border-slate-100 dark:border-white/10 sm:pl-6"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline text-slate-900 dark:text-white">FILTROS</span>
                <span className="sm:hidden text-[8px] border border-[#c49cff]/20 px-2 py-1 rounded-md">FILTRAR</span>
              </button>
            </div>
          </div>

          {/* Horizontal Sort Scroll */}
          <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-3 overflow-x-auto pb-4 sm:pb-0 sm:flex-wrap hide-scrollbar">
              <span className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mr-2 shrink-0 hidden sm:inline">ORDENAR</span>
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={cn(
                    "h-11 px-6 rounded-full text-[10px] sm:text-[11px] font-black tracking-widest uppercase transition-all transform active:scale-95 whitespace-nowrap shrink-0",
                    sortBy === opt.value
                      ? "bg-[#c49cff] text-[#2d0a6e] shadow-[0_4px_20px_-5px_rgba(196,156,255,0.4)]"
                      : "bg-slate-50 dark:bg-default-100 text-slate-400 dark:text-white/40 border border-slate-100 dark:border-transparent hover:border-slate-200 dark:hover:border-default-300"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── GRID ── */}
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 transition-opacity duration-500 ease-in-out",
          isPending ? "opacity-20 cursor-wait pointer-events-none" : "opacity-100"
        )} style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
          {courses.length === 0 && !isPending ? (
            <div className="col-span-full text-center py-40">
              <p className="text-slate-300 dark:text-white/20 text-xs font-black uppercase tracking-[0.3em]">No hay resultados con estos filtros</p>
              <button 
                onClick={resetFilters} 
                className="mt-6 h-12 px-8 rounded-full border border-slate-100 dark:border-white/10 text-[#c49cff] text-[10px] font-black uppercase tracking-widest hover:bg-[#c49cff]/5 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              {courses.map((course, idx) => (
                <div key={`${course.id}-${idx}`} className="will-change-transform">
                  <CourseCard
                    courseId={course.id}
                    category={normalizeLevel(course.level)}
                    title={course.title}
                    description={course.description}
                    price={formatPrice(course.price_cents)}
                    duration={`${course.duration_hours}h`}
                    level={normalizeLevel(course.level)}
                    shopName={course.shop_name}
                    shopSlug={course.shop_slug}
                    imageUrl={course.image_url}
                    upcomingSessions={course.upcoming_sessions}
                    ratingAvg={course.rating_avg}
                    reviewCount={course.enrollments_count || 0}
                  />
                </div>
              ))}
              {isLoadingMore && <CourseGridSkeleton count={2} />}
            </>
          )}
          
          {/* Scroll Target */}
          <div ref={sentinelRef} className="h-20 w-full" />
        </div>
      </div>

      {/* ── FILTER DRAWER (Portal to avoid nesting issues) ── */}
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
                <span className="text-[10px] font-black text-[#c49cff]">{totalCount}</span>
              </div>
              <button onClick={closeFilter} className="p-3 bg-slate-50 dark:bg-white/5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-12 pb-10">
              {/* Level Pills */}
              <section>
                <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-white/20 uppercase mb-6 text-left">NIVEL ACADÉMICO</h3>
                <div className="flex flex-wrap gap-2">
                  {levels.filter(l => l !== 'Todos').map((level) => {
                    const isActive = activeLevel === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setActiveLevel(isActive ? 'Todos' : level)}
                        className={cn(
                          "h-10 px-5 rounded-full text-[9px] font-black tracking-widest uppercase transition-all",
                          isActive ? "bg-[#c49cff] text-[#2d0a6e]" : "bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Duration Pills */}
              <section>
                <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-white/20 uppercase mb-6 text-left">DURACIÓN</h3>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(DURATION_LABELS) as [DurationBucket, string][]).map(([key, label]) => {
                    const isActive = selectedDuration === key;
                    return (
                      <button key={key} onClick={() => setSelectedDuration(key)} className={cn("h-10 px-5 rounded-full text-[9px] font-black tracking-widest uppercase transition-all", isActive ? "bg-[#c49cff] text-[#2d0a6e]" : "bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white")}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Price Slider */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-white/20 uppercase">PRECIO</h3>
                  <span className="text-[10px] font-black text-[#c49cff] tracking-widest">{formatPrice(priceRange[0])} — {formatPrice(priceRange[1])}</span>
                </div>
                <Slider step={5000} minValue={meta.priceMin} maxValue={meta.priceMax} value={priceRange} onChange={(val) => setPriceRange(val as [number, number])} className="max-w-md" classNames={{ track: "bg-slate-100 dark:bg-white/5 h-1.5 rounded-full", filler: "bg-[#c49cff]", thumb: "bg-white border-2 border-slate-200 dark:border-[#16161a] w-6 h-6 after:hidden shadow-lg" }} />
              </section>

              {/* Toggles */}
              <section>
                <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-white/20 uppercase mb-6 text-left">ESTADO</h3>
                <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Solo con inscripciones</span>
                  <Switch isSelected={onlyWithSessions} onValueChange={setOnlyWithSessions} size="sm" classNames={{ wrapper: "bg-slate-200 dark:bg-white/10 group-data-[selected=true]:bg-[#c49cff]" }} />
                </div>
              </section>
            </div>

            <div className="pt-8 mt-auto border-t border-slate-100 dark:border-white/5 space-y-4">
              <Button onPress={closeFilter} className="w-full h-16 bg-[#c49cff] text-[#2d0a6e] font-black tracking-[0.2em] text-xs uppercase rounded-xl shadow-[0_10px_30px_-10px_rgba(196,156,255,0.4)] transition-transform active:scale-[0.98]">
                VER RESULTADOS
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
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
