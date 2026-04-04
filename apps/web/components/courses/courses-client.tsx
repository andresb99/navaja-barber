'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CourseCard } from '@/components/courses/course-card';
import { Button, Slider, Switch } from '@heroui/react';
import { X, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';

// ── Normalized level system ──────────────────────────────────────────────────
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

// ── Duration buckets ─────────────────────────────────────────────────────────
type DurationBucket = 'all' | 'short' | 'medium' | 'long';
const DURATION_LABELS: Record<DurationBucket, string> = {
  all: 'TODOS',
  short: 'CORTO (≤5H)',
  medium: 'MEDIO (6-10H)',
  long: 'INTENSIVO (11H+)',
};

function getDurationBucket(hours: number): DurationBucket {
  if (hours <= 5) return 'short';
  if (hours <= 10) return 'medium';
  return 'long';
}

// ── Currency formatter ───────────────────────────────────────────────────────
function formatPrice(cents: number): string {
  const val = cents / 100;
  return val >= 1000 ? `$${(val / 1000).toFixed(1).replace(/\.0$/, '')}k` : `$${Math.round(val)}`;
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface CourseItem {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  duration_hours: number;
  level: string;
  image_url: string | null;
  shop_name: string;
  shop_slug: string;
  upcoming_sessions: number;
}

interface CoursesClientProps {
  courses: CourseItem[];
}

// ── Component ────────────────────────────────────────────────────────────────
export function CoursesClient({ courses }: CoursesClientProps) {
  const [activeLevel, setActiveLevel] = useState('Todos');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<DurationBucket>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 999999]);
  const [onlyWithSessions, setOnlyWithSessions] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Derive unique normalized levels from real data
  const levels = useMemo(() => {
    const uniqueLevels = new Set(courses.map((c) => normalizeLevel(c.level)));
    const order = ['Principiante', 'Intermedio', 'Avanzado', 'Profesional'];
    return ['Todos', ...order.filter((l) => uniqueLevels.has(l))];
  }, [courses]);

  // Derive price bounds from real data
  const priceBounds = useMemo(() => {
    const prices = courses.map((c) => c.price_cents);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [courses]);

  // Initialize price range on mount
  useEffect(() => {
    setPriceRange([priceBounds.min, priceBounds.max]);
  }, [priceBounds]);

  // Filter courses
  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (activeLevel !== 'Todos' && normalizeLevel(c.level) !== activeLevel) return false;
      if (selectedDuration !== 'all' && getDurationBucket(c.duration_hours) !== selectedDuration) return false;
      if (c.price_cents < priceRange[0] || c.price_cents > priceRange[1]) return false;
      if (onlyWithSessions && c.upcoming_sessions === 0) return false;
      return true;
    });
  }, [courses, activeLevel, selectedDuration, priceRange, onlyWithSessions]);

  const resetFilters = () => {
    setActiveLevel('Todos');
    setSelectedDuration('all');
    setPriceRange([priceBounds.min, priceBounds.max]);
    setOnlyWithSessions(false);
  };

  return (
    <div className="selection:bg-[#c49cff]/30 min-h-screen">
      <div className="py-12 sm:py-20 px-4 sm:px-10 max-w-7xl mx-auto">

        {/* ── LEVEL PILLS + FILTER BUTTON ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-16">
          <div className="flex flex-wrap items-center gap-3">
            {levels.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setActiveLevel(lvl)}
                className={cn(
                  "h-11 px-6 rounded-full text-[10px] sm:text-[11px] font-black tracking-widest uppercase transition-all transform active:scale-95",
                  activeLevel === lvl
                    ? "bg-[#c49cff] text-[#2d0a6e] shadow-[0_4px_20px_-5px_rgba(196,156,255,0.4)]"
                    : "bg-default-100 text-default-500 border border-transparent hover:border-default-300"
                )}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6 self-end sm:self-auto">
            <span className="text-[10px] font-black tracking-widest text-default-400 uppercase">
              {filtered.length} {filtered.length === 1 ? 'PROGRAMA' : 'PROGRAMAS'}
            </span>
            <button
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-2 text-[10px] font-black tracking-widest text-foreground hover:text-[#c49cff] transition-colors uppercase"
            >
              <SlidersHorizontal className="w-4 h-4" />
              FILTROS
            </button>
          </div>
        </div>

        {/* ── COURSE GRID ─────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-default-400 text-sm uppercase tracking-widest font-bold">No se encontraron cursos con estos filtros</p>
            <button onClick={resetFilters} className="mt-4 text-[#c49cff] text-xs font-bold uppercase tracking-widest hover:underline">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {filtered.map((course, idx) => (
              <div key={course.id} className="animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
                <CourseCard
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
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FILTER DRAWER (PORTAL) ────────────────────────────────────────── */}
      {mounted && createPortal(
        <>
          {/* Backdrop */}
          <div
            className={cn(
              "fixed inset-0 z-[9998] bg-black/70 transition-opacity duration-200 ease-out",
              isFilterOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setIsFilterOpen(false)}
          />

          {/* Panel */}
          <aside
            className={cn(
              "fixed top-0 right-0 bottom-0 z-[9999] w-full max-w-md bg-[#0a0a0c] border-l border-white/5 p-8 sm:p-10 flex flex-col transition-transform duration-200 ease-out will-change-transform",
              isFilterOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">FILTROS</h2>
                <div className="h-1 w-8 bg-[#c49cff] mt-1" />
              </div>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#c49cff] text-white hover:text-[#2d0a6e] transition-colors active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {/* NIVEL */}
              <section className="mb-12">
                <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-6">NIVEL</h3>
                <div className="space-y-3">
                  {levels.filter((l) => l !== 'Todos').map((level) => {
                    const isActive = activeLevel === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setActiveLevel(isActive ? 'Todos' : level)}
                        className={cn(
                          "w-full flex items-center justify-between p-5 rounded-2xl border cursor-pointer group transition-colors text-left",
                          isActive
                            ? "bg-[#c49cff]/10 border-[#c49cff]"
                            : "bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05]"
                        )}
                      >
                        <span className={cn("text-[11px] font-bold tracking-widest uppercase transition-colors",
                          isActive ? "text-white" : "text-white/40 group-hover:text-white/60")}>
                          {level}
                        </span>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          isActive ? "border-[#c49cff]" : "border-white/10"
                        )}>
                          {isActive && <div className="w-2.5 h-2.5 rounded-full bg-[#c49cff]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* DURACIÓN */}
              <section className="mb-12">
                <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-6">DURACIÓN</h3>
                <div className="flex flex-wrap gap-3">
                  {(Object.entries(DURATION_LABELS) as [DurationBucket, string][]).map(([key, label]) => {
                    const isActive = selectedDuration === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDuration(key)}
                        className={cn(
                          "h-10 px-5 rounded-full text-[9px] font-bold tracking-widest uppercase transition-colors",
                          isActive
                            ? "bg-[#c49cff] text-[#2d0a6e] font-black"
                            : "border border-white/5 bg-white/[0.03] text-white/40 hover:text-white hover:border-white/10"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* RANGO DE PRECIO */}
              <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">PRECIO</h3>
                  <span className="text-xs font-black text-[#dcc8ff] italic">
                    {formatPrice(priceRange[0])} — {formatPrice(priceRange[1])}
                  </span>
                </div>
                <Slider
                  step={5000}
                  minValue={priceBounds.min}
                  maxValue={priceBounds.max}
                  value={priceRange}
                  onChange={(val) => setPriceRange(val as [number, number])}
                  showSteps={false}
                  classNames={{
                    track: "bg-white/10 h-1.5",
                    filler: "bg-[#c49cff]",
                    thumb: "bg-white border-2 border-[#c49cff] h-5 w-5"
                  }}
                />
              </section>

              {/* ATRIBUTOS */}
              <section className="mb-12">
                <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-6">ATRIBUTOS</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Solo con sesiones abiertas</span>
                    <Switch
                      size="sm"
                      isSelected={onlyWithSessions}
                      onValueChange={setOnlyWithSessions}
                      classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-[#c49cff]" }}
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="pt-8 border-t border-white/5">
              <Button
                onPress={() => setIsFilterOpen(false)}
                className="w-full h-16 bg-[#c49cff] text-[#2d0a6e] font-black tracking-[0.2em] text-xs uppercase rounded-xl transition-transform hover:scale-[1.02] active:scale-95 group"
              >
                VER {filtered.length} {filtered.length === 1 ? 'RESULTADO' : 'RESULTADOS'}
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
              <button
                onClick={() => { resetFilters(); setIsFilterOpen(false); }}
                className="w-full mt-6 text-[10px] font-bold tracking-[0.2em] text-white/20 hover:text-white/40 transition-colors uppercase"
              >
                LIMPIAR FILTROS
              </button>
            </div>
          </aside>
        </>,
        document.body
      )}

      <style jsx global>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(196, 156, 255, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(196, 156, 255, 0.4); }
      `}</style>
    </div>
  );
}
