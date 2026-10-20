import { supabase } from './supabase';

export async function sendSubscriptionPackageReceiptEmail(
  finalTransactionId: string,
): Promise<{ ok: boolean; error: string | null; alreadySent?: boolean }> {
  const { data, error } = await supabase.functions.invoke('send-subscription-payment-receipt', {
    body: { paymentId: finalTransactionId },
  });

  if (error) {
    console.error('send-subscription-payment-receipt:', error.message);
    return { ok: false, error: error.message };
  }

  const payload = data as { ok?: boolean; error?: string; alreadySent?: boolean } | null;
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? 'Could not send e-receipt.' };
  }

  return { ok: true, error: null, alreadySent: payload.alreadySent };
}
