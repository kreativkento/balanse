import { supabase } from './supabase';

export async function sendClassPaymentSubmittedEmail(
  paymentId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('send-payment-submitted-email', {
    body: { paymentId },
  });

  if (error) {
    console.error('send-payment-submitted-email:', error.message);
    return { ok: false, error: error.message };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? 'Could not send payment submission email.' };
  }

  return { ok: true, error: null };
}
