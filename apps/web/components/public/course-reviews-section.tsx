'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Input, Textarea } from '@heroui/react';
import { ScrollShadow } from '@heroui/scroll-shadow';

interface CourseReview {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  submitted_at: string;
}

interface CourseReviewsSectionProps {
  courseId: string;
  reviews: CourseReview[];
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={`text-xl transition-colors ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
          aria-label={`${star} estrellas`}
        >
          <span
            className={
              star <= (hovered || value)
                ? 'text-amber-400'
                : 'text-slate-300 dark:text-slate-600'
            }
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, index }: { review: CourseReview; index: number }) {
  const initials = review.reviewer_name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const date = new Date(review.submitted_at).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="surface-card flex flex-col gap-3 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-white dark:bg-zinc-700">
            {initials || '?'}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink dark:text-slate-100">
              {review.reviewer_name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{date}</p>
          </div>
        </div>
        <StarRating value={review.rating} />
      </div>
      {review.comment ? (
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {review.comment}
        </p>
      ) : null}
    </motion.div>
  );
}

function WriteReviewForm({
  courseId,
  onSuccess,
}: {
  courseId: string;
  onSuccess: (review: CourseReview) => void;
}) {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError('Selecciona una calificacion.');
      return;
    }
    setError(null);
    setLoading(true);

    const res = await fetch('/api/courses/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, reviewer_name: name, rating, comment }),
    });

    if (!res.ok) {
      setError(await res.text());
      setLoading(false);
      return;
    }

    onSuccess({
      id: crypto.randomUUID(),
      reviewer_name: name,
      rating,
      comment: comment || null,
      submitted_at: new Date().toISOString(),
    });

    setName('');
    setRating(0);
    setComment('');
    setLoading(false);
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="soft-panel space-y-4 rounded-2xl p-5"
    >
      <div>
        <p className="font-[family-name:var(--font-heading)] text-base font-bold text-ink dark:text-slate-100">
          Dejar una reseña
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Tu opinión ayuda a otros a elegir este curso.
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Calificación</p>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <Input
        label="Tu nombre"
        labelPlacement="inside"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        minLength={2}
      />

      <Textarea
        label="Comentario (opcional)"
        labelPlacement="inside"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={600}
        rows={3}
      />

      {error ? <p className="status-banner error text-xs">{error}</p> : null}

      <Button
        type="submit"
        disabled={loading}
        className="action-primary w-full text-sm font-semibold"
      >
        {loading ? 'Enviando...' : 'Publicar reseña'}
      </Button>
    </motion.form>
  );
}

export function CourseReviewsSection({ courseId, reviews: initialReviews }: CourseReviewsSectionProps) {
  const [reviews, setReviews] = useState<CourseReview[]>(initialReviews);
  const [showForm, setShowForm] = useState(false);

  const avgRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  function handleNewReview(review: CourseReview) {
    setReviews((prev) => [review, ...prev]);
    setShowForm(false);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-ink dark:text-slate-100">
            Reseñas
          </h2>
          {avgRating !== null ? (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 dark:bg-amber-500/10">
              <span className="text-amber-400">★</span>
              <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                {avgRating}
              </span>
              <span className="text-xs text-amber-600/70 dark:text-amber-400/60">
                ({reviews.length})
              </span>
            </div>
          ) : null}
        </div>
        {!showForm ? (
          <Button
            size="sm"
            variant="ghost"
            className="action-secondary px-4 text-xs font-semibold"
            onPress={() => setShowForm(true)}
          >
            + Escribir reseña
          </Button>
        ) : null}
      </div>

      {/* Write form */}
      <AnimatePresence>
        {showForm ? (
          <div key="form">
            <WriteReviewForm courseId={courseId} onSuccess={handleNewReview} />
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="mt-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancelar
            </button>
          </div>
        ) : null}
      </AnimatePresence>

      {/* Reviews list */}
      {reviews.length === 0 && !showForm ? (
        <div className="surface-card flex flex-col items-center justify-center gap-2 py-12 text-center">
          <span className="text-3xl text-slate-300 dark:text-slate-600">★</span>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Aún no hay reseñas. ¡Sé el primero en dejar una!
          </p>
        </div>
      ) : (
        <ScrollShadow hideScrollBar size={20} className="max-h-[520px] overflow-y-auto">
          <div className="space-y-3 pr-0.5">
            {reviews.map((review, i) => (
              <ReviewCard key={review.id} review={review} index={i} />
            ))}
          </div>
        </ScrollShadow>
      )}
    </div>
  );
}
