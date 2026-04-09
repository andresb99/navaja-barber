'use client';

import { cn } from '@/lib/cn';

/* ══════════════════════════════════════════════════════════════════════
   DESIGN PRIMITIVES — Shared class builders & micro-components
   for the Beardly public-facing UI.

   These encode the repeated visual patterns (colors, typography,
   spacing, shadows) into a single source of truth so every page
   stays consistent without duplicating 100-char className strings.
   ══════════════════════════════════════════════════════════════════════ */

// ── Color tokens (semantic aliases for the purple brand palette) ─────

/**
 * Obsidian Neon — official brand palette.
 *
 * Dark mode (primary use):
 *   primary       #BE9BFF   — CTA backgrounds, accent text
 *   secondary     #212121   — surface / inactive bg
 *   tertiary      #8A5CF5   — active accents, progress
 *   neutral       #0F0F0F   — deep / page bg
 *   primary-light #D0BCFF   — selected chips, lighter variant
 *   on-primary    #1A0042   — text on primary bg
 *
 * Tailwind tokens: `bg-brand-primary`, `text-brand-tertiary`, etc.
 * CSS vars: `--brand-primary`, `--brand-secondary`, etc.
 */
const BRAND = {
  /** Primary CTA background — Explicit Lilac #D0BCFF to match brand sync */
  bg: '!bg-[#D0BCFF] hover:!bg-[#D0BCFF] !opacity-100 hover:!opacity-100',
  /** Text on primary CTA — Explicit White per user request */
  onBg: '!text-white hover:!text-white data-[hover=true]:!text-white',
  /** Primary text accent */
  text: 'text-[#D0BCFF]',
  /** White text for pill/chip on primary bg */
  textOnPurple: '!text-white',
  /** Glow shadow (small) */
  shadowSm: 'shadow-[0_4px_10px_rgba(208,188,255,0.3)]',
  /** Glow shadow (medium, hover) */
  shadowMd: 'hover:shadow-[0_4px_12px_rgba(208,188,255,0.35)]',
  /** Glow shadow (large, pill active) */
  shadowLg: 'shadow-[0_4px_20px_-5px_rgba(208,188,255,0.5)]',
} as const;

/**
 * Booking-flow / immersive dark palette — maps to Obsidian Neon tokens.
 *
 * | Semantic       | Token               | Dark hex  | Role                          |
 * |----------------|---------------------|-----------|-------------------------------|
 * | lilac          | brand-primary-light  | #D0BCFF   | Selected chips, flow CTAs     |
 * | accent         | brand-tertiary       | #8A5CF5   | Active accents, progress      |
 * | onLilac        | brand-on-primary     | #1A0042   | Text on lilac bg              |
 * | surface        | brand-secondary      | #212121   | Inactive surface / cards      |
 * | deep           | brand-neutral        | #0F0F0F   | Deep background               |
 */
export const FLOW = {
  primary: '#D0BCFF',     // → brand-primary (the lilac you love)
  accent: '#A078FF',      // → brand-tertiary
  onPrimary: '#23005C',   // → brand-on-primary
  surface: '#212121',     // → brand-secondary
  deep: '#0F0F0F',        // → brand-neutral
  raised: '#1a1a1a',      // slightly above secondary
  body: '#cbc3d7',        // body text
} as const;

const FLOW_CLS = {
  /** Primary bg — #D0BCFF lilac */
  bg: 'bg-brand-primary',
  /** Text on primary bg */
  onBg: 'text-brand-on-primary',
  /** Accent text — #8A5CF5 */
  text: 'text-brand-tertiary',
  /** Accent bg (active icons, toggles) */
  accentBg: 'bg-brand-tertiary',
  /** Surface bg (inactive cards, pills) */
  surface: 'bg-brand-secondary',
  /** Deep bg */
  deep: 'bg-brand-neutral',
  /** Raised / hover bg */
  raised: 'bg-[#1a1a1a]',
  /** Body text */
  body: 'text-[#cbc3d7]',
  /** Glow shadow for selected states */
  glow: 'shadow-[0_0_20px_-5px_rgba(160,120,255,0.5)]',
} as const;

// ── Shared interaction micro-classes ────────────────────────────────
const PRESS = 'transition-all hover:scale-[1.01] active:scale-[0.98]';

// ─────────────────────────────────────────────────────────────────────
// 1. CTA BUTTON
// ─────────────────────────────────────────────────────────────────────

type CtaSize = 'sm' | 'md' | 'lg';

const CTA_SIZES: Record<CtaSize, string> = {
  sm: 'h-11 text-[10px]',
  md: 'h-14 text-[11px]',
  lg: 'h-16 text-[11px]',
};

