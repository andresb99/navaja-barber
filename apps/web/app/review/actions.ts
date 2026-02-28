'use server';

import type { SubmitAppointmentReviewInput } from '@navaja/shared';
import { submitAppointmentReview } from '@/lib/reviews';

export interface SubmitAppointmentReviewActionResult {
  success: boolean;
  error: string | null;
}

export async function submitAppointmentReviewAction(
  input: SubmitAppointmentReviewInput,
): Promise<SubmitAppointmentReviewActionResult> {
  try {
    await submitAppointmentReview(input);

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo enviar la resena.',
    };
  }
}
