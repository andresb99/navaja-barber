import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Temporary dev-only seed route — DELETE after use
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const supabase = createSupabaseAdminClient();

  // First create the table if it doesn't exist
  const { error: tableError } = await supabase.rpc('exec_sql' as never, {
    sql: `
      create table if not exists public.course_reviews (
        id uuid primary key default gen_random_uuid(),
        course_id uuid not null references public.courses(id) on delete cascade,
        shop_id uuid not null references public.shops(id) on delete cascade,
        enrollment_id uuid null,
        reviewer_name text not null,
        rating smallint not null check (rating between 1 and 5),
        comment text null,
        status text not null default 'published' check (status in ('published', 'hidden', 'flagged')),
        submitted_at timestamptz not null default now()
      );
      alter table public.course_reviews enable row level security;
      drop policy if exists "Public can read published course reviews" on public.course_reviews;
      create policy "Public can read published course reviews"
        on public.course_reviews for select using (status = 'published');
      drop policy if exists "Anyone can submit a course review" on public.course_reviews;
      create policy "Anyone can submit a course review"
        on public.course_reviews for insert with check (status = 'published');
    `,
  });

  // Ignore rpc error — table may already exist or rpc may not be available
  void tableError;

  const reviews = [
    {
      course_id: '8c9acc44-585d-4445-97cc-adc395d58439',
      shop_id: 'c5a759d0-3aaa-45f9-9ca1-c85086e19ba3',
      reviewer_name: 'Matías Rodríguez',
      rating: 5,
      comment: 'Excelente curso, aprendí técnicas que no conocía. El instructor explica muy bien y el nivel del curso está bien calibrado para intermedios.',
    },
    {
      course_id: '8c9acc44-585d-4445-97cc-adc395d58439',
      shop_id: 'c5a759d0-3aaa-45f9-9ca1-c85086e19ba3',
      reviewer_name: 'Valentina Suárez',
      rating: 4,
      comment: 'Muy bueno en general. El fade quedó impecable con la técnica que enseñaron. Faltó un poco más de tiempo para practicar mechitas.',
    },
    {
      course_id: '8c9acc44-585d-4445-97cc-adc395d58439',
      shop_id: 'c5a759d0-3aaa-45f9-9ca1-c85086e19ba3',
      reviewer_name: 'Lucas Fernández',
      rating: 5,
      comment: 'De los mejores cursos que hice. El espacio estaba bien equipado y el material que dieron era de calidad.',
    },
    {
      course_id: '8c9acc44-585d-4445-97cc-adc395d58439',
      shop_id: 'c5a759d0-3aaa-45f9-9ca1-c85086e19ba3',
      reviewer_name: 'Sofía Méndez',
      rating: 3,
      comment: 'Estuvo bien pero esperaba más contenido sobre colorimetría. El fade me salió bien, las mechitas las necesito practicar más.',
    },
    {
      course_id: '8c9acc44-585d-4445-97cc-adc395d58439',
      shop_id: 'c5a759d0-3aaa-45f9-9ca1-c85086e19ba3',
      reviewer_name: 'Nicolás Acosta',
      rating: 5,
      comment: '100% recomendable. Volví a mi local aplicando todo lo que aprendí y ya noté la diferencia en los resultados.',
    },
    {
      course_id: '8c9acc44-585d-4445-97cc-adc395d58439',
      shop_id: 'c5a759d0-3aaa-45f9-9ca1-c85086e19ba3',
      reviewer_name: 'Camila Torres',
      rating: 4,
      comment: 'Muy didáctico. Me gustó que el instructor demostraba cada técnica paso a paso antes de que la practiquemos.',
    },
    {
      course_id: '8c9acc44-585d-4445-97cc-adc395d58439',
      shop_id: 'c5a759d0-3aaa-45f9-9ca1-c85086e19ba3',
      reviewer_name: 'Diego Ramírez',
      rating: 5,
      comment: 'Brutal. El nivel de detalle en la técnica de fade fue increíble. Salí con confianza para aplicarlo en clientes.',
    },
    {
      course_id: '44444444-4444-4444-4444-444444444401',
      shop_id: '11111111-1111-1111-1111-111111111111',
      reviewer_name: 'Andrés Olivera',
      rating: 5,
      comment: 'Perfecto para alguien que viene de las bases. Los fundamentos que enseñan son sólidos y se aplican a cualquier estilo.',
    },
    {
      course_id: '44444444-4444-4444-4444-444444444401',
      shop_id: '11111111-1111-1111-1111-111111111111',
      reviewer_name: 'Florencia Garín',
      rating: 4,
      comment: 'Muy buen curso introductorio. El instructor es paciente y explica bien. Recomendado para principiantes.',
    },
    {
      course_id: '44444444-4444-4444-4444-444444444401',
      shop_id: '11111111-1111-1111-1111-111111111111',
      reviewer_name: 'Sebastián Pérez',
      rating: 3,
      comment: 'Bueno para iniciarse. Quizás me hubiera gustado más práctica y menos teoría, pero entiendo que es un curso de fundamentos.',
    },
    {
      course_id: '00aaf6e3-4bb6-43cd-bd63-ec6d3baf693d',
      shop_id: '5ba3cd10-41ec-473d-bf88-61b6d3245f8b',
      reviewer_name: 'Paula Iriarte',
      rating: 5,
      comment: 'Aprendí a hacer mechitas profesionales. El resultado fue mejor de lo que esperaba. Muy recomendable.',
    },
    {
      course_id: '00aaf6e3-4bb6-43cd-bd63-ec6d3baf693d',
      shop_id: '5ba3cd10-41ec-473d-bf88-61b6d3245f8b',
      reviewer_name: 'Tomás Vidal',
      rating: 4,
      comment: 'Buen curso. El material es bueno y el instructor sabe mucho. Podría tener una sesión de repaso al final.',
    },
  ];

  const { data, error } = await supabase.from('course_reviews').insert(reviews).select('id');

  if (error) {
    return NextResponse.json({ error: error.message, detail: error.details }, { status: 400 });
  }

  return NextResponse.json({ inserted: data?.length ?? 0, ok: true });
}
