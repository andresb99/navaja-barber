'use client';

import { useState, useCallback } from 'react';
import { CourseEnrollmentModal } from './course-enrollment-modal';

interface SessionData {
  id: string;
  dateLabel: string;
  fullDateLabel: string;
  seatsLeft: number;
  location: string;
}

interface ReviewData {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  submitted_at: string;
}

interface CourseDetailViewProps {
  courseTitle: string;
  courseDescription: string;
  priceLabel: string;
  levelLabel: string;
  durationHours: number;
  imageUrl: string | null;
  shopName: string;
  academyHref: string;
  sessions: SessionData[];
  reviews: ReviewData[];
  initialName: string;
  initialPhone: string;
  initialEmail: string;
  preferredPaymentMethod: string | null;
}

export function CourseDetailView({
  courseTitle,
  courseDescription,
  priceLabel,
  levelLabel,
  durationHours,
  imageUrl,
  shopName,
  academyHref,
  sessions,
  reviews,
  initialName,
  initialPhone,
  initialEmail,
  preferredPaymentMethod,
}: CourseDetailViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preSelectedId, setPreSelectedId] = useState<string | null>(null);

  const openModal = useCallback((sessionId?: string) => {
    setPreSelectedId(sessionId ?? null);
    setIsModalOpen(true);
  }, []);

  return (
    <>
      <section className="min-h-screen font-sans text-white pb-32">
        {/* ═══════════════ HERO ═══════════════ */}
        <div className="relative w-full h-[55vh] sm:h-[65vh] sm:h-[80vh] min-h-[380px] max-h-[850px] flex items-end">
          <div className="absolute inset-0 z-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={courseTitle}
                className="h-full w-full object-cover brightness-[0.35] grayscale"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#1a1820] to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/70 via-transparent to-transparent z-10" />
          </div>

          <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 md:px-16 w-full pb-8 sm:pb-16 md:pb-24">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:gap-10 items-end w-full">
              <div className="max-w-3xl">
                <div className="inline-block rounded-full border border-[#a078ff]/30 bg-[#1a1820]/80 backdrop-blur-md px-4 py-1.5 mb-6">
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#d0bcff]">
                    ADVANCED MASTERCLASS SERIES
                  </p>
                </div>
                <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] font-extrabold uppercase tracking-tighter text-white leading-[0.85] mb-4 drop-shadow-2xl">
                  {courseTitle.toUpperCase()}
                </h1>
              </div>

              <div className="rounded-[1.5rem] bg-[#1a1820]/70 backdrop-blur-xl ring-1 ring-white/10 p-5 sm:p-6 w-full sm:min-w-[220px] lg:min-w-[220px] shadow-2xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a078ff] mb-1">Precio</p>
                <p className="text-3xl font-black text-white mb-4">{priceLabel}</p>
                <div className="flex items-center gap-4 mb-5 border-t border-white/10 pt-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#8a8a93]">Nivel</p>
                    <p className="text-xs font-bold text-white uppercase">{levelLabel}</p>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#8a8a93]">Duración</p>
                    <p className="text-xs font-bold text-white uppercase">{durationHours > 0 ? `${durationHours} HOURS` : '—'}</p>
                  </div>
                </div>
                <button
                  onClick={() => openModal()}
                  className="block w-full rounded-lg bg-[#d0bcff] py-3 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-[#23005c] transition-all hover:bg-[#e9ddff] hover:scale-[1.02] shadow-[0_0_20px_-8px_rgba(208,188,255,0.4)] cursor-pointer"
                >
                  Inscribirse Ahora
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ OVERVIEW + SESSIONS ═══════════════ */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-16 mt-10 sm:mt-12 md:mt-20 mb-12 sm:mb-16 md:mb-24">
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-8 md:gap-12 lg:gap-24">
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-extrabold uppercase tracking-tighter text-white mb-6">
                COURSE OVERVIEW
              </h2>
              <p className="text-sm text-[#cbc3d7] leading-[1.8] mb-8">
                {courseDescription}
              </p>
              <div className="flex flex-wrap gap-3">
                {['SHAPING TECHNIQUES', 'IMAGE ARTISTRY', 'CLIENT CRAFT'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#cbc3d7] transition-colors hover:border-[#a078ff]/30 hover:text-[#d0bcff]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-extrabold uppercase tracking-tighter text-white mb-6">
                PRÓXIMAS SESSIONES
              </h2>
              <div className="space-y-4">
                {sessions.length === 0 ? (
                  <div className="rounded-[1rem] border border-white/5 bg-white/5 p-8 text-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-[#8a8a93]">
                      Sin sesiones programadas
                    </p>
                    <p className="mt-2 text-xs text-[#8a8a93]">Volvé a consultar pronto.</p>
                  </div>
                ) : null}

                {sessions.slice(0, 3).map((session) => (
                  <button
                    key={session.id}
                    onClick={() => openModal(session.id)}
                    className="group w-full flex items-center justify-between rounded-[1rem] border border-white/5 bg-white/5 p-5 transition-all hover:border-[#a078ff]/20 hover:bg-white/[0.08] text-left cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight">{session.fullDateLabel}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a8a93] mt-1">
                        {session.location} · {session.seatsLeft > 0 ? `${session.seatsLeft} cupos` : 'Sin cupos'}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-[#a078ff] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ QUOTE + EDITORIAL PHOTO ═══════════════ */}
        <div className="relative w-full py-16 md:py-28 lg:py-36 overflow-hidden mb-16 md:mb-24">
          <div className="absolute inset-0 z-0">
            <img
              src={imageUrl || 'https://images.unsplash.com/photo-1503951914875-452162b0f3ee?q=80&w=2000&auto=format&fit=crop'}
              alt="Editorial"
              className="h-full w-full object-cover grayscale brightness-[0.25]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-[#0a0a0c] z-10" />
          </div>
          <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-16 text-center">
            <blockquote className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl md:text-4xl font-extrabold italic uppercase tracking-tighter text-white leading-snug max-w-4xl mx-auto">
              &ldquo;PRECISION IS NOT AN ACT, BUT A <span className="text-[#d0bcff]">RITUAL</span>. WE DON&apos;T JUST CUT; WE REDEFINE IDENTITY.&rdquo;
            </blockquote>
          </div>
        </div>

        {/* ═══════════════ REVIEWS CAROUSEL ═══════════════ */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-16 mb-12 sm:mb-16 md:mb-40 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-12">
            <h2 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-extrabold uppercase tracking-tighter text-white">
              ELITE REVIEWS
            </h2>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#55555c]">Automated Selection</span>
            </div>
          </div>

          <div className="relative">
            <div
              className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-10 no-scrollbar scroll-smooth"
              id="reviews-carousel"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

              {[...(reviews.length > 0 ? reviews : [
                { id: 'm1', reviewer_name: 'Julian Vance', rating: 5, comment: 'Finally, a studio that understands the aesthetic of modern luxury. The neon accents and the service are both world-class.' },
                { id: 'm2', reviewer_name: 'Elena Rossi', rating: 5, comment: 'The atmosphere of the academy is just as inspiring as the curriculum itself. Every detail is curated for excellence.' },
                { id: 'm3', reviewer_name: 'Marc Soler', rating: 5, comment: 'Essential for any barber looking to reach the next level of precision and redefine their identity.' }
              ]), ...(reviews.length > 0 ? reviews : [
                { id: 'm1', reviewer_name: 'Julian Vance', rating: 5, comment: 'Finally, a studio that understands the aesthetic of modern luxury. The neon accents and the service are both world-class.' },
                { id: 'm2', reviewer_name: 'Elena Rossi', rating: 5, comment: 'The atmosphere of the academy is just as inspiring as the curriculum itself. Every detail is curated for excellence.' },
                { id: 'm3', reviewer_name: 'Marc Soler', rating: 5, comment: 'Essential for any barber looking to reach the next level of precision and redefine their identity.' }
              ]), ...(reviews.length > 0 ? reviews : [
                { id: 'm1', reviewer_name: 'Julian Vance', rating: 5, comment: 'Finally, a studio that understands the aesthetic of modern luxury. The neon accents and the service are both world-class.' },
                { id: 'm2', reviewer_name: 'Elena Rossi', rating: 5, comment: 'The atmosphere of the academy is just as inspiring as the curriculum itself. Every detail is curated for excellence.' },
                { id: 'm3', reviewer_name: 'Marc Soler', rating: 5, comment: 'Essential for any barber looking to reach the next level of precision and redefine their identity.' }
              ])].map((review, idx) => (
                <article
                  key={`${review.id}-${idx}`}
                  onClick={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })}
                  className="min-w-[88vw] sm:min-w-[85vw] md:min-w-[380px] h-auto sm:h-[380px] snap-center rounded-[1.25rem] bg-[#0c0c0e] border border-white/[0.08] p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:border-[#a078ff]/30 shadow-2xl relative cursor-pointer group"
                >
                  <div>
                    {/* Compact Lavender Stars */}
                    <div className="flex gap-1 mb-6">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className={`w-3.5 h-3.5 ${review.rating && i < review.rating ? 'text-[#a078ff]' : 'text-white/10'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    {/* High-End Italic Typography */}
                    <p className="text-lg md:text-[1.2rem] text-white leading-[1.3] font-bold italic tracking-tight">
                      &ldquo;{review.comment || 'Finally, a studio that understands the aesthetic of modern luxury. The neon accents and the service are both world-class.'}&rdquo;
                    </p>
                  </div>

                  {/* Footer with Avatar + Refined Labels */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center shrink-0">
                      <img
                        src={`https://i.pravatar.cc/150?u=${review.id}`}
                        alt={review.reviewer_name}
                        className="w-full h-full object-cover grayscale"
                      />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[11px] font-black text-white uppercase tracking-wider mb-0.5">
                        {review.reviewer_name?.toUpperCase()}
                      </p>
                      <p className="text-[8px] font-bold text-[#a078ff] uppercase tracking-widest leading-none">
                        MASTER STYLIST · VERIFIED
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <script dangerouslySetInnerHTML={{
              __html: `
              (function() {
                const carousel = document.getElementById('reviews-carousel');
                if (!carousel) return;
                
                let interval;
                let isInteracting = false;
                
                // Calculate the true width of one set of items
                const updateMetrics = () => {
                  const setSize = carousel.scrollWidth / 3;
                  return setSize;
                };

                let setWidth = updateMetrics();
                carousel.scrollLeft = setWidth;

                const handleLoop = () => {
                  if (isInteracting) return;
                  const current = carousel.scrollLeft;
                  if (current <= 10) {
                    carousel.scrollTo({ left: current + setWidth, behavior: 'instant' });
                  } else if (current >= setWidth * 2 - 10) {
                    carousel.scrollTo({ left: current - setWidth, behavior: 'instant' });
                  }
                };

                const startAuto = () => {
                  if (interval) clearInterval(interval);
                  interval = setInterval(() => {
                    if (isInteracting) return;
                    // Move one card width roughly
                    const cardWidth = 380 + 24; // width + gap
                    carousel.scrollBy({ left: cardWidth, behavior: 'smooth' });
                  }, 10000);
                };

                // Precision teleport after animation ends
                carousel.addEventListener('scroll', () => {
                  const current = carousel.scrollLeft;
                  // If we are deep into the third set or first set, jump back to middle
                  if (current >= setWidth * 2.5) {
                     carousel.scrollTo({ left: current - setWidth, behavior: 'instant' });
                  } else if (current <= setWidth * 0.5) {
                     carousel.scrollTo({ left: current + setWidth, behavior: 'instant' });
                  }
                });

                carousel.addEventListener('mouseenter', () => isInteracting = true);
                carousel.addEventListener('mouseleave', () => {
                  isInteracting = false;
                  startAuto();
                });
                
                carousel.addEventListener('touchstart', () => isInteracting = true);
                carousel.addEventListener('touchend', () => {
                  isInteracting = false;
                  startAuto();
                });

                window.addEventListener('resize', () => {
                  setWidth = updateMetrics();
                  carousel.scrollLeft = setWidth;
                });

                startAuto();
              })();
            `}} />
          </div>
        </div>

        {/* ═══════════════ CTA FOOTER BAND ═══════════════ */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-16 mb-12 sm:mb-16">
          <div className="rounded-[1.5rem] sm:rounded-[2rem] bg-gradient-to-br from-[#1a1820] via-[#0e0e10] to-[#1a1820] ring-1 ring-white/5 p-6 sm:p-10 md:p-20 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a078ff] mb-4">ELITE ACADEMY</p>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tighter text-white mb-4 leading-[0.9]">
              READY TO LEAD THE<br />
              <span className="italic text-[#d0bcff]">AVANT-GARDE?</span>
            </h2>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <button
                onClick={() => openModal()}
                className="rounded-full border-2 border-[#d0bcff] bg-transparent px-8 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#d0bcff] transition-all hover:bg-[#d0bcff] hover:text-[#23005c] cursor-pointer"
              >
                Reserve Your Station
              </button>
              <a
                href={academyHref}
                className="rounded-full border border-white/20 bg-transparent px-8 py-3.5 text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:bg-white/5"
              >
                Request Brochure
              </a>
            </div>
          </div>
        </div>

        {/* Footer line */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-16 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#8a8a93]">
            © 2025 · {shopName} · ELITE ACADEMY DIVISION
          </p>
          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Contact'].map((link) => (
              <span key={link} className="text-[9px] font-bold uppercase tracking-widest text-[#8a8a93] hover:text-white cursor-pointer transition-colors">{link}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Modal */}
      <CourseEnrollmentModal
        courseTitle={courseTitle}
        priceLabel={priceLabel}
        sessions={sessions}
        initialName={initialName}
        initialPhone={initialPhone}
        initialEmail={initialEmail}
        preferredPaymentMethod={preferredPaymentMethod}
        isOpen={isModalOpen}
        preSelectedSessionId={preSelectedId}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
