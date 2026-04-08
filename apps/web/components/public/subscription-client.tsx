'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SubscriptionPlanDescriptor } from '@navaja/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { Tabs, Tab } from '@heroui/react';

interface SubscriptionClientProps {
  plans: SubscriptionPlanDescriptor[];
  ctx: {
    role: string;
    shopSlug: string | null;
  };
  manageWorkspaceHref: string;
}

const UYU_FORMATTER = new Intl.NumberFormat('es-UY', {
  style: 'currency',
  currency: 'UYU',
  maximumFractionDigits: 0,
});

function formatUyuCents(amountCents: number) {
  return UYU_FORMATTER.format(Math.round(amountCents / 100));
}

export function SubscriptionClient({ plans, ctx, manageWorkspaceHref }: SubscriptionClientProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="flex flex-col items-center pt-32 h-screen overflow-hidden selection:bg-[#bf9cff]/30 relative z-0">
      {/* ── HEADER ── */}
      <div className="text-center mb-16 px-6 relative z-10">
        <div className="inline-block px-4 py-1.5 mb-10 rounded-full bg-[#201f1f]/50 border border-[#484847]/10 backdrop-blur-md">
           <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#bf9cff]/80">
            Zen-Luxury Subscription
          </span>
        </div>
        
        <h1 className="font-elite font-normal text-3xl md:text-5xl lg:text-6xl uppercase tracking-[0.2em] mb-10 text-white whitespace-nowrap">
          SELECT YOUR <span className="text-[#bf9cff]">PLAN</span>
        </h1>

        {/* ── BILLING CYCLE TOGGLE ── */}
        <div className="flex justify-center">
          <Tabs 
            selectedKey={billingCycle}
            onSelectionChange={(key) => setBillingCycle(key as any)}
            variant="light"
            radius="full"
            classNames={{
              tabList: "bg-[#201f1f]/40 border border-[#484847]/10 p-1 backdrop-blur-xl",
              cursor: "bg-[#bf9cff]/20 shadow-[0_0_15px_rgba(191,156,255,0.2)]",
              tab: "px-8 h-10 data-[selected=true]:text-[#bf9cff] text-[#adaaaa]/40",
              tabContent: "text-[10px] font-bold uppercase tracking-[0.2em]"
            }}
          >
            <Tab key="monthly" title="Monthly" />
            <Tab 
              key="annual" 
              title={
                <div className="flex items-center gap-2">
                  <span>Annual</span>
                  <AnimatePresence>
                    {billingCycle === 'annual' && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-[8px] text-[#bf9cff]/80 font-bold lowercase tracking-normal bg-[#bf9cff]/10 px-2 py-0.5 rounded-full"
                      >
                        -20%
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              } 
            />
          </Tabs>
        </div>
      </div>

      {/* ── PRICING GRID ── */}
      <div className="grid gap-10 md:grid-cols-3 max-w-7xl mx-auto w-full">
        {plans.map((plan) => {
          const isRecommended = plan.id === 'pro';
          const priceCents = billingCycle === 'monthly' ? plan.monthlyPriceCents : plan.annualInstallmentCents;
          
          return (
            <div 
              key={plan.id}
              className={cn(
                "group relative flex flex-col h-full rounded-2xl p-10 transition-all duration-700",
                isRecommended 
                  ? "bg-[#201f1f]/40 border border-[#bf9cff]/20 shadow-[0_0_50px_rgba(191,156,255,0.3)] scale-[1.05] z-10 backdrop-blur-xl" 
                  : "bg-[#201f1f]/40 border border-[#484847]/5 hover:border-[#484847]/20 backdrop-blur-lg shadow-[0_0_30px_rgba(191,156,255,0.05)]"
              )}
            >
              {isRecommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#bf9cff] px-5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#18003d] shadow-lg shadow-[#bf9cff]/20 z-20">
                  Recommended
                </div>
              )}

              <div className="mb-8">
                <h3 className={cn(
                  "text-sm font-bold uppercase tracking-widest mb-2 transition-colors",
                  isRecommended ? "text-[#bf9cff]" : "text-[#e5e2e1]"
                )}>
                  {plan.id === 'free' ? 'Basic' : plan.id === 'pro' ? 'Pro Elite' : 'Business'}
                </h3>
                <div className="flex items-baseline gap-1 relative overflow-hidden h-14">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${billingCycle}-${plan.id}`}
                      initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
                      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                      className="flex items-baseline gap-1"
                    >
                      <span className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter font-[family-name:var(--font-body)]">
                        {priceCents > 0 ? formatUyuCents(priceCents) : '$0'}
                      </span>
                      <span className="text-[#adaaaa] text-sm font-light">
                        {plan.monthlyPriceCents > 0 ? (billingCycle === 'monthly' ? '/mo' : '/mo*') : '/forever'}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </div>
                {billingCycle === 'annual' && plan.monthlyPriceCents > 0 && (
                  <p className="text-[#bf9cff]/60 text-[9px] font-bold uppercase mt-2 tracking-wide">billed annually</p>
                )}
              </div>

              <div className="mb-8 min-h-[3rem]">
                <p className="text-[#adaaaa] text-sm leading-relaxed font-light">
                   {plan.id === 'free' 
                     ? "The gateway to the nocturnal network. Essential tools for individual presence." 
                     : plan.id === 'pro' 
                        ? "Enhanced capabilities for the dedicated professional. High-impact concierge services."
                        : "Corporate-grade scalability and deep analytical insights for global expansion."}
                </p>
              </div>

              <ul className="space-y-4 mb-12 flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={billingCycle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {plan.features.map((feature: string, idx: number) => (
                      <motion.li 
                        key={`${feature}-${idx}`}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 group/item transition-all duration-300"
                      >
                        <div className={cn(
                          "w-5 h-5 flex items-center justify-center shrink-0 transition-all",
                          isRecommended ? "text-[#bf9cff]" : "text-[#bf9cff]/60"
                        )}>
                          <Check className="w-4 h-4" strokeWidth={isRecommended ? 3 : 2} />
                        </div>
                        <span className="text-sm text-[#e5e2e1]/80 group-hover/item:text-white transition-colors font-light">
                          {feature}
                        </span>
                      </motion.li>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </ul>

              <Link
                href={ctx.role === 'guest' ? "/login?mode=register&next=/suscripcion" : manageWorkspaceHref}
                className={cn(
                  "h-14 w-full rounded-full text-xs font-bold uppercase tracking-widest flex items-center justify-center transition-all duration-300",
                  isRecommended 
                    ? "bg-gradient-to-r from-[#bf9cff] to-[#af8cef] text-[#18003d] hover:scale-95 shadow-[0_0_20px_rgba(191,156,255,0.4)]" 
                    : "border border-[#484847] text-[#e5e2e1] hover:bg-white/5"
                )}
              >
                {plan.id === 'free' ? 'Get Started' : plan.id === 'pro' ? 'Join Pro Elite' : 'Contact Sales'}
              </Link>
            </div>
          );
        })}
      </div>

    </div>
  );
}
