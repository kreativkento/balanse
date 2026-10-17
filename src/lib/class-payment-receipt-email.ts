import { supabase } from './supabase';

export async function sendClassPaymentReceiptEmail(
  paymentId: string,
  options?: { storeOnly?: boolean },
): Promise<{ ok: boolean; error: string | null; alreadySent?: boolean; stored?: boolean }> {
  const { data, error } = await supabase.functions.invoke('send-payment-receipt', {
    body: { paymentId, storeOnly: options?.storeOnly === true },
  });

  if (error) {
    console.error('send-payment-receipt:', error.message);
    return { ok: false, error: error.message };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    alreadySent?: boolean;
    stored?: boolean;
  } | null;
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? 'Could not send e-receipt.', stored: payload?.stored };
  }

  return {
    ok: true,
    error: null,
    alreadySent: payload.alreadySent === true,
    stored: payload.stored === true,
  };
}