const CTA_RADIUS: Record<CtaSize, string> = {
  sm: 'rounded-full',
  md: 'rounded-[1.5rem]',
  lg: 'rounded-[2rem]',
};

/**
 * Class-string for the primary purple CTA button.
 *
 * ```tsx
 * <Button className={ctaButtonClass()}>BOOK NOW</Button>
 * <Button className={ctaButtonClass({ size: 'lg' })}>SAVE</Button>
 * ```
 */
export function ctaButtonClass(opts?: {
  size?: CtaSize;
  fullWidth?: boolean;
  hasShadow?: boolean;
  className?: string;
}) {
  const { size = 'md', fullWidth = true, hasShadow = true, className } = opts ?? {};
  return cn(
    BRAND.bg,
    BRAND.onBg,
    hasShadow && BRAND.shadowSm,
    BRAND.shadowMd,
    CTA_SIZES[size],
    CTA_RADIUS[size],
    'font-black tracking-widest uppercase',
    PRESS,
    fullWidth && 'w-full',
    className,
  );
}

// ─────────────────────────────────────────────────────────────────────
// 2. GHOST / BORDERED BUTTON
// ─────────────────────────────────────────────────────────────────────

/**
 * Class-string for the secondary ghost (outlined) button.
 */
export function ghostButtonClass(opts?: {
  size?: CtaSize;
  fullWidth?: boolean;
  className?: string;
}) {
  const { size = 'lg', fullWidth = false, className } = opts ?? {};
  return cn(
    'border-white/10 text-white',
    CTA_SIZES[size],
    CTA_RADIUS[size],
    'font-[1000] uppercase tracking-[0.2em]',
    'transition-all duration-300 hover:bg-white/10',
    PRESS,
    fullWidth && 'w-full',
    className,
  );
}

// ─────────────────────────────────────────────────────────────────────
// 3. FILTER PILL (toggle)
// ─────────────────────────────────────────────────────────────────────

/**
 * Class-string for a filter/sort pill toggle.
 *
 * ```tsx
 * <button className={filterPillClass(isActive)}>Label</button>
 * ```
 */
export function filterPillClass(isActive: boolean, className?: string) {
  return cn(
    'h-10 px-5 rounded-full text-[9px] font-black tracking-widest uppercase transition-all',
    isActive
      ? `${BRAND.bg} ${BRAND.textOnPurple}`
      : 'bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white',
    className,
  );
}

// ─────────────────────────────────────────────────────────────────────
// 4. EYEBROW (micro-label above headings / cards)
// ─────────────────────────────────────────────────────────────────────

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'text-[10px] font-black uppercase tracking-[0.2em]',
        BRAND.text,
        className,
      )}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 5. SECTION TITLE (filter drawer headings, card section titles)
// ─────────────────────────────────────────────────────────────────────

export function SectionTitle({
  children,
  as: Tag = 'h2',
  className,
}: {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        'text-3xl font-black italic tracking-tighter uppercase',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 6. PAGE TITLE (hero headings on /book, /courses, /modelos)
// ─────────────────────────────────────────────────────────────────────

export function PageTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        'text-4xl md:text-5xl font-black tracking-tighter uppercase italic leading-none',
        'text-slate-900 dark:text-white',
        className,
      )}
    >
      {children}
    </h1>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 7. FILTER SECTION LABEL (small label inside drawers)
// ─────────────────────────────────────────────────────────────────────

export function FilterSectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        'text-[10px] font-black tracking-[0.2em] uppercase mb-6 text-left',
        'text-slate-400 dark:text-white/20',
        className,
      )}
    >
      {children}
    </h3>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 8. DRAWER HELPERS (overlay + panel classes)
// ─────────────────────────────────────────────────────────────────────

/** Backdrop overlay class for the filter drawer. */
export function drawerOverlayClass(isClosing: boolean, className?: string) {
  return cn(
    'fixed inset-0 bg-white/30 dark:bg-black/70 z-[90] transition-opacity duration-300',
    isClosing ? 'opacity-0' : 'opacity-100',
    className,
  );
}

/** Sliding aside panel class for the filter drawer. */
export function drawerPanelClass(isClosing: boolean, className?: string) {
  return cn(
    'fixed right-0 top-0 h-full w-[400px] z-[100]',
    'bg-white dark:bg-[#0a0a0b] text-slate-900 dark:text-white',
    'p-8 flex flex-col',
    'shadow-[-20px_0_60px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_40px_rgba(0,0,0,0.5)]',
    isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right',
    className,
  );
}

// ─────────────────────────────────────────────────────────────────────
// 9. BOOKING-FLOW CTA  (lilac palette)
// ─────────────────────────────────────────────────────────────────────

