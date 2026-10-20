import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildPaymentSubmittedMemberEmail } from '../send-payment-review-email/email-html.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const PAYMENT_SELECT = `
  id,
  uid,
  account_id,
  status,
  class_starts_at,
  class_ends_at,
  request_physical_receipt,
  classes ( name ),
  accounts!class_payments_escrow_account_id_fkey (
    email,
    profiles_client ( name )
  )
`;

function buyerFromPayment(payment: Record<string, unknown>): { name: string; email: string } {
  const accountJoin = payment.accounts as
    | { email?: string; profiles_client?: { name?: string } | { name?: string }[] }
    | { email?: string; profiles_client?: { name?: string } | { name?: string }[] }[]
    | null;
  const account = Array.isArray(accountJoin) ? accountJoin[0] : accountJoin;
  const email = (account?.email as string)?.trim() ?? '';
  const profileJoin = account?.profiles_client;
  const profile = Array.isArray(profileJoin) ? profileJoin[0] : profileJoin;
  const name = (profile?.name as string)?.trim() || email || 'Member';
  return { name, email };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RECEIPT_FROM_EMAIL') ?? 'Balansé Wellness <onboarding@resend.dev>';
  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://balanse.kentveloso.com';

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: 'Server configuration incomplete.' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  let paymentId: string;
  try {
    const body = await req.json();
    paymentId = String(body?.paymentId ?? '').trim();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  if (!paymentId) {
    return jsonResponse({ ok: false, error: 'paymentId is required' }, 400);
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: memberAccount, error: memberAccountError } = await supabaseAdmin
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (memberAccountError || !memberAccount) {
    return jsonResponse({ ok: false, error: 'Account not found' }, 403);
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('class_payments_escrow')
    .select(PAYMENT_SELECT)
    .eq('id', paymentId)
    .maybeSingle();

  if (paymentError || !payment) {
    return jsonResponse({ ok: false, error: 'Payment not found' }, 404);
  }

  if ((payment.account_id as string) !== (memberAccount.id as string)) {
    return jsonResponse({ ok: false, error: 'Forbidden' }, 403);
  }

  const status = payment.status as string;
  if (status !== 'pending') {
    return jsonResponse({ ok: false, error: 'Submission email applies to pending payments only.' }, 400);
  }

  const buyer = buyerFromPayment(payment as Record<string, unknown>);
  const toEmail = buyer.email;
  if (!toEmail) {
    return jsonResponse({ ok: false, error: 'Buyer email is missing on this payment.' }, 400);
  }

  if (!resendApiKey) {
    return jsonResponse({
      ok: false,
      error: 'RESEND_API_KEY is not configured. Add it in Supabase Edge Function secrets.',
    }, 503);
  }

  const classJoin = payment.classes as { name?: string } | { name?: string }[] | null;
  const className = (Array.isArray(classJoin) ? classJoin[0]?.name : classJoin?.name)?.trim() || 'Class session';

  const { subject, html } = buildPaymentSubmittedMemberEmail({
    memberName: buyer.name,
    className,
    startsAt: payment.class_starts_at as string | null,
    endsAt: payment.class_ends_at as string | null,
    paymentUid: payment.uid as string,
    requestPhysicalReceipt: Boolean(payment.request_physical_receipt),
    siteUrl,
  });

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error('Resend error:', errText);
    return jsonResponse({ ok: false, error: 'Failed to send email. Check Resend configuration.' }, 502);
  }

  return jsonResponse({ ok: true, sent: true, to: toEmail });
});
