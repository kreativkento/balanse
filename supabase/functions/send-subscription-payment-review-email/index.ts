import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildSubscriptionPaymentApprovedEmail,
  buildSubscriptionPaymentRejectedEmail,
} from './email-html.ts';

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
  status,
  verified,
  review_note,
  amount_paid,
  package_name_snapshot,
  credits_granted_snapshot,
  credit_validity_days_snapshot,
  accounts!subscription_package_payments_escrow_account_id_fkey (
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

  const { data: reviewerAccount, error: reviewerError } = await supabaseAdmin
    .from('accounts')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (reviewerError || !reviewerAccount) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 403);
  }

  const role = reviewerAccount.role as string;
  if (role !== 'admin' && role !== 'dev') {
    return jsonResponse({ ok: false, error: 'Admin access required' }, 403);
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('subscription_package_payments_escrow')
    .select(PAYMENT_SELECT)
    .eq('id', paymentId)
    .maybeSingle();

  if (paymentError) {
    console.error('subscription payment load error:', paymentError.message);
    return jsonResponse({ ok: false, error: paymentError.message }, 502);
  }

  if (!payment) {
    return jsonResponse({ ok: false, error: 'Payment not found' }, 404);
  }

  const status = payment.status as string;
  if (status !== 'approved' && status !== 'rejected') {
    return jsonResponse({ ok: false, error: 'Payment must be approved or rejected before sending feedback.' }, 400);
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

  const packageName = (payment.package_name_snapshot as string)?.trim() || 'Credit pack';
  const creditsGranted = Number(payment.credits_granted_snapshot);
  const creditValidityDays = Number(payment.credit_validity_days_snapshot);
  const memberName = buyer.name;
  const paymentUid = payment.uid as string;

  let subject: string;
  let html: string;

  if (status === 'approved') {
    const built = buildSubscriptionPaymentApprovedEmail({
      memberName,
      packageName,
      creditsGranted,
      creditValidityDays,
      paymentUid,
      amountPaid: Number(payment.amount_paid),
      siteUrl,
    });
    subject = built.subject;
    html = built.html;
  } else {
    const built = buildSubscriptionPaymentRejectedEmail({
      memberName,
      packageName,
      creditsGranted,
      creditValidityDays,
      paymentUid,
      reviewNote: (payment.review_note as string) ?? '',
      siteUrl,
    });
    subject = built.subject;
    html = built.html;
  }

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

  return jsonResponse({ ok: true, sent: true, to: toEmail, status });
});
