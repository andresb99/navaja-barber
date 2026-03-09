import { NextRequest, NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/sanitize';
import { getReviewInvitePreview } from '@/lib/reviews';

export async function GET(request: NextRequest) {
  const token = sanitizeText(request.nextUrl.searchParams.get('token')) || '';
  if (!token) {
    return NextResponse.json(
      {
        message: 'Debes enviar un token de reseña.',
      },
      { status: 400 },
    );
  }

  const preview = await getReviewInvitePreview(token);
  if (!preview) {
    return NextResponse.json(
      {
        message: 'El enlace de reseña no es valido o ya expiro.',
      },
      { status: 404 },
    );
  }

  return NextResponse.json(preview);
}