/**
 * Class-string for the booking-flow CTA (lilac bg, dark text).
 * Used for "CONFIRM BOOKING", "FINAL DETAILS", bottom-bar next button, etc.
 *
 * ```tsx
 * <button className={flowCtaClass()}>CONFIRM BOOKING</button>
 * <Button className={flowCtaClass({ size: 'sm' })}>NEXT</Button>
 * ```
 */
export function flowCtaClass(opts?: {
  size?: CtaSize;
  fullWidth?: boolean;
  className?: string;
}) {
  const { size = 'md', fullWidth = true, className } = opts ?? {};
  return cn(
    FLOW_CLS.bg,
    FLOW_CLS.onBg,
    CTA_SIZES[size],
    CTA_RADIUS[size],
    'font-black tracking-[0.2em] uppercase shadow-xl',
    'hover:bg-brand-tertiary hover:scale-[1.02] active:scale-95 transition-all',
    'disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale',
    fullWidth && 'w-full',
    className,
  );
}

// ─────────────────────────────────────────────────────────────────────
// 10. FLOW CHIP (selected time-slot / date / item)
// ─────────────────────────────────────────────────────────────────────

/**
 * Class-string for a selectable chip in the booking flow
 * (time slots, calendar dates, service cards).
 *
 * ```tsx
 * <button className={flowChipClass(isSelected)}>08:15</button>
 * ```
 */
export function flowChipClass(isSelected: boolean, className?: string) {
  return cn(
    'transition-all uppercase border font-black tracking-widest text-xs',
    isSelected
      ? `${FLOW_CLS.bg} ${FLOW_CLS.onBg} border-transparent shadow-lg scale-[1.05]`
      : `${FLOW_CLS.deep} ${FLOW_CLS.body} border-white/5 hover:border-white/10 hover:bg-[#1a1a1a]`,
    className,
  );
}

// ─────────────────────────────────────────────────────────────────────
// 11. FLOW SURFACE (card / panel in the dark booking UI)
// ─────────────────────────────────────────────────────────────────────

/**
 * Class-string for a surface (card panel) in the booking flow.
 */
export function flowSurfaceClass(className?: string) {
  return cn(
    FLOW_CLS.deep,
    'border border-white/5 shadow-2xl',
    className,
  );
}

// ─────────────────────────────────────────────────────────────────────
// 12. FLOW INPUT (text input in the booking confirmation step)
// ─────────────────────────────────────────────────────────────────────

/**
 * Class-string for text inputs in the booking flow.
 */
export function flowInputClass(className?: string) {
  return cn(
    'w-full bg-brand-neutral/50 border-2 border-white/5',
    'rounded-2xl sm:rounded-[1.5rem] px-5 py-4 sm:px-6 sm:py-5',
    'text-sm sm:text-base text-white placeholder:text-[#cbc3d7]/20',
    'outline-none focus:!border-brand-tertiary focus:!ring-1 focus:!ring-brand-tertiary transition-all',
    className,
  );
}

// ─────────────────────────────────────────────────────────────────────
// 13. FLOW STEP INDICATOR
// ─────────────────────────────────────────────────────────────────────

/**
 * Class-string for step indicator circles in the booking stepper.
 */
export function flowStepClass(state: 'active' | 'completed' | 'inactive') {
  const base =
    'flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-[10px] sm:text-xs font-black transition-all duration-500 ring-offset-4 ring-offset-[#131315]';
  switch (state) {
    case 'active':
      return cn(base, `${FLOW_CLS.bg} ${FLOW_CLS.onBg} ring-2 ring-brand-primary`);
    case 'completed':
      return cn(base, `${FLOW_CLS.accentBg}/10 ${FLOW_CLS.text} ring-1 ring-brand-tertiary/30`);
    default:
      return cn(base, `${FLOW_CLS.surface} text-[#cbc3d7]/30 ring-1 ring-white/5`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 14. DRAWER CSS (keyframes) — inject once via a global style tag
// ─────────────────────────────────────────────────────────────────────

/**
 * Global `<style>` block for drawer + scrollbar utilities.
 * Drop `<DrawerStyles />` once per page that uses a filter drawer.
 */
export function DrawerStyles() {
  return (
    <style jsx global>{`
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .custom-scrollbar::-webkit-scrollbar { width: 3px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
      .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
      @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
      .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      @keyframes slide-out-right { from { transform: translateX(0); } to { transform: translateX(100%); } }
      .animate-slide-out-right { animation: slide-out-right 0.2s cubic-bezier(0.4, 0, 1, 1) forwards; }
    `}</style>
  );
}
