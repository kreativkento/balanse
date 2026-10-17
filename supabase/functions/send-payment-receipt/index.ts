import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildClassPaymentReceiptHtml, type ClassPaymentReceiptRow } from './receipt-html.ts';

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
  buyer_name,
  buyer_email,
  buyer_address,
  seller_business_name,
  seller_address,
  seller_tin,
  service_description,
  class_starts_at,
  class_ends_at,
  payment_method_label,
  payment_reference,
  amount_paid,
  total_amount_due,
  unit_price,
  quantity,
  vatable_sales,
  vat_amount,
  vat_exempt_sales,
  zero_rated_sales,
  receipt_issued_at,
  receipt_html,
  email_receipt_sent,
  classes ( name )
`;

function mapPaymentToReceiptRow(payment: Record<string, unknown>): ClassPaymentReceiptRow {
  const classJoin = payment.classes as { name?: string } | { name?: string }[] | null;
  const className = Array.isArray(classJoin) ? classJoin[0]?.name : classJoin?.name;

  return {
    uid: payment.uid as string,
    buyer_name: payment.buyer_name as string,
    buyer_email: payment.buyer_email as string,
    buyer_address: payment.buyer_address as string,
    seller_business_name: payment.seller_business_name as string,
    seller_address: payment.seller_address as string,
    seller_tin: payment.seller_tin as string,
    service_description: payment.service_description as string,
    class_starts_at: payment.class_starts_at as string | null,
    class_ends_at: payment.class_ends_at as string | null,
    payment_method_label: payment.payment_method_label as string,
    payment_reference: payment.payment_reference as string,
    amount_paid: Number(payment.amount_paid),
    total_amount_due: Number(payment.total_amount_due),
    unit_price: Number(payment.unit_price),
    quantity: Number(payment.quantity),
    vatable_sales: payment.vatable_sales != null ? Number(payment.vatable_sales) : null,
    vat_amount: payment.vat_amount != null ? Number(payment.vat_amount) : null,
    vat_exempt_sales: payment.vat_exempt_sales != null ? Number(payment.vat_exempt_sales) : null,
    zero_rated_sales: payment.zero_rated_sales != null ? Number(payment.zero_rated_sales) : null,
    receipt_issued_at: payment.receipt_issued_at as string | null,
    class_name: className ?? null,
  };
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
  let storeOnly = false;
  try {
    const body = await req.json();
    paymentId = String(body?.paymentId ?? '').trim();
    storeOnly = body?.storeOnly === true;
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
    .from('class_payments')
    .select(PAYMENT_SELECT)
    .eq('id', paymentId)
    .maybeSingle();

  if (paymentError || !payment) {
    return jsonResponse({ ok: false, error: 'Payment not found' }, 404);
  }

  if (payment.status !== 'approved' || !payment.verified) {
    return jsonResponse({ ok: false, error: 'Payment must be approved before issuing a receipt.' }, 400);
  }

  const existingHtml = (payment.receipt_html as string)?.trim();
  let html = existingHtml;

  if (!html) {
    const receiptRow = mapPaymentToReceiptRow(payment as Record<string, unknown>);
    html = buildClassPaymentReceiptHtml(receiptRow, siteUrl);

    const { error: saveError } = await supabaseAdmin
      .from('class_payments')
      .update({ receipt_html: html })
      .eq('id', paymentId);

    if (saveError) {
      console.error('receipt_html update:', saveError.message);
      return jsonResponse({ ok: false, error: 'Could not store e-receipt.' }, 500);
    }
  }

  if (storeOnly) {
    return jsonResponse({ ok: true, stored: true, htmlLength: html.length });
  }

  if (!resendApiKey) {
    return jsonResponse({
      ok: false,
      error: 'RESEND_API_KEY is not configured. Add it in Supabase Edge Function secrets.',
      stored: true,
    }, 503);
  }

  const toEmail = (payment.buyer_email as string)?.trim();
  if (!toEmail) {
    return jsonResponse({ ok: false, error: 'Buyer email is missing on this payment.', stored: true }, 400);
  }

  if (payment.email_receipt_sent) {
    return jsonResponse({ ok: true, alreadySent: true, stored: true });
  }

  const subject = `Your Balansé official receipt — ${payment.uid as string}`;

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
    return jsonResponse({
      ok: false,
      error: 'Failed to send email. Check Resend configuration.',
      stored: true,
    }, 502);
  }

  const { error: updateError } = await supabaseAdmin
    .from('class_payments')
    .update({ email_receipt_sent: true })
    .eq('id', paymentId);

  if (updateError) {
    console.error('email_receipt_sent update:', updateError.message);
  }

  return jsonResponse({ ok: true, sent: true, to: toEmail, stored: true });
});
