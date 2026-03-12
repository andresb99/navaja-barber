import 'server-only';

import { createSupabaseServerClient } from './supabase/server';
import { isPendingTimeOffReason, stripPendingTimeOffReason } from './time-off-requests';

export async function reviewPendingTimeOffRequest(input: {
  shopId: string;
  timeOffId: string;
  decision: 'approve' | 'reject';
}) {
  const supabase = await createSupabaseServerClient();
  const { data: timeOff } = await supabase
    .from('time_off')
    .select('id, shop_id, reason')
    .eq('id', input.timeOffId)
    .eq('shop_id', input.shopId)
    .maybeSingle();

  if (!timeOff?.id) {
    throw new Error('La solicitud ya no esta disponible.');
  }

  const currentReason = typeof timeOff.reason === 'string' ? timeOff.reason : null;
  if (!isPendingTimeOffReason(currentReason)) {
    return { changed: false } as const;
  }

  if (input.decision === 'reject') {
    const { error } = await supabase
      .from('time_off')
      .delete()
      .eq('id', input.timeOffId)
      .eq('shop_id', input.shopId);

    if (error) {
      throw new Error(error.message || 'No se pudo rechazar la ausencia.');
    }

    return { changed: true } as const;
  }

  const { error } = await supabase
    .from('time_off')
    .update({
      reason: stripPendingTimeOffReason(currentReason),
    })
    .eq('id', input.timeOffId)
    .eq('shop_id', input.shopId);

  if (error) {
    throw new Error(error.message || 'No se pudo aprobar la ausencia.');
  }

  return { changed: true } as const;
}
