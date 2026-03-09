import { NextRequest, NextResponse } from 'next/server';
import { submitAppointmentReviewInputSchema } from '@navaja/shared';
import { readSanitizedJsonBody } from '@/lib/sanitize';
import { submitAppointmentReview } from '@/lib/reviews';

export async function POST(request: NextRequest) {
  const body = await readSanitizedJsonBody(request);
  const parsed = submitAppointmentReviewInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.flatten().formErrors.join(', ') || 'Datos de reseña invalidos.',
      },
      { status: 400 },
    );
  }

  try {
    const result = await submitAppointmentReview(parsed.data);
    return NextResponse.json(result);
  } catch (cause) {
    return NextResponse.json(
      {
        message: cause instanceof Error ? cause.message : 'No se pudo enviar la reseña.',
      },
      { status: 400 },
    );
  }
}
