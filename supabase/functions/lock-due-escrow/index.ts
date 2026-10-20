import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildClassPaymentReceiptHtml, type ClassPaymentReceiptRow } from '../send-payment-receipt/receipt-html.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const FINAL_SELECT = `
  id, uid, buyer_name, buyer_email, buyer_address,
  seller_business_name, seller_address, seller_tin, service_description,
  class_starts_at, class_ends_at, payment_method_label, payment_reference,
  amount_paid, total_amount_due, unit_price, quantity,
  vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales,
  receipt_issued_at, receipt_html, email_receipt_sent, official_receipt_number,
  classes ( name )
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RECEIPT_FROM_EMAIL') ?? 'Balansé Wellness <onboarding@resend.dev>';
  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://balanse.kentveloso.com';
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: 'Server configuration incomplete.' }, 500);
  }

  const cronHeader = req.headers.get('x-cron-secret') ?? '';
  const authHeader = req.headers.get('Authorization');
  let allowed = Boolean(cronSecret) && cronHeader === cronSecret;

  if (!allowed && authHeader && supabaseAnonKey) {
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (user) {
      const admin = createClient(supabaseUrl, serviceRoleKey);
      const { data: account } = await admin.from('accounts').select('role').eq('auth_user_id', user.id).maybeSingle();
      const role = account?.role as string | undefined;
      allowed = role === 'admin' || role === 'dev';
    }
  }

  if (!allowed) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: lockedCount, error: lockError } = await supabaseAdmin.rpc('finalize_due_escrow_payments_cron');
  if (lockError) {
    return jsonResponse({ ok: false, error: lockError.message }, 500);
  }

  if (!resendApiKey) {
    return jsonResponse({
      ok: true,
      locked: lockedCount ?? 0,
      emailed: 0,
      warning: 'RESEND_API_KEY is not configured. Receipts were locked but not emailed.',
    });
  }

  const { data: pending, error: pendingError } = await supabaseAdmin
    .from('final_transactions')
    .select(FINAL_SELECT)
    .eq('email_receipt_sent', false)
    .order('finalized_at', { ascending: true })
    .limit(50);

  if (pendingError) {
    return jsonResponse({ ok: false, error: pendingError.message, locked: lockedCount ?? 0 }, 500);
  }

  let emailed = 0;
  for (const payment of pending ?? []) {
    const toEmail = String(payment.buyer_email ?? '').trim();
    if (!toEmail) continue;

    const classJoin = payment.classes as { name?: string } | { name?: string }[] | null;
    const className = Array.isArray(classJoin) ? classJoin[0]?.name : classJoin?.name;
    let html = String(payment.receipt_html ?? '').trim();
    if (!html) {
      const row: ClassPaymentReceiptRow = {
        uid: payment.uid as string,
        buyer_name: payment.buyer_name as string,
        buyer_email: toEmail,
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
      html = buildClassPaymentReceiptHtml(row, siteUrl);
      await supabaseAdmin.from('final_transactions').update({ receipt_html: html }).eq('id', payment.id);
    }

    const orNumber = String(payment.official_receipt_number ?? payment.uid);
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `Your Balansé official receipt — ${orNumber}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      console.error('lock-due-escrow resend:', await resendRes.text());
      continue;
    }

    await supabaseAdmin.from('final_transactions').update({ email_receipt_sent: true }).eq('id', payment.id);
    emailed += 1;
  }

  return jsonResponse({ ok: true, locked: lockedCount ?? 0, emailed });
});
