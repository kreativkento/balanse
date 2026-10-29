import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildFeedbackCommentEmail } from './email-html.ts';

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

function displayName(account: {
  email?: string;
  profiles_staff?: { name?: string } | { name?: string }[] | null;
  profiles_client?: { name?: string } | { name?: string }[] | null;
}): string {
  const staff = Array.isArray(account.profiles_staff) ? account.profiles_staff[0] : account.profiles_staff;
  const client = Array.isArray(account.profiles_client) ? account.profiles_client[0] : account.profiles_client;
  return staff?.name?.trim() || client?.name?.trim() || account.email?.trim() || 'Studio user';
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

  let ticketId = '';
  let commentId = '';
  try {
    const body = await req.json();
    ticketId = String(body?.ticketId ?? '').trim();
    commentId = String(body?.commentId ?? '').trim();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  if (!ticketId || !commentId) {
    return jsonResponse({ ok: false, error: 'ticketId and commentId are required.' }, 400);
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

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: comment, error: commentError } = await admin
    .from('feedback_comments')
    .select('id, ticket_id, account_id, body, created_at')
    .eq('id', commentId)
    .eq('ticket_id', ticketId)
    .maybeSingle();

  if (commentError || !comment) {
    return jsonResponse({ ok: false, error: 'Comment not found.' }, 404);
  }

  const { data: caller } = await admin
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!caller || caller.id !== comment.account_id) {
    return jsonResponse({ ok: false, error: 'Forbidden' }, 403);
  }

  const { data: ticket } = await admin
    .from('feedback_system')
    .select('id, uid, title')
    .eq('id', ticketId)
    .maybeSingle();

  if (!ticket) {
    return jsonResponse({ ok: false, error: 'Ticket not found.' }, 404);
  }

  const { data: authorAccount } = await admin
    .from('accounts')
    .select('email, profiles_staff ( name ), profiles_client ( name )')
    .eq('id', comment.account_id)
    .maybeSingle();

  const authorName = authorAccount ? displayName(authorAccount as never) : 'Studio user';
  const ticketUid = (ticket.uid as string | null)?.trim() || String(ticket.id).slice(0, 8).toUpperCase();

  const { data: participants } = await admin
    .from('feedback_ticket_participants')
    .select('account_id')
    .eq('ticket_id', ticketId);

  const recipientIds = (participants ?? [])
    .map((row) => row.account_id as string)
    .filter((id) => id && id !== comment.account_id);

  if (recipientIds.length === 0) {
    return jsonResponse({ ok: true, sent: 0 });
  }

  const { data: recipients } = await admin
    .from('accounts')
    .select('id, email, role, profiles_staff ( name ), profiles_client ( name )')
    .in('id', recipientIds);

  if (!resendApiKey) {
    return jsonResponse({
      ok: false,
      error: 'RESEND_API_KEY is not configured. Add it in Supabase Edge Function secrets.',
    }, 503);
  }

  let sent = 0;
  for (const recipient of recipients ?? []) {
    const toEmail = (recipient.email as string | undefined)?.trim();
    if (!toEmail) continue;
    const { data: hrefRow } = await admin.rpc('feedback_portal_href', {
      p_role: recipient.role,
      p_ticket_id: ticketId,
    });
    const href = typeof hrefRow === 'string' ? hrefRow : `/feedback?ticket=${ticketId}`;
    const { subject, html } = buildFeedbackCommentEmail({
      recipientName: displayName(recipient as never),
      authorName,
      ticketTitle: (ticket.title as string) || 'Feedback ticket',
      ticketUid,
      commentBody: comment.body as string,
      href,
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
      continue;
    }
    sent += 1;
  }

  return jsonResponse({ ok: true, sent });
});
