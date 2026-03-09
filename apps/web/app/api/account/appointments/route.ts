import { NextRequest, NextResponse } from 'next/server';
import { getAccountAppointments } from '@/lib/account-reviews';
import { resolveAuthenticatedUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);

  if (!user?.id) {
    return NextResponse.json(
      {
        message: 'Debes iniciar sesion para ver tus reservas.',
      },
      { status: 401 },
    );
  }

  try {
    const appointments = await getAccountAppointments(user.id);

    return NextResponse.json({
      items: appointments,
    });
  } catch (cause) {
    return NextResponse.json(
      {
        message:
          cause instanceof Error
            ? cause.message
            : 'No se pudieron cargar las reservas de tu cuenta.',
      },
      { status: 400 },
    );
  }
}
