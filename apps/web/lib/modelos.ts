import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SHOP_ID } from '@/lib/constants';

export interface OpenModelCall {
  session_id: string;
  course_title: string;
  start_at: string;
  location: string;
  compensation_type: 'gratis' | 'descuento' | 'pago';
  compensation_value_cents: number | null;
  notes_public: string | null;
  models_needed: number;
}

export function getModelsNeededFromRequirements(input: unknown): number {
  if (!input || typeof input !== 'object') {
    return 0;
  }
  const raw = (input as Record<string, unknown>).models_needed;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.trunc(parsed);
}

export async function getOpenModelCalls(shopId = SHOP_ID): Promise<OpenModelCall[]> {
  const supabase = createSupabaseAdminClient();

  const { data: requirementsRows } = await supabase
    .from('model_requirements')
    .select('session_id, requirements, compensation_type, compensation_value_cents, notes_public, is_open')
    .eq('is_open', true);

  if (!requirementsRows?.length) {
    return [];
  }

  const sessionIds = requirementsRows.map((row) => String(row.session_id));
  const { data: sessionRows } = await supabase
    .from('course_sessions')
    .select('id, course_id, start_at, location, status')
    .in('id', sessionIds)
    .eq('status', 'scheduled');

  if (!sessionRows?.length) {
    return [];
  }

  const courseIds = sessionRows.map((row) => String(row.course_id));
  const { data: courseRows } = await supabase
    .from('courses')
    .select('id, title, shop_id, is_active')
    .in('id', courseIds)
    .eq('shop_id', shopId)
    .eq('is_active', true);

  const sessionsById = new Map(sessionRows.map((row) => [String(row.id), row]));
  const coursesById = new Map(courseRows?.map((row) => [String(row.id), row]) || []);

  return requirementsRows
    .map((req) => {
      const session = sessionsById.get(String(req.session_id));
      if (!session) {
        return null;
      }

      const course = coursesById.get(String(session.course_id));
      if (!course) {
        return null;
      }

      return {
        session_id: String(req.session_id),
        course_title: String(course.title),
        start_at: String(session.start_at),
        location: String(session.location),
        compensation_type: req.compensation_type as 'gratis' | 'descuento' | 'pago',
        compensation_value_cents:
          req.compensation_value_cents === null ? null : Number(req.compensation_value_cents || 0),
        notes_public: req.notes_public ? String(req.notes_public) : null,
        models_needed: getModelsNeededFromRequirements(req.requirements),
      } satisfies OpenModelCall;
    })
    .filter((item): item is OpenModelCall => item !== null)
    .sort((a, b) => (a.start_at < b.start_at ? -1 : 1));
}
