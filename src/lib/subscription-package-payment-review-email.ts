import { readEdgeFunctionPayload } from './invoke-edge-function';
import { supabase } from './supabase';

export async function sendSubscriptionPackagePaymentReviewFeedbackEmail(
  paymentId: string,
): Promise<{ ok: boolean; error: string | null; status?: string }> {
  const { data, error } = await supabase.functions.invoke('send-subscription-payment-review-email', {
    body: { paymentId },
  });

  const { payload, invokeError } = await readEdgeFunctionPayload(data, error);
  if (invokeError && !payload?.ok) {
    console.error('send-subscription-payment-review-email:', invokeError);
    return { ok: false, error: payload?.error ?? invokeError };
  }

  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? 'Could not send payment feedback email.' };
  }

  return { ok: true, error: null, status: payload.status as string | undefined };
}
