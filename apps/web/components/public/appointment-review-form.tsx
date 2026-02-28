'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@heroui/button';
import { Textarea } from '@heroui/input';
import { submitAppointmentReviewAction } from '@/app/review/actions';

interface AppointmentReviewFormProps {
  signedToken: string;
}

export function AppointmentReviewForm({ signedToken }: AppointmentReviewFormProps) {
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await submitAppointmentReviewAction({
        signed_token: signedToken,
        rating,
        comment,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setError(null);
      setIsSubmitted(true);
    });
  }

  if (isSubmitted) {
    return <p className="text-sm text-slate/80">Reseña guardada. Gracias por compartir tu experiencia.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate/80">Calificacion</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                value <= rating
                  ? 'border-brass/35 bg-brass/[0.08] text-amber-700 dark:border-brass/25 dark:bg-brass/[0.12] dark:text-amber-200'
                  : 'border-slate/15 bg-white/65 text-ink dark:border-white/8 dark:bg-white/[0.03] dark:text-slate-100'
              }`}
            >
              {value} estrella{value === 1 ? '' : 's'}
            </button>
          ))}
        </div>
      </div>

      <Textarea
        id="comment"
        label="Comentario (opcional)"
        labelPlacement="inside"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={4}
        maxLength={1000}
      />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <Button type="submit" isLoading={isPending}>
        Enviar reseña
      </Button>
    </form>
  );
}
