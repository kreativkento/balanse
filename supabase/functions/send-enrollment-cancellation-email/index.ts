import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RECEIPT_FROM_EMAIL') ?? 'Balansé Wellness <onboarding@resend.dev>';

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: 'Server configuration incomplete.' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);

  let requestId = '';
  try {
    const body = await req.json();
    requestId = String(body?.requestId ?? '').trim();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400);
  }
  if (!requestId) return jsonResponse({ ok: false, error: 'requestId is required' }, 400);

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: reviewer } = await supabaseAdmin
    .from('accounts')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  const role = reviewer?.role as string | undefined;
  if (role !== 'admin' && role !== 'dev') {
    return jsonResponse({ ok: false, error: 'Admin access required' }, 403);
  }

  const { data: request, error: requestError } = await supabaseAdmin
    .from('portal_requests')
    .select('id, status, request_type, review_note, payload, requester_account_id, target_class_id')
    .eq('id', requestId)
    .maybeSingle();

  if (requestError || !request) {
    return jsonResponse({ ok: false, error: requestError?.message ?? 'Request not found' }, 404);
  }
  if (request.request_type !== 'member_enrollment_cancellation') {
    return jsonResponse({ ok: false, error: 'Not an enrollment cancellation.' }, 400);
  }
  if (request.status !== 'approved' && request.status !== 'rejected') {
    return jsonResponse({ ok: false, error: 'Request is not decided yet.' }, 400);
  }

  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('email, profiles_client ( name )')
    .eq('id', request.requester_account_id)
    .maybeSingle();

  const profileJoin = account?.profiles_client as { name?: string } | { name?: string }[] | null;
  const profile = Array.isArray(profileJoin) ? profileJoin[0] : profileJoin;
  const toEmail = String(account?.email ?? '').trim();
  const memberName = String(profile?.name ?? '').trim() || toEmail || 'Member';
  if (!toEmail) return jsonResponse({ ok: false, error: 'Member email is missing.' }, 400);

  const { data: classRow } = request.target_class_id
    ? await supabaseAdmin.from('classes').select('name').eq('id', request.target_class_id).maybeSingle()
    : { data: null };

  const className = String(classRow?.name ?? 'your class');
  const note = String(request.review_note ?? '').trim();
  const payload = (request.payload ?? {}) as { escrow_refund?: { outcome?: string } };
  const outcome = payload.escrow_refund?.outcome ?? '';

  let subject = `Balansé — cancellation update for ${className}`;
  let body = '';

  if (request.status === 'rejected') {
    subject = `Balansé — cancellation request not approved`;
    body = `<p>Hi ${escapeHtml(memberName)},</p>
      <p>Your request to cancel <strong>${escapeHtml(className)}</strong> was not approved. Your enrollment stays as booked.</p>`;
  } else if (outcome === 'cash_refund_approved') {
    subject = `Balansé — refund approved for ${className}`;
    body = `<p>Hi ${escapeHtml(memberName)},</p>
      <p>Your cancellation for <strong>${escapeHtml(className)}</strong> was approved inside the studio cancellation window.</p>
      <p>The drop-in payment is voided. <strong>No official receipt will be issued.</strong> The cash refund is sent manually to your original payment channel.</p>`;
  } else if (outcome === 'credit_restored') {
    subject = `Balansé — credit restored for ${className}`;
    body = `<p>Hi ${escapeHtml(memberName)},</p>
      <p>Your cancellation for <strong>${escapeHtml(className)}</strong> was approved. The session credit is back on your wallet with its original expiry.</p>`;
  } else {
    subject = `Balansé — late cancellation for ${className}`;
    body = `<p>Hi ${escapeHtml(memberName)},</p>
      <p>Your cancellation for <strong>${escapeHtml(className)}</strong> was approved after the studio cancellation window.</p>
      <p>The fee or credit is forfeited. If this was a drop-in, the payment is locked and an official receipt is issued.</p>`;
  }

  if (note) {
    body += `<p style="margin-top:16px;padding:12px 14px;background:#F8F3E8;border-radius:12px;"><strong>Note from the studio:</strong><br>${escapeHtml(note)}</p>`;
  }

  const html = `<!DOCTYPE html><html><body style="font-family:Segoe UI,Helvetica,Arial,sans-serif;background:#F5F1E8;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #D4CDB5;border-radius:16px;padding:24px;">
      ${body}
    </div>
  </body></html>`;

  if (!resendApiKey) {
    return jsonResponse({ ok: false, error: 'RESEND_API_KEY is not configured.' }, 503);
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromEmail, to: [toEmail], subject, html }),
  });

  if (!resendRes.ok) {
    console.error('cancellation email:', await resendRes.text());
    return jsonResponse({ ok: false, error: 'Failed to send email.' }, 502);
  }

  return jsonResponse({ ok: true, sent: true, to: toEmail, outcome: outcome || request.status });
});
